from app.collab import CollabModel


def test_co_purchased_items_are_similar(products, orders):
    model = CollabModel()
    model.fit(orders, [p["id"] for p in products])
    assert model.ready

    # p1 and p2 were always bought together.
    scores = model.scores_for_product("p1")
    assert scores.get("p2", 0) > 0
    # p4 was never bought alongside p1.
    assert scores.get("p4", 0) == 0


def test_cold_start_with_no_orders_is_not_ready(products):
    model = CollabModel()
    model.fit([], [p["id"] for p in products])
    assert not model.ready
    assert model.scores_for_product("p1") == {}


def test_single_item_orders_carry_no_signal(products):
    single = [
        {"id": "o1", "buyer": "b1", "product_ids": ["p1"], "created_at": None},
        {"id": "o2", "buyer": "b2", "product_ids": ["p2"], "created_at": None},
    ]
    model = CollabModel()
    model.fit(single, [p["id"] for p in products])
    assert not model.ready


def test_unknown_products_in_orders_are_ignored(products):
    rows = [
        {"id": "o1", "buyer": "b1", "product_ids": ["p1", "ghost"], "created_at": None},
        {"id": "o2", "buyer": "b2", "product_ids": ["p1", "p2"], "created_at": None},
        {"id": "o3", "buyer": "b3", "product_ids": ["p1", "p2"], "created_at": None},
    ]
    model = CollabModel()
    model.fit(rows, [p["id"] for p in products])
    assert "ghost" not in model.index_of
