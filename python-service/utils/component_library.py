# [CSS.A10] component_library.py
"""
Pre-built animation patterns, returned as ready-to-paste CSS. Each entry
returns @keyframes + a usage class, matching the "Component Library" spec
section (buttons, cards, menus, modals, loaders, transitions, notifications).
"""
from __future__ import annotations

_PATTERNS: dict[str, dict] = {
    "button-hover-lift": {
        "category": "button",
        "css": """.btn-hover-lift {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.btn-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}""",
    },
    "button-loading": {
        "category": "button",
        "css": """@keyframes btnSpin { to { transform: rotate(360deg); } }
.btn-loading .spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: btnSpin 0.6s linear infinite;
}""",
    },
    "card-flip": {
        "category": "card",
        "css": """.card-flip { perspective: 1000px; }
.card-flip-inner {
  position: relative; transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
}
.card-flip.is-flipped .card-flip-inner { transform: rotateY(180deg); }
.card-flip-front, .card-flip-back { position: absolute; inset: 0; backface-visibility: hidden; }
.card-flip-back { transform: rotateY(180deg); }""",
    },
    "card-expand": {
        "category": "card",
        "css": """.card-expand {
  transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
}
.card-expand:hover {
  transform: scale(1.03);
  box-shadow: 0 12px 24px rgba(0,0,0,0.18);
}""",
    },
    "menu-slide": {
        "category": "menu",
        "css": """.menu-slide {
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.menu-slide.is-open { transform: translateX(0); }""",
    },
    "menu-fade": {
        "category": "menu",
        "css": """@keyframes menuFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.menu-fade.is-open { animation: menuFadeIn 0.2s ease-out forwards; }""",
    },
    "modal-appear": {
        "category": "modal",
        "css": """@keyframes modalAppear {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.modal.is-open { animation: modalAppear 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.modal-backdrop.is-open { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }""",
    },
    "modal-disappear": {
        "category": "modal",
        "css": """@keyframes modalDisappear {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}
.modal.is-closing { animation: modalDisappear 0.2s ease-in forwards; }""",
    },
    "loader-spinner": {
        "category": "loader",
        "css": """@keyframes spin { to { transform: rotate(360deg); } }
.loader-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}""",
    },
    "loader-pulse": {
        "category": "loader",
        "css": """@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.loader-pulse { animation: pulse 1.2s ease-in-out infinite; }""",
    },
    "loader-bounce": {
        "category": "loader",
        "css": """@keyframes bounceDot { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
.loader-bounce span {
  display: inline-block; width: 8px; height: 8px; margin: 0 2px;
  background: currentColor; border-radius: 50%;
  animation: bounceDot 1.4s ease-in-out infinite both;
}
.loader-bounce span:nth-child(2) { animation-delay: 0.16s; }
.loader-bounce span:nth-child(3) { animation-delay: 0.32s; }""",
    },
    "page-transition": {
        "category": "transition",
        "css": """@keyframes pageEnter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.page-enter { animation: pageEnter 0.35s ease-out forwards; }""",
    },
    "toast-slide-in": {
        "category": "notification",
        "css": """@keyframes toastSlideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastSlideOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
.toast.is-entering { animation: toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
.toast.is-leaving { animation: toastSlideOut 0.25s ease-in forwards; }""",
    },
}


def list_component_presets() -> list[dict]:
    return [{"id": pid, "category": p["category"]} for pid, p in _PATTERNS.items()]


def get_component_preset(preset_id: str) -> dict | None:
    p = _PATTERNS.get(preset_id)
    if not p:
        return None
    return {"id": preset_id, "category": p["category"], "css": p["css"]}


def get_presets_by_category(category: str) -> list[dict]:
    return [
        {"id": pid, "category": p["category"], "css": p["css"]}
        for pid, p in _PATTERNS.items()
        if p["category"] == category
    ]
