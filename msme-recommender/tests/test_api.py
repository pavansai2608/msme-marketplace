"""API tests. The index is populated directly from fixtures so no Mongo is needed."""
import pytest
from fastapi.testclient import TestClient

from app import main as mainmod


@pytest.fixture
def client(products, orders, monkeypatch):
    # Stop lifespan from reaching a real database.
    monkeypatch.setattr(mainmod.state, "reindex", lambda: 0)

    mainmod.state.products = products
    mainmod.state.orders = orders
    mainmod.state.catalogue = {p["id"]: p for p in products}
    mainmod.state.content.fit(products)
    mainmod.state.collab.fit(orders, [p["id"] for p in products])
    mainmod.state.metrics = None
    mainmod.state.metrics_at = None

    with TestClient(mainmod.app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["indexed_products"] == 8
    assert body["content_ready"] is True


def test_similar_products(client):
    r = client.get("/recommend/product/p1?k=5")
    assert r.status_code == 200
    body = r.json()
    assert body["seed"] == "p1"
    assert len(body["results"]) <= 5
    assert all(item["product_id"] != "p1" for item in body["results"])


def test_unknown_product_is_404(client):
    assert client.get("/recommend/product/ghost").status_code == 404


def test_out_of_stock_and_inactive_never_appear(client):
    for path in ["/recommend/product/p1?k=50", "/recommend/trending?k=50"]:
        ids = [i["product_id"] for i in client.get(path).json()["results"]]
        assert "p7" not in ids, "out-of-stock product was recommended"
        assert "p8" not in ids, "inactive product was recommended"


def test_trending_returns_results(client):
    r = client.get("/recommend/trending?k=3")
    assert r.status_code == 200
    body = r.json()
    assert body["strategy"] == "trending"
    assert len(body["results"]) <= 3


def test_trending_ranks_most_purchased_first(client):
    ids = [i["product_id"] for i in client.get("/recommend/trending?k=10").json()["results"]]
    # p1/p2/p4/p5 were each purchased 6 times; p6 never.
    assert ids.index("p1") < ids.index("p6")


def test_unknown_user_falls_back_to_trending(client, monkeypatch):
    monkeypatch.setattr(
        mainmod.dbmod, "fetch_user_signals",
        lambda uid, db=None: {"purchased": [], "wishlist": []},
    )
    body = client.get("/recommend/user/anyone").json()
    assert body["strategy"] == "trending"


def test_user_with_history_gets_personalised_results(client, monkeypatch):
    monkeypatch.setattr(
        mainmod.dbmod, "fetch_user_signals",
        lambda uid, db=None: {"purchased": ["p1"], "wishlist": []},
    )
    body = client.get("/recommend/user/someone?k=5").json()
    assert body["strategy"] in {"hybrid", "content"}
    assert all(i["product_id"] != "p1" for i in body["results"])


def test_k_is_validated(client):
    assert client.get("/recommend/trending?k=0").status_code == 422
    assert client.get("/recommend/trending?k=999").status_code == 422


def test_metrics_before_evaluation(client):
    body = client.get("/metrics").json()
    assert body["metrics"] is None
    assert "reindex" in body["note"].lower()


def test_reindex_failure_is_503(client, monkeypatch):
    def boom():
        raise RuntimeError("no database")

    monkeypatch.setattr(mainmod.state, "reindex", boom)
    r = client.post("/reindex")
    assert r.status_code == 503
    assert "no database" in r.json()["detail"]
