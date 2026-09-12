"""Offline evaluation: precision@k and recall@k on a time-based split.

Orders are split chronologically, never randomly: a random split would let the
model see a user's later purchases while predicting their earlier ones, which
inflates the score and does not reflect how the service is actually used.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any

from .collab import CollabModel
from .content import ContentModel
from .hybrid import blend, is_recommendable


@dataclass
class EvalResult:
    k: int
    precision_at_k: float | None
    recall_at_k: float | None
    users_evaluated: int
    train_orders: int
    test_orders: int
    note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _sort_key(order: dict) -> Any:
    created = order.get("created_at")
    if isinstance(created, datetime):
        return created if created.tzinfo else created.replace(tzinfo=timezone.utc)
    return datetime.min.replace(tzinfo=timezone.utc)


def time_split(orders: list[dict], train_ratio: float = 0.8) -> tuple[list[dict], list[dict]]:
    ordered = sorted(orders, key=_sort_key)
    if len(ordered) < 2:
        return ordered, []
    cut = max(1, int(len(ordered) * train_ratio))
    return ordered[:cut], ordered[cut:]


def evaluate(
    products: list[dict],
    orders: list[dict],
    k: int = 10,
    content_weight: float = 0.6,
    collab_weight: float = 0.4,
    train_ratio: float = 0.8,
) -> EvalResult:
    """Score the hybrid recommender on held-out future orders."""
    if len(orders) < 10:
        return EvalResult(
            k=k,
            precision_at_k=None,
            recall_at_k=None,
            users_evaluated=0,
            train_orders=len(orders),
            test_orders=0,
            note="Not enough orders to evaluate (need at least 10).",
        )

    train, test = time_split(orders, train_ratio)
    if not test:
        return EvalResult(k, None, None, 0, len(train), 0, "No held-out orders after the split.")

    catalogue = {p["id"]: p for p in products}
    product_ids = [p["id"] for p in products]

    content = ContentModel()
    content.fit(products)
    collab = CollabModel()
    collab.fit(train, product_ids)

    # What each buyer bought before the cut, and after it.
    seen: dict[str, set[str]] = {}
    for o in train:
        if o.get("buyer"):
            seen.setdefault(o["buyer"], set()).update(o.get("product_ids", []))

    future: dict[str, set[str]] = {}
    for o in test:
        if o.get("buyer"):
            future.setdefault(o["buyer"], set()).update(o.get("product_ids", []))

    precisions: list[float] = []
    recalls: list[float] = []

    for buyer, actual in future.items():
        history = seen.get(buyer)
        if not history:
            # Cold user: nothing to base a prediction on, so not evaluated.
            continue
        # Only count held-out items the model could actually have returned.
        relevant = {p for p in actual if p in catalogue and p not in history}
        if not relevant:
            continue

        recommended = _recommend(
            history, content, collab, catalogue, k, content_weight, collab_weight
        )
        if not recommended:
            continue

        hits = len(set(recommended) & relevant)
        precisions.append(hits / k)
        recalls.append(hits / len(relevant))

    if not precisions:
        return EvalResult(
            k, None, None, 0, len(train), len(test),
            "No evaluable users: no buyer had both prior history and new held-out items.",
        )

    return EvalResult(
        k=k,
        precision_at_k=round(sum(precisions) / len(precisions), 4),
        recall_at_k=round(sum(recalls) / len(recalls), 4),
        users_evaluated=len(precisions),
        train_orders=len(train),
        test_orders=len(test),
    )


def _recommend(
    history: set[str],
    content: ContentModel,
    collab: CollabModel,
    catalogue: dict[str, dict],
    k: int,
    content_weight: float,
    collab_weight: float,
) -> list[str]:
    seeds = list(history)
    content_scores = content.scores_for_products(seeds)
    collab_scores = collab.scores_for_products(seeds)
    blended = blend(content_scores, collab_scores, content_weight, collab_weight)

    candidates = [
        (pid, score)
        for pid, (score, _src) in blended.items()
        if pid not in history and pid in catalogue and is_recommendable(catalogue[pid])
    ]
    candidates.sort(key=lambda x: x[1], reverse=True)
    return [pid for pid, _ in candidates[:k]]
