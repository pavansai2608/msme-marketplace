"""Blend content-based and collaborative scores."""
from __future__ import annotations


def min_max_normalise(scores: dict[str, float]) -> dict[str, float]:
    """Scale scores into [0, 1].

    A single value, or a set where every value is identical, maps to 1.0:
    there is no spread to express, and zeroing it would silently discard a
    perfectly good candidate.
    """
    if not scores:
        return {}
    values = list(scores.values())
    lo, hi = min(values), max(values)
    if hi == lo:
        return {k: 1.0 for k in scores}
    span = hi - lo
    return {k: (v - lo) / span for k, v in scores.items()}


def blend(
    content_scores: dict[str, float],
    collab_scores: dict[str, float],
    content_weight: float = 0.6,
    collab_weight: float = 0.4,
) -> dict[str, tuple[float, str]]:
    """Return {product_id: (score, source)}.

    Both inputs are min-max normalised first so one cannot dominate purely
    because its raw scale is larger.
    """
    content_n = min_max_normalise(content_scores)
    collab_n = min_max_normalise(collab_scores)

    # Cold start: no collaborative signal at all, so content carries the result
    # on its own rather than being scaled down by its weight.
    if not collab_n:
        return {pid: (score, "content") for pid, score in content_n.items()}
    if not content_n:
        return {pid: (score, "collab") for pid, score in collab_n.items()}

    total = content_weight + collab_weight
    if total <= 0:
        content_weight, collab_weight, total = 0.6, 0.4, 1.0
    cw, lw = content_weight / total, collab_weight / total

    blended: dict[str, tuple[float, str]] = {}
    for pid in set(content_n) | set(collab_n):
        in_content = pid in content_n
        in_collab = pid in collab_n
        score = cw * content_n.get(pid, 0.0) + lw * collab_n.get(pid, 0.0)

        # Source is decided by which model produced the item, NOT by the
        # normalised value: min-max maps the weakest score to 0.0, so testing
        # `> 0` would mislabel the lowest-ranked content item as collab.
        if in_content and in_collab:
            source = "hybrid"
        elif in_content:
            source = "content"
        else:
            source = "collab"
        blended[pid] = (score, source)
    return blended


def is_recommendable(product: dict) -> bool:
    """Inactive or out-of-stock products are never recommended."""
    return bool(product.get("is_active", True)) and int(product.get("total_stock") or 0) > 0
