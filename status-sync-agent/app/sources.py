"""Sources — liest aktuellen Status aus den Plattform-Quellen.

Heute: ArgoCD-Applications + K8s-Deployments (in-cluster).
Später: Prototype-Host + GHCR-Releases.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx
from kubernetes import client as k8s_client
from kubernetes import config as k8s_config

log = logging.getLogger(__name__)


@dataclass
class SourceState:
    """Snapshot der Plattform-Quellen für eine Sync-Run."""
    argocd_apps: dict[str, dict]    # name → app spec/status
    deployments: dict[str, dict]    # "ns/name" → status


def load_argocd_apps(server: str, token: str, insecure: bool) -> dict[str, dict]:
    if not token:
        log.warning("ARGOCD_TOKEN nicht gesetzt — ArgoCD-Apps werden übersprungen")
        return {}
    try:
        url = server.rstrip("/") + "/api/v1/applications"
        with httpx.Client(verify=not insecure, timeout=30.0) as client:
            r = client.get(url, headers={"Authorization": f"Bearer {token}"})
            r.raise_for_status()
            data = r.json()
        out: dict[str, dict] = {}
        for item in data.get("items", []):
            name = item.get("metadata", {}).get("name")
            if not name:
                continue
            out[name] = {
                "health": item.get("status", {}).get("health", {}).get("status"),
                "sync": item.get("status", {}).get("sync", {}).get("status"),
            }
        log.info("ArgoCD: %d apps geladen", len(out))
        return out
    except Exception as e:  # noqa: BLE001
        log.error("ArgoCD-Fetch fehlgeschlagen: %s", e)
        return {}


def load_deployments() -> dict[str, dict]:
    try:
        try:
            k8s_config.load_incluster_config()
        except k8s_config.ConfigException:
            k8s_config.load_kube_config()
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
    argocd = load_argocd_apps(settings.argocd_server, settings.argocd_token, settings.argocd_insecure)
    deployments = load_deployments()
    return SourceState(argocd_apps=argocd, deployments=deployments)
