"""Unit-Tests für die Classic-Bibliothek-/Adoption-Logik (ADR-103, D1).

Lauffähig ohne pytest:  PYTHONPATH=. python tests/test_classic_library.py
"""
from app.storage import overlay as ov


def _setup():
    overlay = ov._empty_overlay("demo-test")
    baseline = [
        {"id": "cls-a", "label-de": "A", "tags": {"ownership": "classic"}},
        {"id": "cls-b", "label-de": "B", "tags": {"ownership": "classic"}},
        {"id": "cls-c", "label-de": "C", "tags": {"ownership": "classic"}},
    ]
    return overlay, baseline


def test_adopt_unadopt():
    overlay, baseline = _setup()
    ov.adopt_classic(overlay, ["cls-a", "cls-b", "cls-a"])  # Duplikat ignoriert
    assert overlay["classic"]["adopted"] == ["cls-a", "cls-b"]
    ov.unadopt_classic(overlay, ["cls-a"])
    assert overlay["classic"]["adopted"] == ["cls-b"]


def test_instance_vs_library():
    overlay, baseline = _setup()
    # Custom-Baustein anlegen + eine Baseline adoptieren
    ov.add_classic(overlay, {"id": "user-demo-1", "label-de": "Custom", "tags": {}})
    ov.adopt_classic(overlay, ["cls-a"])
    effective = ov.apply_overlay_to_classic(baseline, overlay)

    # Instanz = adoptierte Baseline (cls-a) + Custom (user-demo-1) — NICHT cls-b/cls-c
    inst_ids = {n["id"] for n in ov.instance_classic(effective, overlay)}
    assert inst_ids == {"cls-a", "user-demo-1"}, inst_ids

    # Bibliothek = alle Baseline (a/b/c) + promotete Custom (noch keine) → Custom NICHT drin
    lib = ov.library_classic(effective, overlay)
    lib_ids = {n["id"] for n in lib}
    assert lib_ids == {"cls-a", "cls-b", "cls-c"}, lib_ids
    adopted_flag = {n["id"]: n["_adopted"] for n in lib}
    assert adopted_flag == {"cls-a": True, "cls-b": False, "cls-c": False}

    # Custom promoten → erscheint in der Bibliothek
    ov.promote_classic(overlay, "user-demo-1")
    lib2_ids = {n["id"] for n in ov.library_classic(effective, overlay)}
    assert "user-demo-1" in lib2_ids, lib2_ids


if __name__ == "__main__":
    test_adopt_unadopt()
    test_instance_vs_library()
    print("ALLE TESTS OK")
