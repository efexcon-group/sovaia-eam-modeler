"""Stub-Modus für die Bridge — gibt template-basierte Classic-Vorschläge zurück
wenn DGX nicht verfügbar ist. Klar markiert mit '[STUB]' im Label damit der
User sieht dass das keine echte LLM-Antwort ist.

Pfad-spezifische Templates für die häufigsten Domain-Schlagworte.
"""
from __future__ import annotations

from typing import Any

# Schlagwort → Template-Liste pro Pfad-Segment.
# Erste Match-gewinnt-Heuristik.
_PATTERNS: list[tuple[list[str], list[dict[str, Any]]]] = [
    (
        ["finanzen", "abrechnung", "buchhaltung"],
        [
            {"type": "anwendung",     "label": "Buchhaltungs-Software (z.B. Abacus / Sage)",      "summary": "Klassische lokale oder gehostete Buchhaltung mit manueller Beleg-Eingabe."},
            {"type": "anwendung",     "label": "Excel-Tabellen für Reporting",                    "summary": "Monatliche Reports per Hand aus Buchhaltung gezogen und in Excel weiter verarbeitet."},
            {"type": "dokument",      "label": "Beleg-Ordner Papier",                              "summary": "Eingehende Belege werden physisch abgelegt — Aufbewahrung nach OR/RG."},
            {"type": "prozess",       "label": "Monats-Abschluss manuell",                         "summary": "Manuelle Abstimmung Soll/Haben, Mahnwesen telefonisch."},
            {"type": "schnittstelle", "label": "ISO-20022-Bank-Export",                            "summary": "Bank-Daten als pain/camt-Files exportiert und manuell eingelesen."},
        ],
    ),
    (
        ["mitarbeiter", "personal", "schicht", "dienst"],
        [
            {"type": "anwendung", "label": "Excel-Dienstplan",                "summary": "Schichtplan in Excel, Aushang am Brett, Vertretung per Telefon/WhatsApp."},
            {"type": "anwendung", "label": "Lohn- und Zeiterfassungs-Software", "summary": "Klassische HR-Software ohne Skill-Matching."},
            {"type": "prozess",   "label": "Krankheits-Vertretungssuche manuell", "summary": "Bei Ausfall werden Kollegen einzeln durchgerufen bis jemand Zeit hat."},
            {"type": "dokument",  "label": "Stundenrapport Papier",            "summary": "Stunden werden auf Papier-Rapport notiert, am Monatsende übertragen."},
            {"type": "nutzer-rolle", "label": "Dienstplanverantwortliche/r",   "summary": "Eine Person trägt Verantwortung für Dienstplan, Schwund häufig auf wenige Schultern."},
        ],
    ),
    (
        ["pflege", "doku", "betreuung"],
        [
            {"type": "dokument",  "label": "Pflegedoku auf Papier",           "summary": "Verlaufseinträge handschriftlich in Bewohner-Mappe."},
            {"type": "anwendung", "label": "PDMS-Klick-Software (lokal)",     "summary": "Lokale Dokumentations-Software mit Formular-Klicken, kein Sprachinput."},
            {"type": "prozess",   "label": "Schichtwechsel-Besprechung",      "summary": "15-30 Minuten mündliche Übergabe pro Schicht."},
            {"type": "datenraum", "label": "Bewohner-Mappe Papier",           "summary": "Stamm- und Pflegedaten in physischer Mappe pro Bewohner."},
            {"type": "schnittstelle", "label": "Telefon-Pikett",              "summary": "Bei Notfall Anruf an Pikett-Person — keine strukturierte Doku."},
        ],
    ),
    (
        ["zoll", "verzollung", "customs"],
        [
            {"type": "prozess",   "label": "e-dec / eVV-Anmeldung manuell",    "summary": "Zoll-Anmeldung Position für Position aus Handelsrechnung gefüllt."},
            {"type": "dokument",  "label": "Spedi-Begleitformulare",            "summary": "CMR, Carnet TIR, Carnet ATA als PDF oder Papier."},
            {"type": "anwendung", "label": "Lokale Zoll-Software",              "summary": "Selbstgepflegte HS-Code-Datenbank in Excel oder Access."},
            {"type": "schnittstelle", "label": "EDI-Anbindung an Zollagent",   "summary": "Manuelle Datenübergabe an externen Zollagenten."},
        ],
    ),
    (
        ["heim", "belegung", "betrieb"],
        [
            {"type": "anwendung", "label": "Belegungs-Tabelle Excel",          "summary": "Aktuelle Belegung wird zentral in Excel geführt."},
            {"type": "prozess",   "label": "Aufnahme-Gespräch in Person",      "summary": "Verträge auf Papier ausgefüllt, später digitalisiert."},
            {"type": "dokument",  "label": "Heim-Vertrag Papier",              "summary": "Standardvertrag, mehrfach abgehakt und unterschrieben."},
        ],
    ),
    (
        ["hotellerie", "reinigung", "wäsche", "waeschere", "empfang"],
        [
            {"type": "dokument",  "label": "Reinigungs-Rapport-Karten",        "summary": "Karten an der Tür, manuell abgehakt nach Reinigung."},
            {"type": "anwendung", "label": "Touren-Excel",                      "summary": "Reinigungs-Touren pro Stockwerk in Excel."},
            {"type": "prozess",   "label": "Wäsche-Logistik per Sammel-Rolli", "summary": "Wäsche-Säcke per Stockwerk gesammelt, Wäscherei extern."},
        ],
    ),
    (
        ["küche", "kueche", "speise", "diät", "diaet"],
        [
            {"type": "dokument",  "label": "Wochen-Speiseplan Aushang",         "summary": "Wochenplan ausgedruckt am Aushang, Diät-Listen in Ordnern."},
            {"type": "anwendung", "label": "Küchen-Bestell-Excel",              "summary": "Lebensmittel-Bestellung in Excel, Lieferanten per Mail."},
            {"type": "prozess",   "label": "Diät-Manuelle Abstimmung",          "summary": "Diät- und Allergen-Anpassungen pro Bewohner manuell auf Tablett-Karten."},
        ],
    ),
    (
        ["projekt", "bau", "renov"],
        [
            {"type": "anwendung", "label": "MS Project / Excel-Gantt",          "summary": "Projektplan in MS Project oder Excel-Gantt-Chart."},
            {"type": "dokument",  "label": "Projekt-Akte Ordner",               "summary": "Pläne, Verträge, Rechnungen in Projekt-Ordner."},
            {"type": "prozess",   "label": "Wochen-Jour-Fixe",                  "summary": "Wöchentliches Treffen aller Projekt-Beteiligten."},
        ],
    ),
    (
        ["logistik", "transport", "spedition", "sendung"],
        [
            {"type": "anwendung", "label": "TMS-Software",                      "summary": "Transport-Management-System mit manueller Tour-Planung."},
            {"type": "dokument",  "label": "Frachtbrief Papier",                "summary": "Klassischer CMR/AWB-Frachtbrief."},
            {"type": "schnittstelle", "label": "Telematik-Box im LKW",          "summary": "GPS-Standort, Fahrer-Login, manuelle Status-Eingabe."},
        ],
    ),
]


def _normalize(s: str) -> str:
    return s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")


def stub_classic_proposals(path: str, limit: int) -> list[dict[str, Any]]:
    """Wählt eine Pattern-Liste basierend auf Pfad-Segmenten + returnt limit-viele Vorschläge."""
    segs = [_normalize(s) for s in path.split("/")]
    chosen: list[dict[str, Any]] | None = None
    for keywords, items in _PATTERNS:
        if any(kw in seg for seg in segs for kw in keywords):
            chosen = items
            break
    if chosen is None:
        # Generischer Fallback.
        chosen = [
            {"type": "anwendung", "label": f"Excel-/Sheet-basierte Erfassung für {path.split('/')[-1]}", "summary": "Manuelle Datenerfassung ohne Integration."},
            {"type": "dokument",  "label": "Papier-Akte Ordner",                "summary": "Belege, Verträge und Doku werden physisch abgelegt."},
            {"type": "prozess",   "label": "Manueller Routine-Prozess",         "summary": "Wiederkehrende Aufgabe ohne Automatisierung, abhängig von Personal."},
        ]
    proposals: list[dict[str, Any]] = []
    for i, item in enumerate(chosen[:limit]):
        proposals.append(
            {
                "type": item["type"],
                "label-de": f"[STUB] {item['label']}",
                "summary-de": item["summary"],
                "typical-tools": [],
                "operational-status": "in-use-everywhere",
            }
        )
    return proposals
