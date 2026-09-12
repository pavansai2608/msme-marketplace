from app.hybrid import blend, is_recommendable, min_max_normalise


def test_normalise_maps_to_unit_range():
    out = min_max_normalise({"a": 2.0, "b": 4.0, "c": 6.0})
    assert out["a"] == 0.0 and out["c"] == 1.0
    assert 0 < out["b"] < 1


def test_identical_scores_all_become_one():
    out = min_max_normalise({"a": 3.0, "b": 3.0})
    assert out == {"a": 1.0, "b": 1.0}


def test_empty_input_is_empty():
    assert min_max_normalise({}) == {}


def test_blend_marks_overlap_as_hybrid():
    out = blend({"a": 1.0, "b": 0.5}, {"a": 1.0, "c": 0.5})
    assert out["a"][1] == "hybrid"
    assert out["b"][1] == "content"
    assert out["c"][1] == "collab"


def test_cold_start_falls_back_to_content_only():
    out = blend({"a": 1.0, "b": 0.5}, {})
    assert set(out) == {"a", "b"}
    assert all(src == "content" for _score, src in out.values())


def test_weights_shift_the_ranking():
    content = {"a": 1.0, "b": 0.0}
    collab = {"a": 0.0, "b": 1.0}

    content_heavy = blend(content, collab, 0.9, 0.1)
    collab_heavy = blend(content, collab, 0.1, 0.9)

    assert content_heavy["a"][0] > content_heavy["b"][0]
    assert collab_heavy["b"][0] > collab_heavy["a"][0]


def test_out_of_stock_and_inactive_are_not_recommendable():
    assert is_recommendable({"is_active": True, "total_stock": 5})
    assert not is_recommendable({"is_active": True, "total_stock": 0})
    assert not is_recommendable({"is_active": False, "total_stock": 5})
