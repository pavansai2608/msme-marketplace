"""Content-based similarity: TF-IDF over product text, then cosine similarity."""
from __future__ import annotations

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _document(product: dict) -> str:
    """The text a product is represented by.

    Category is repeated so it carries more weight than a single mention in a
    long description, which otherwise drowns it out.
    """
    category = product.get("category") or ""
    return " ".join(
        [
            product.get("name") or "",
            product.get("description") or "",
            category,
            category,
        ]
    ).strip()


class ContentModel:
    def __init__(self) -> None:
        self.product_ids: list[str] = []
        self.index_of: dict[str, int] = {}
        self.similarity: np.ndarray | None = None
        self.ready = False

    def fit(self, products: list[dict]) -> None:
        self.product_ids = [p["id"] for p in products]
        self.index_of = {pid: i for i, pid in enumerate(self.product_ids)}

        documents = [_document(p) for p in products]
        # Need at least two documents with some text for similarity to mean anything.
        if len(documents) < 2 or not any(d for d in documents):
            self.similarity = None
            self.ready = False
            return

        vectoriser = TfidfVectorizer(
            stop_words="english",
            lowercase=True,
            min_df=1,
            ngram_range=(1, 2),
        )
        try:
            matrix = vectoriser.fit_transform(documents)
        except ValueError:
            # Happens when every document is stop words only.
            self.similarity = None
            self.ready = False
            return

        self.similarity = cosine_similarity(matrix)
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
        """Aggregate similarity against several seeds, taking the best per item."""
        combined: dict[str, float] = {}
        for pid in product_ids:
            for other, score in self.scores_for_product(pid).items():
                if other in product_ids:
                    continue
                if score > combined.get(other, 0.0):
                    combined[other] = score
        return combined
