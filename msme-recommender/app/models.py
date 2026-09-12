"""Pydantic request/response models."""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    indexed_products: int
    indexed_orders: int
    content_ready: bool
    collab_ready: bool


class Recommendation(BaseModel):
    product_id: str
    name: str
    category: str
    price: float | None = None
    image: str | None = None
    score: float = Field(..., description="Blended score, higher is better")
    source: str = Field(..., description="content | collab | hybrid | trending")


class RecommendationResponse(BaseModel):
    seed: str | None = None
    strategy: str
    count: int
    results: list[Recommendation]


class ReindexResponse(BaseModel):
    status: str
    indexed_products: int
    indexed_orders: int
    took_ms: int


class EvalMetrics(BaseModel):
    k: int
    precision_at_k: float | None = None
    recall_at_k: float | None = None
    users_evaluated: int
    train_orders: int
    test_orders: int
    note: str | None = None


class MetricsResponse(BaseModel):
    computed_at: str | None = None
    metrics: EvalMetrics | None = None
    note: str | None = None
