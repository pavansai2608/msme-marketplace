from app.content import ContentModel


def test_similar_products_share_a_category(products):
    model = ContentModel()
    model.fit(products)
    assert model.ready

    scores = model.scores_for_product("p1")  # Blue Clay Pot
    best = max(scores, key=scores.get)
    # The nearest neighbour of a clay pot should be another pottery item.
    assert best in {"p2", "p3", "p7"}


def test_a_product_is_never_its_own_neighbour(products):
    model = ContentModel()
    model.fit(products)
    assert "p1" not in model.scores_for_product("p1")


def test_unknown_product_returns_nothing(products):
    model = ContentModel()
    model.fit(products)
    assert model.scores_for_product("nope") == {}


def test_fewer_than_two_products_is_not_ready():
    model = ContentModel()
    model.fit([])
    assert not model.ready
    assert model.scores_for_product("p1") == {}


def test_multi_seed_excludes_the_seeds(products):
    model = ContentModel()
    model.fit(products)
    scores = model.scores_for_products(["p1", "p2"])
    assert "p1" not in scores and "p2" not in scores
