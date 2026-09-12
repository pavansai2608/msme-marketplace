"""FastAPI recommendation service."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query

from . import db as dbmod
from .collab import CollabModel
from .config import get_settings
from .content import ContentModel
from .eval import evaluate
from .hybrid import blend, is_recommendable
from .models import (
    EvalMetrics,
    HealthResponse,
    MetricsResponse,
    Recommendation,
    RecommendationResponse,
    ReindexResponse,
)


class State:
    """In-memory index, rebuilt on startup and on POST /reindex."""

    def __init__(self) -> None:
        self.products: list[dict] = []
        self.orders: list[dict] = []
        self.catalogue: dict[str, dict] = {}
        self.content = ContentModel()
        self.collab = CollabModel()
        self.metrics: dict | None = None
        self.metrics_at: str | None = None
        self.last_error: str | None = None

    def reindex(self) -> int:
        started = time.time()
        settings = get_settings()

        self.products = dbmod.fetch_products()
        self.orders = dbmod.fetch_orders()
        self.catalogue = {p["id"]: p for p in self.products}

        self.content.fit(self.products)
        self.collab.fit(self.orders, [p["id"] for p in self.products])

        result = evaluate(
            self.products,
            self.orders,
            k=10,
            content_weight=settings.content_weight,
            collab_weight=settings.collab_weight,
        )
        self.metrics = result.to_dict()
        self.metrics_at = datetime.now(timezone.utc).isoformat()

        return int((time.time() - started) * 1000)

    def rank(self, scores: dict[str, tuple[float, str]], k: int, exclude: set[str]) -> list[Recommendation]:
        rows = []
        for pid, (score, source) in scores.items():
            if pid in exclude:
                continue
            product = self.catalogue.get(pid)
            if product is None or not is_recommendable(product):
                continue
            rows.append((score, source, product))
        rows.sort(key=lambda r: r[0], reverse=True)

        return [
            Recommendation(
                product_id=p["id"],
                name=p["name"],
                category=p["category"],
                price=p.get("price"),
                image=(p.get("images") or [None])[0],
                score=round(score, 6),
                source=source,
            )
            for score, source, p in rows[:k]
        ]

    def trending(self, k: int, exclude: set[str] | None = None) -> list[Recommendation]:
        """Popularity fallback: most purchased, then newest."""
        exclude = exclude or set()
        counts: dict[str, int] = {}
        for o in self.orders:
            for pid in o.get("product_ids", []):
                counts[pid] = counts.get(pid, 0) + 1

        candidates = [
            p for p in self.products if p["id"] not in exclude and is_recommendable(p)
        ]
        candidates.sort(
            key=lambda p: (counts.get(p["id"], 0), p.get("created_at") or datetime.min),
            reverse=True,
        )

        return [
            Recommendation(
                product_id=p["id"],
                name=p["name"],
                category=p["category"],
                price=p.get("price"),
                image=(p.get("images") or [None])[0],
                score=float(counts.get(p["id"], 0)),
                source="trending",
            )
            for p in candidates[:k]
        ]


state = State()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # A database that is unreachable at boot must not stop the service: it
    # still answers /health, and /reindex can recover it later.
    try:
        state.reindex()
    except Exception as exc:  # noqa: BLE001
        state.last_error = str(exc)
        print(f"⚠ initial reindex failed: {exc}")
    yield


app = FastAPI(title="MSME Recommender", version="1.0.0", lifespan=lifespan)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        indexed_products=len(state.products),
        indexed_orders=len(state.orders),
        content_ready=state.content.ready,
        collab_ready=state.collab.ready,
    )


@app.post("/reindex", response_model=ReindexResponse)
def reindex() -> ReindexResponse:
    try:
        took = state.reindex()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Reindex failed: {exc}") from exc
    return ReindexResponse(
        status="ok",
        indexed_products=len(state.products),
        indexed_orders=len(state.orders),
        took_ms=took,
    )


@app.get("/recommend/product/{product_id}", response_model=RecommendationResponse)
def recommend_product(product_id: str, k: int = Query(10, ge=1, le=50)) -> RecommendationResponse:
    if product_id not in state.catalogue:
        raise HTTPException(status_code=404, detail="Unknown product")

    settings = get_settings()
    content_scores = state.content.scores_for_product(product_id)
    collab_scores = state.collab.scores_for_product(product_id)
    blended = blend(content_scores, collab_scores, settings.content_weight, settings.collab_weight)

    results = state.rank(blended, k, exclude={product_id})
    strategy = "hybrid" if collab_scores else "content"

    if not results:
        results = state.trending(k, exclude={product_id})
        strategy = "trending"

    return RecommendationResponse(
        seed=product_id, strategy=strategy, count=len(results), results=results
    )


@app.get("/recommend/user/{user_id}", response_model=RecommendationResponse)
def recommend_user(user_id: str, k: int = Query(10, ge=1, le=50)) -> RecommendationResponse:
    settings = get_settings()
    try:
        signals = dbmod.fetch_user_signals(user_id)
    except Exception:  # noqa: BLE001
        signals = {"purchased": [], "wishlist": []}

    seeds = [p for p in signals["purchased"] + signals["wishlist"] if p in state.catalogue]

    if not seeds:
        # Cold user: nothing known about them, so fall back to popularity.
        results = state.trending(k)
        return RecommendationResponse(
            seed=user_id, strategy="trending", count=len(results), results=results
        )

    content_scores = state.content.scores_for_products(seeds)
    collab_scores = state.collab.scores_for_products(seeds)
    blended = blend(content_scores, collab_scores, settings.content_weight, settings.collab_weight)

    results = state.rank(blended, k, exclude=set(seeds))
    strategy = "hybrid" if collab_scores else "content"

    if not results:
        results = state.trending(k, exclude=set(seeds))
        strategy = "trending"

    return RecommendationResponse(
        seed=user_id, strategy=strategy, count=len(results), results=results
    )


@app.get("/recommend/trending", response_model=RecommendationResponse)
def recommend_trending(k: int = Query(10, ge=1, le=50)) -> RecommendationResponse:
    results = state.trending(k)
    return RecommendationResponse(seed=None, strategy="trending", count=len(results), results=results)


@app.get("/metrics", response_model=MetricsResponse)
def metrics() -> MetricsResponse:
    if not state.metrics:
        return MetricsResponse(note="No evaluation has been run yet. POST /reindex first.")
    return MetricsResponse(computed_at=state.metrics_at, metrics=EvalMetrics(**state.metrics))
