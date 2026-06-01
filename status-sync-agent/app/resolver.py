"""Status-Resolver — wendet die ADR-088-Regeln an.

Input: source-binding pro Sovaia-Knoten + SourceState (ArgoCD + K8s).
Output: neuer Status (live | released | planned | deprecated) oder None
        wenn kein klares Signal vorliegt (Baseline bleibt).
"""
from __future__ import annotations

import logging
from typing import Literal

from .sources import SourceState

log = logging.getLogger(__name__)

StatusValue = Literal["live", "released", "planned", "deprecated"]


def resolve_status(binding: dict, state: SourceState) -> tuple[StatusValue | None, str]:
    """
    Returnt (status, source-description) — oder (None, reason) falls kein
    Status-Wechsel angezeigt ist.
    """
    if not binding:
        return None, "no source-binding"

    # 1. ArgoCD-App?
    argocd_app = binding.get("argocd-app")
    if argocd_app:
        app = state.argocd_apps.get(argocd_app)
        if app:
            health = (app.get("health") or "").lower()
            sync = (app.get("sync") or "").lower()
            if health == "healthy" and sync == "synced":
                return "live", f"argocd-app:{argocd_app} healthy+synced"
            if health in {"progressing", "degraded", "missing"} or sync == "outofsync":
                return "released", f"argocd-app:{argocd_app} {health}/{sync}"
            # unbekannter Status — Baseline behalten
            log.debug("ArgoCD-App %s mit unbekanntem Status %s/%s", argocd_app, health, sync)

    # 2. K8s-Deployment (Fallback wenn kein ArgoCD-Eintrag)
    k8s_dep = binding.get("k8s-deployment")
    if k8s_dep:
        dep = state.deployments.get(k8s_dep)
        if dep:
            if dep["ready"] and dep["ready_replicas"] > 0:
                return "released", f"k8s-deployment:{k8s_dep} ready"
            return "planned", f"k8s-deployment:{k8s_dep} not-ready"

    # 3. Prototype-Key — Stub (folgt mit Prototype-Host-API)
    proto_key = binding.get("prototype-key")
    if proto_key:
        log.debug("Prototype-Resolution noch nicht implementiert (key=%s)", proto_key)

    return None, "no decisive signal"
