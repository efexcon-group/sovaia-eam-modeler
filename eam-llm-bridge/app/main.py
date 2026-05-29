from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(
    title="eam-llm-bridge",
    version="0.1.0",
    description=(
        "Sovaia Architecture-Modeler — LLM-Bridge zur DGX. "
        "Iteration-0-Skelett (Endpoints stub-returnen, ohne LLM-Call)."
    ),
)


class ExtractRequest(BaseModel):
    utterance: str = Field(..., description="Customer-Utterance in natürlicher Sprache.")
    session_id: str = Field(..., description="Session-ID für Alias-Lernen.")
    tenant_id: str = Field(..., description="Tenant-ID für Audit-Log.")


class ToolCall(BaseModel):
    name: str
    arguments: dict


class ExtractResponse(BaseModel):
    tool_calls: list[ToolCall] = Field(default_factory=list)
    rationale_de: str = ""


class GapRequest(BaseModel):
    customer_ist_summary: str = Field(..., description="Zusammenfassung Customer-IST.")
    target_description: str = Field(..., description="Customer-Zielbild verbal.")
    tenant_id: str


class GapResponse(BaseModel):
    picked_sovaia_nodes: list[dict] = Field(default_factory=list)
    rationale_de: str = ""


@app.get("/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "eam-llm-bridge", "version": "0.1.0"}


@app.post("/v1/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest) -> ExtractResponse:
    # Iteration-0-Stub: returnt leere Tool-Calls.
    # Phase B/C: ruft DGX via dgx-gateway mit Tool-Use-Schema aus docs/iteration-0.md.
    return ExtractResponse(
        tool_calls=[],
        rationale_de="Stub-Antwort (Iteration 0). Tool-Use folgt in Phase B/C.",
    )


@app.post("/v1/gap-analyze", response_model=GapResponse)
async def gap_analyze(req: GapRequest) -> GapResponse:
    # Iteration-0-Stub.
    return GapResponse(
        picked_sovaia_nodes=[],
        rationale_de="Stub-Antwort (Iteration 0). Gap-Analyse folgt in Phase B/C.",
    )
