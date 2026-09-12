"""Collaborative filtering over a co-purchase matrix.

Signal: which products appear in the same order, or in the same buyer's
history. Item-item cosine similarity is computed on that matrix.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class CollabModel:
    def __init__(self) -> None:
        self.product_ids: list[str] = []
        self.index_of: dict[str, int] = {}
        self.similarity: np.ndarray | None = None
        self.ready = False
        self.interactions = 0

    def fit(self, orders: list[dict], product_ids: list[str]) -> None:
        """Build a buyer x product matrix, then item-item cosine similarity.

        Falls back to not-ready when there is too little signal, which is the
        cold-start case: the caller then uses content-based scores only.
        """
        self.product_ids = list(product_ids)
        self.index_of = {pid: i for i, pid in enumerate(self.product_ids)}
        self.similarity = None
        self.ready = False
        self.interactions = 0

        if not self.product_ids or not orders:
            return

        # Group products by buyer. A buyer who bought A and B links them,
        # whether that was one order or two.
        by_buyer: dict[str, set[str]] = {}
        for order in orders:
            buyer = order.get("buyer")
            if not buyer:
                continue
            known = {p for p in order.get("product_ids", []) if p in self.index_of}
            if not known:
                continue
            by_buyer.setdefault(buyer, set()).update(known)

        # Only buyers with 2+ distinct products carry co-purchase signal.
        rows = [products for products in by_buyer.values() if len(products) >= 2]
        self.interactions = sum(len(r) for r in rows)

        if len(rows) < 2:
            return

        matrix = np.zeros((len(rows), len(self.product_ids)), dtype=np.float32)
        for i, products in enumerate(rows):
            for pid in products:
                matrix[i, self.index_of[pid]] = 1.0

        # Items never bought have an all-zero column; cosine yields 0 for them,
        # which is correct - no evidence, no recommendation.
        self.similarity = cosine_similarity(matrix.T)
        np.fill_diagonal(self.similarity, 0.0)
        self.ready = True

    def scores_for_product(self, product_id: str) -> dict[str, float]:
        if not self.ready or self.similarity is None:
            return {}
        idx = self.index_of.get(product_id)
        if idx is None:
            return {}
        row = self.similarity[idx]
        return {self.product_ids[j]: float(row[j]) for j in range(len(row)) if row[j] > 0}

    def scores_for_products(self, product_ids: list[str]) -> dict[str, float]:
        combined: dict[str, float] = {}
        for pid in product_ids:
            for other, score in self.scores_for_product(pid).items():
                if other in product_ids:
                    continue
                if score > combined.get(other, 0.0):
                    combined[other] = score
        return combined
