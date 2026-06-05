"""Unit-Tests für die Szenario-Gap-Analyse (ADR-096/098).

Lauffähig ohne pytest:  PYTHONPATH=. python tests/test_scenario_gap.py
"""
from app.routers import scenario as sc


def _edges():
    # Minimal-Graph: Target wl-x setzt cap-a + cap-b voraus, wl-y setzt wl-x voraus.
    return [
        {"from": "wl-x", "to": "cap-a", "type": "voraussetzt"},
        {"from": "wl-x", "to": "cap-b", "type": "voraussetzt"},
        {"from": "wl-x", "to": "ai-chat", "type": "nutzt"},          # andere Relation → ignoriert
        {"from": "wl-y", "to": "wl-x", "type": "voraussetzt"},
    ]


def test_closure_direct():
    cl = sc._prereq_closure("wl-x", _edges())
    assert cl == ["cap-a", "cap-b"], cl  # 'nutzt' nicht enthalten


def test_closure_transitive():
    cl = sc._prereq_closure("wl-y", _edges())
    # wl-x zuerst (BFS), dann dessen Prereqs.
    assert cl == ["wl-x", "cap-a", "cap-b"], cl


def test_closure_empty():
    assert sc._prereq_closure("cap-a", _edges()) == []


def test_as_list():
    assert sc._as_list(["a", "b"]) == ["a", "b"]
    assert sc._as_list("a, b") == ["a", "b"]
    assert sc._as_list(None) == []


def test_shape_groups():
    node = {
        "id": "cap-a",
        "label-de": "Cap A",
        "type": "service",
        "tags": {"status": "released", "dimension": ["data", "infrastructure"], "fulfilled-by": ["kiinno-datacenter"]},
        "sovereignty": {"data-residency": "ch"},
    }
    s = sc._shape(node)
    assert s["dimension"] == ["data", "infrastructure"]
    assert s["fulfilled-by"] == ["kiinno-datacenter"]
    assert s["status"] == "released"
    assert s["sovereignty"] == {"data-residency": "ch"}


def test_flows_load():
    flows = sc._load_flows("reference")
    assert "rag" in flows, list(flows.keys())
    rag = flows["rag"]
    assert rag.get("target") == "wl-llm-chat-rag"
    steps = [s for ph in rag["phases"] for s in ph["steps"]]
    assert len(steps) >= 8
    gen = next(s for s in steps if s["id"] == "generate")
    assert gen["infra-demand"]["gpu"] == "high"
    # Alle neuen Szenarien vorhanden.
    for fid in ["document-extraction", "document-generation", "image-extraction", "video-kinematic", "video-generation"]:
        assert fid in flows, fid


if __name__ == "__main__":
    test_closure_direct()
    test_closure_transitive()
    test_closure_empty()
    test_as_list()
    test_shape_groups()
    test_flows_load()
    print("ALLE TESTS OK")
