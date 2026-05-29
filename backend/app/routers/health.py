from fastapi import APIRouter

router = APIRouter()


@router.get("/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "architecture-modeler-api", "version": "0.1.0"}
