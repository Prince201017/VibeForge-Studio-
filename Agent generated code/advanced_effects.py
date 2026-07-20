# [CSS.A10] advanced_effects.py
"""
Standalone CSS/JS snippet generators for the "Advanced Effects" spec section.
Unlike the track-based generators, these take a small params dict and emit
ready-to-paste code, since these effects aren't naturally expressed as
keyframe tracks.
"""
from __future__ import annotations


def generate_glassmorphism(selector: str, blur_px: int = 12, opacity: float = 0.15,
                            border_opacity: float = 0.2, radius_px: int = 16) -> str:
    return f"""/* [CSS.A10] Glassmorphism */
{selector} {{
  background: rgba(255, 255, 255, {opacity});
  backdrop-filter: blur({blur_px}px);
  -webkit-backdrop-filter: blur({blur_px}px);
  border: 1px solid rgba(255, 255, 255, {border_opacity});
  border-radius: {radius_px}px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}}
"""


def generate_neumorphism(selector: str, bg_hex: str = "#e0e5ec", distance_px: int = 8,
                          blur_px: int = 16, intensity: float = 0.15, inset: bool = False) -> str:
    inset_kw = "inset " if inset else ""
    return f"""/* [CSS.A10] Neumorphism */
{selector} {{
  background: {bg_hex};
  border-radius: 20px;
  box-shadow: {inset_kw}{distance_px}px {distance_px}px {blur_px}px rgba(0,0,0,{intensity}),
              {inset_kw}-{distance_px}px -{distance_px}px {blur_px}px rgba(255,255,255,{intensity + 0.5});
}}
"""


def generate_magnetic_cursor(selector: str, strength: float = 0.4, radius_px: int = 120) -> str:
    return f"""// [CSS.A10] Magnetic cursor effect
document.querySelectorAll('{selector}').forEach((el) => {{
  const strength = {strength};
  const radius = {radius_px};

  el.addEventListener('mousemove', (e) => {{
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < radius) {{
      const pull = (1 - dist / radius) * strength;
      el.style.transform = `translate(${{dx * pull}}px, ${{dy * pull}}px)`;
    }}
  }});

  el.addEventListener('mouseleave', () => {{
    el.style.transform = 'translate(0, 0)';
    el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }});
  el.addEventListener('mouseenter', () => {{
    el.style.transition = 'none';
  }});
}});
"""


def generate_parallax_scroll(layers: list) -> str:
    """layers: [{ selector, speed }] where speed 0 = fixed to viewport, 1 = scrolls normally."""
    lines = ["// [CSS.A10] Parallax scroll effect",
             "function initParallax() {",
             "  const layers = ["]
    for layer in layers:
        lines.append(f"    {{ el: document.querySelector('{layer['selector']}'), speed: {layer.get('speed', 0.5)} }},")
    lines += [
        "  ].filter(l => l.el);",
        "",
        "  function onScroll() {",
        "    const y = window.scrollY;",
        "    layers.forEach(({ el, speed }) => {",
        "      el.style.transform = `translate3d(0, ${y * speed}px, 0)`;",
        "    });",
        "  }",
        "",
        "  window.addEventListener('scroll', onScroll, { passive: true });",
        "  onScroll();",
        "}",
        "",
        "initParallax();",
    ]
    return "\n".join(lines)


def generate_scroll_triggered_reveal(selector: str, translate_y_px: int = 40, duration_ms: int = 600,
                                      threshold: float = 0.2) -> str:
    return f"""/* [CSS.A10] Scroll-triggered reveal */
{selector} {{
  opacity: 0;
  transform: translateY({translate_y_px}px);
  transition: opacity {duration_ms}ms ease-out, transform {duration_ms}ms ease-out;
}}
{selector}.is-visible {{
  opacity: 1;
  transform: translateY(0);
}}
"""


def generate_scroll_reveal_observer(selector: str, threshold: float = 0.2) -> str:
    return f"""// [CSS.A10] Pairs with generate_scroll_triggered_reveal CSS above
const io = new IntersectionObserver((entries) => {{
  entries.forEach((entry) => {{
    if (entry.isIntersecting) {{
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }}
  }});
}}, {{ threshold: {threshold} }});

document.querySelectorAll('{selector}').forEach((el) => io.observe(el));
"""


def generate_liquid_morph(selector: str, path_a: str, path_b: str, duration_ms: int = 1500) -> str:
    """SVG shape morphing between two path `d` strings using the Web Animations API on an SVG <path>."""
    return f"""// [CSS.A10] SVG liquid morph — requires matching point counts between path_a and path_b
const morphTarget = document.querySelector('{selector}');
morphTarget.animate(
  [
    {{ d: `path("{path_a}")` }},
    {{ d: `path("{path_b}")` }},
  ],
  {{
    duration: {duration_ms},
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    iterations: Infinity,
    direction: 'alternate',
  }}
);
// Fallback for browsers without CSS d-interpolation support: use a library
// like flubber to precompute interpolators, or GSAP's MorphSVG plugin.
"""


def generate_micro_interaction(kind: str, selector: str) -> str:
    """kind: 'button-press' | 'toggle' | 'checkbox-check'"""
    presets = {
        "button-press": f"""{selector} {{
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}}
{selector}:active {{
  transform: scale(0.94);
}}""",
        "toggle": f"""{selector} .thumb {{
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}}
{selector}.checked .thumb {{
  transform: translateX(20px);
}}""",
        "checkbox-check": f"""{selector} .check-path {{
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s ease-out;
}}
{selector}.checked .check-path {{
  stroke-dashoffset: 0;
}}""",
    }
    return presets.get(kind, f"/* Unknown micro-interaction kind: {kind} */")
