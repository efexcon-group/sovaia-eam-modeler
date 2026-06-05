"""Unit-Tests für den Canvas-Layered-Stack (ADR-099).

Lauffähig ohne pytest:  PYTHONPATH=. python tests/test_canvas.py
"""
from app.routers import canvas as cv


def test_schemes_load():
    schemes = cv._load_schemes("reference")
    assert "togaf" in schemes and "osi" in schemes, list(schemes)
    assert schemes["togaf"]["layers"][0]["id"] == "business"


def test_category_blocks_nested():
    roots = [
        {"id": "persistence", "label-de": "Persistenz", "children": [
            {"id": "databases", "label-de": "Databases"},
        ]},
    ]
    blocks = cv._category_blocks(roots, "data")
    assert blocks[0]["path"] == "data/persistence"
    assert blocks[0]["children"][0]["path"] == "data/persistence/databases"


def test_deepest_match():
    idx = {"technology": {}, "technology/azure": {}, "technology/azure/compute": {}}
    assert cv._deepest_match(idx, "technology/azure/compute") is idx["technology/azure/compute"]
    # Tiefster Präfix, wenn exakter Pfad fehlt.
    assert cv._deepest_match(idx, "technology/azure/compute/vm") is idx["technology/azure/compute"]
    assert cv._deepest_match(idx, "technology/azure/storage") is idx["technology/azure"]


def test_aggregate_max():
    block = {
        "kind": "category", "children": [
            {"kind": "tech", "children": [], "infra-demand": {"gpu": "low", "memory": "high"}},
            {"kind": "tech", "children": [], "infra-demand": {"gpu": "high"}},
        ],
    }
    demand, count = cv._aggregate(block)
    assert count == 2
    assert demand == {"gpu": "high", "memory": "high"}, demand
    assert block["node-count"] == 2


if __name__ == "__main__":
    test_schemes_load()
    test_category_blocks_nested()
    test_deepest_match()
    test_aggregate_max()
    print("ALLE TESTS OK")
