"""Read-only Mongo access.

Every helper here only ever reads. The recommender must never write to the
marketplace database - that belongs to the Node API.
"""
from __future__ import annotations

from typing import Any

from pymongo import MongoClient

from .config import get_settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.mongo_url:
            raise RuntimeError("MONGO_URL is not set")
        # 20s: Atlas SRV lookups can be slow to resolve on a cold connection.
        _client = MongoClient(settings.mongo_url, serverSelectionTimeoutMS=20000)
    return _client


def get_db():
    settings = get_settings()
    client = get_client()
    if settings.mongo_db:
        return client[settings.mongo_db]
    db = client.get_default_database()
    if db is None:
        raise RuntimeError("No database named in MONGO_URL and MONGO_DB is unset")
    return db


def set_client(client: MongoClient | None) -> None:
    """Used by tests to inject a client (e.g. mongomock or a fixture DB)."""
    global _client
    _client = client


def fetch_products(db=None) -> list[dict[str, Any]]:
    """All products, with the fields the recommenders need."""
    db = db if db is not None else get_db()
    cursor = db["products"].find(
        {},
        {
            "name": 1,
            "description": 1,
            "category": 1,
            "price": 1,
            "images": 1,
            "isActive": 1,
            "totalStock": 1,
            "seller": 1,
            "createdAt": 1,
        },
    )
    return [_normalise_product(p) for p in cursor]


def _normalise_product(p: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(p.get("_id")),
        "name": p.get("name") or "",
        "description": p.get("description") or "",
        "category": p.get("category") or "",
        "price": p.get("price"),
        "images": p.get("images") or [],
        "is_active": bool(p.get("isActive", True)),
        "total_stock": int(p.get("totalStock") or 0),
        "seller": str(p.get("seller")) if p.get("seller") else None,
        "created_at": p.get("createdAt"),
    }


def fetch_orders(db=None) -> list[dict[str, Any]]:
    """Orders reduced to (buyer, [product ids], createdAt)."""
    db = db if db is not None else get_db()
    cursor = db["orders"].find({}, {"buyer": 1, "products.product": 1, "createdAt": 1})
    orders = []
    for o in cursor:
        product_ids = [
            str(item["product"])
            for item in (o.get("products") or [])
            if item.get("product") is not None
        ]
        orders.append(
            {
                "id": str(o.get("_id")),
                "buyer": str(o.get("buyer")) if o.get("buyer") else None,
                "product_ids": product_ids,
                "created_at": o.get("createdAt"),
            }
        )
    return orders


def fetch_user_signals(user_id: str, db=None) -> dict[str, list[str]]:
    """The product ids a user has bought and wishlisted."""
    from bson import ObjectId
    from bson.errors import InvalidId

    db = db if db is not None else get_db()

    try:
        oid = ObjectId(user_id)
    except (InvalidId, TypeError):
        return {"purchased": [], "wishlist": []}

    purchased: list[str] = []
    for o in db["orders"].find({"buyer": oid}, {"products.product": 1}):
        for item in o.get("products") or []:
            if item.get("product") is not None:
                purchased.append(str(item["product"]))

    user = db["users"].find_one({"_id": oid}, {"wishlist": 1})
    wishlist = [str(w) for w in (user or {}).get("wishlist", [])]

    return {"purchased": purchased, "wishlist": wishlist}
