"""Sources — liest aktuellen Status aus den Plattform-Quellen.

Heute: ArgoCD-Applications + K8s-Deployments (in-cluster).
Später: Prototype-Host + GHCR-Releases.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from kubernetes import client as k8s_client
from kubernetes import config as k8s_config

log = logging.getLogger(__name__)


@dataclass
class SourceState:
    """Snapshot der Plattform-Quellen für eine Sync-Run."""
    argocd_apps: dict[str, dict]    # name → app spec/status
    deployments: dict[str, dict]    # "ns/name" → status


def _load_k8s_config() -> None:
    try:
        k8s_config.load_incluster_config()
    except k8s_config.ConfigException:
        k8s_config.load_kube_config()


def load_argocd_apps(namespace: str = "argocd") -> dict[str, dict]:
    """Liest ArgoCD-Application-CRDs direkt über die K8s-API (via ServiceAccount-RBAC).

    Kein REST-Token nötig — Health/Sync-Status stehen auf .status der CR,
    exakt wie sie auch /api/v1/applications liefern würde.
    """
    try:
        _load_k8s_config()
        api = k8s_client.CustomObjectsApi()
        resp = api.list_namespaced_custom_object(
            group="argoproj.io", version="v1alpha1",
            namespace=namespace, plural="applications",
        )
    except Exception as e:  # noqa: BLE001
        log.error("ArgoCD-Applications-Fetch (CRD) fehlgeschlagen: %s", e)
        return {}

    out: dict[str, dict] = {}
    for item in resp.get("items", []):
        name = item.get("metadata", {}).get("name")
        if not name:
            continue
        status = item.get("status", {})
        out[name] = {
            "health": (status.get("health") or {}).get("status"),
            "sync": (status.get("sync") or {}).get("status"),
        }
    log.info("ArgoCD: %d Applications (CRD) geladen", len(out))
    return out


def load_deployments() -> dict[str, dict]:
    try:
        _load_k8s_config()
        api = k8s_client.AppsV1Api()
        deployments = api.list_deployment_for_all_namespaces(timeout_seconds=30).items
    except Exception as e:  # noqa: BLE001
        log.error("K8s-Deployments-Fetch fehlgeschlagen: %s", e)
        return {}

    out: dict[str, dict] = {}
    for d in deployments:
        key = f"{d.metadata.namespace}/{d.metadata.name}"
        ready = (d.status.ready_replicas or 0) >= (d.spec.replicas or 1)
        out[key] = {
            "namespace": d.metadata.namespace,
            "name": d.metadata.name,
            "ready": ready,
            "replicas": d.spec.replicas or 0,
            "ready_replicas": d.status.ready_replicas or 0,
        }
    log.info("K8s: %d deployments geladen", len(out))
    return out


def collect_state(settings: Any) -> SourceState:
    """Lädt alle Quellen parallel — heute sequentiell, später async."""
    argocd = load_argocd_apps(settings.argocd_namespace)
    deployments = load_deployments()
    return SourceState(argocd_apps=argocd, deployments=deployments)
