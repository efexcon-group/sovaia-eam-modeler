"""eam-llm-bridge — schmale Brücke zwischen architecture-modeler-api und DGX-Stack.

Implementiert (V1b):
- POST /v1/generate-classic — schlägt LLM-Vorschläge für Classic-Knoten an einem
  Taxonomie-Pfad vor (siehe prompts/classic_seed_system.txt).
- POST /v1/extract — Stub (Customer-IST-Intake folgt Iteration 2).
- POST /v1/gap-analyze — Stub (Customer-SOLL folgt Iteration 2).

DGX-Anbindung: OpenAI-kompatibler /v1/chat/completions-Endpoint.
Konfiguration: ENV `DGX_LLM_URL`.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import Settings, get_settings
from app.stub import stub_classic_proposals, stub_refine_description


app = FastAPI(
    title="eam-llm-bridge",
    version="0.2.0",
    description="Sovaia Architecture-Modeler — Bridge zur DGX (Iteration 1b).",
)


# ── Schemas ─────────────────────────────────────────────────────────────

class ContextItem(BaseModel):
    label_de: str | None = Field(default=None, alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    type: str | None = None

    class Config:
        populate_by_name = True


class GenerateClassicRequest(BaseModel):
    path: str
    limit: int = Field(default=5, ge=1, le=10)
    sovaia_context: list[ContextItem] = Field(default_factory=list, alias="sovaia-context")
    existing_classic: list[ContextItem] = Field(default_factory=list, alias="existing-classic")

    class Config:
        populate_by_name = True


class Proposal(BaseModel):
    type: str
    label_de: str = Field(alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    typical_tools: list[str] | None = Field(default=None, alias="typical-tools")
    operational_status: str | None = Field(default=None, alias="operational-status")

    class Config:
        populate_by_name = True


class GenerateClassicResponse(BaseModel):
    proposals: list[dict[str, Any]]
    model: str
    raw_used: bool = False


class RefineDescriptionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    label_de: str = Field(alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    intent: str = "improve"
    persona: str = "decision-maker"
    extra_hint: str | None = Field(default=None, alias="extra-hint")


class RefineDescriptionResponse(BaseModel):
    label_de: str = Field(alias="label-de")
    summary_de: str = Field(alias="summary-de")
    model: str
    model_config = ConfigDict(populate_by_name=True)


# ── Prompt-Loading ──────────────────────────────────────────────────────

_PROMPT_DIR = Path(__file__).parent / "prompts"


def _load_system_prompt(name: str, **vars_: Any) -> str:
    text = (_PROMPT_DIR / name).read_text(encoding="utf-8")
    for k, v in vars_.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def _build_user_message(req: GenerateClassicRequest) -> str:
    def _fmt(items: list[ContextItem]) -> str:
        if not items:
            return "(keine)"
        return "\n".join(
            f"  - [{i.type or '?'}] {i.label_de}: {i.summary_de or ''}".rstrip()
            for i in items
        )

    return (
        f"Pfad in der Sovaia-Taxonomie: {req.path}\n\n"
        f"Sovaia-Module die auf diesem Pfad gemappt sind:\n{_fmt(req.sovaia_context)}\n\n"
        f"Bereits erfasste Classic-Knoten auf diesem Pfad (nicht erneut vorschlagen):\n{_fmt(req.existing_classic)}\n\n"
        f"Schlage exakt {req.limit} komplementäre KLASSISCHE Knoten vor."
    )


# ── DGX-Call ────────────────────────────────────────────────────────────

async def _call_dgx(settings: Settings, system: str, user: str) -> str:
    if not settings.dgx_llm_url:
        raise HTTPException(
            status_code=503,
            detail="DGX_LLM_URL not configured. Set env DGX_LLM_URL=http://... to enable LLM-batch.",
        )
    url = settings.dgx_llm_url.rstrip("/") + "/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    if settings.dgx_api_key:
        headers["Authorization"] = f"Bearer {settings.dgx_api_key}"
    body = {
        "model": settings.dgx_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=settings.dgx_timeout_seconds) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"DGX upstream {r.status_code}: {r.text[:300]}",
            )
        data = r.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise HTTPException(
                status_code=502, detail=f"DGX response shape unexpected: {e!r}"
            )


def _parse_proposals(content: str) -> list[dict[str, Any]]:
    """Extrahiert eine JSON-Liste aus dem LLM-Content. Tolerant gegen Markdown-Fences."""
    s = content.strip()
    # Markdown-Fence entfernen falls vorhanden.
    if s.startswith("```"):
        s = s.strip("`")
        # ersten Zeilen-Label entfernen (z.B. ```json)
        nl = s.find("\n")
        if nl >= 0:
            s = s[nl + 1 :]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
    # Falls die Antwort einen "proposals"-Wrapper hat:
    try:
        parsed = json.loads(s)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"LLM returned non-JSON content (preview): {s[:200]}"
        ) from e
    if isinstance(parsed, dict) and "proposals" in parsed:
        parsed = parsed["proposals"]
    if not isinstance(parsed, list):
        raise HTTPException(
            status_code=502, detail=f"LLM returned non-list at top: {type(parsed).__name__}"
        )
    return parsed


# ── Endpoints ───────────────────────────────────────────────────────────

@app.get("/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "eam-llm-bridge", "version": "0.2.0"}


@app.post("/v1/generate-classic", response_model=GenerateClassicResponse)
async def generate_classic(req: GenerateClassicRequest) -> GenerateClassicResponse:
    settings = get_settings()
    if settings.llm_mode.lower() == "stub":
        proposals = stub_classic_proposals(req.path, req.limit)
        return GenerateClassicResponse(proposals=proposals, model="stub")
    # Default: dgx
    system = _load_system_prompt("classic_seed_system.txt", limit=req.limit)
    user = _build_user_message(req)
    content = await _call_dgx(settings, system, user)
    proposals = _parse_proposals(content)
    return GenerateClassicResponse(proposals=proposals, model=settings.dgx_model)


@app.post("/v1/refine-description", response_model=RefineDescriptionResponse)
async def refine_description(req: RefineDescriptionRequest) -> RefineDescriptionResponse:
    settings = get_settings()
    if settings.llm_mode.lower() == "stub":
        out = stub_refine_description(req.label_de, req.summary_de or "", req.intent)
        return RefineDescriptionResponse(**out, model="stub")

    system = (_PROMPT_DIR / "refine_description_system.txt").read_text(encoding="utf-8")
    user = (
        f"Intent: {req.intent}\n"
        f"Persona: {req.persona}\n"
        f"Label: {req.label_de}\n"
        f"Beschreibung: {req.summary_de or '(leer)'}\n"
        + (f"Extra-Hinweis: {req.extra_hint}\n" if req.extra_hint else "")
    )
    content = await _call_dgx(settings, system, user)
    parsed = _parse_json_object(content)
    return RefineDescriptionResponse(
        **{"label-de": parsed.get("label-de", req.label_de),
           "summary-de": parsed.get("summary-de", "")},
        model=settings.dgx_model,
    )


def _parse_json_object(content: str) -> dict:
    s = content.strip()
    if s.startswith("```"):
        s = s.strip("`")
        nl = s.find("\n")
        if nl >= 0:
            s = s[nl + 1 :]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
    try:
        parsed = json.loads(s)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned non-JSON: {s[:200]}") from e
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="LLM returned non-object")
    return parsed


@app.post("/v1/extract")
async def extract() -> dict:
    return {
        "tool_calls": [],
        "rationale_de": "Stub-Antwort. Customer-IST-Intake folgt Iteration 2.",
    }


@app.post("/v1/gap-analyze")
async def gap_analyze() -> dict:
    return {
        "picked_sovaia_nodes": [],
        "rationale_de": "Stub-Antwort. Customer-SOLL folgt Iteration 2.",
    }
