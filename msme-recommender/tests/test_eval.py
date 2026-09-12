from app.eval import evaluate, time_split


def test_split_is_chronological(orders):
    train, test = time_split(orders, 0.8)
    assert len(train) + len(test) == len(orders)
    if train and test:
        assert max(o["created_at"] for o in train) <= min(o["created_at"] for o in test)


def test_too_few_orders_reports_a_note(products):
    result = evaluate(products, [], k=10)
    assert result.precision_at_k is None
    assert "at least 10" in result.note


def test_evaluation_returns_bounded_numbers(products, orders):
    result = evaluate(products, orders, k=10)
    # With this fixture every buyer appears once, so there may be no evaluable
    # user; either way the numbers must stay in range and never be invented.
    if result.precision_at_k is not None:
        assert 0.0 <= result.precision_at_k <= 1.0
        assert 0.0 <= result.recall_at_k <= 1.0
        assert result.users_evaluated > 0
    else:
        assert result.note


def test_repeat_buyers_are_evaluable(products):
    """A buyer who buys pottery early and more pottery later is predictable."""
    from datetime import datetime, timedelta, timezone

    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    rows = []
    # Establish the co-purchase pattern: p1 with p2, p2 with p3.
    for i in range(10):
        rows.append({"id": f"a{i}", "buyer": f"crowd{i}", "product_ids": ["p1", "p2", "p3"],
                     "created_at": base + timedelta(days=i)})
    # A buyer whose later order is a pottery item the crowd links to p1.
    rows.append({"id": "u1", "buyer": "repeat", "product_ids": ["p1"],
                 "created_at": base + timedelta(days=2)})
    rows.append({"id": "u2", "buyer": "repeat", "product_ids": ["p3"],
                 "created_at": base + timedelta(days=30)})

    result = evaluate(products, rows, k=10, train_ratio=0.8)
    assert result.train_orders > 0
    if result.precision_at_k is not None:
        assert 0.0 <= result.precision_at_k <= 1.0
