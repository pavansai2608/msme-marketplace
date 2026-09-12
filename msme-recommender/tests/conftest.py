"""Shared fixtures. No database is touched: products and orders are built
in memory so the algorithms are tested deterministically."""
from datetime import datetime, timedelta, timezone

import pytest

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def product(pid, name, description, category, stock=10, active=True, price=100.0):
    return {
        "id": pid,
        "name": name,
        "description": description,
        "category": category,
        "price": price,
        "images": [f"http://example.com/{pid}.png"],
        "is_active": active,
        "total_stock": stock,
        "seller": "seller1",
        "created_at": BASE,
    }


@pytest.fixture
def products():
    return [
        product("p1", "Blue Clay Pot", "handmade terracotta pot for plants", "Pottery"),
        product("p2", "Red Clay Pot", "handmade terracotta pot for garden plants", "Pottery"),
        product("p3", "Clay Vase", "decorative terracotta vase handmade", "Pottery"),
        product("p4", "Cotton Saree", "handwoven cotton saree traditional weave", "Textiles"),
        product("p5", "Silk Saree", "handwoven silk saree traditional bridal weave", "Textiles"),
        product("p6", "Brass Lamp", "polished brass oil lamp for festivals", "Metalwork"),
        product("p7", "Out Of Stock Pot", "terracotta pot handmade", "Pottery", stock=0),
        product("p8", "Inactive Saree", "cotton saree handwoven", "Textiles", active=False),
    ]


@pytest.fixture
def orders():
    """Deliberate co-purchase structure:
    pottery buyers buy p1+p2, textile buyers buy p4+p5."""
    rows = []
    for i in range(6):
        rows.append({
            "id": f"o{i}", "buyer": f"potteryBuyer{i}",
            "product_ids": ["p1", "p2"],
            "created_at": BASE + timedelta(days=i),
        })
    for i in range(6):
        rows.append({
            "id": f"t{i}", "buyer": f"textileBuyer{i}",
            "product_ids": ["p4", "p5"],
            "created_at": BASE + timedelta(days=i),
        })
    return rows
