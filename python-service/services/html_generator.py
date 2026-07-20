# [CSS.A10] html_generator.py
from .css_generator import generate_full_css

RESET_CSS = """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0d0d10; color: #e6e6ea;
       display: flex; align-items: center; justify-content: center; }
"""


def generate_html_page(config: dict, inline_css: bool = True) -> str:
    css = generate_full_css(config, vendor_prefixes=True)
    name = config["name"]
    selector = config["selector"].lstrip(".#")
    trigger = config.get("trigger", "load")

    element_html = f'<div class="{config["selector"].lstrip(".")}" id="demo">{name}</div>'
    if config["selector"].startswith("#"):
        element_html = f'<div id="{selector}">{name}</div>'

    trigger_script = ""
    if trigger == "click":
        trigger_script = f"""
    document.getElementById('demo').addEventListener('click', (e) => {{
      e.currentTarget.style.animation = 'none';
      requestAnimationFrame(() => e.currentTarget.style.animation = '');
    }});"""
    elif trigger == "inView":
        trigger_script = f"""
    const target = document.getElementById('demo');
    target.style.animationPlayState = 'paused';
    const io = new IntersectionObserver((entries) => {{
      entries.forEach((entry) => {{
        if (entry.isIntersecting) entry.target.style.animationPlayState = 'running';
      }});
    }}, {{ threshold: 0.3 }});
    io.observe(target);"""

    style_block = f"<style>\n{RESET_CSS}\n{css}\n</style>" if inline_css else '<link rel="stylesheet" href="styles.css">'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{name} — CSS Animation</title>
  {style_block}
</head>
<body>
  {element_html}
  <script>{trigger_script}</script>
</body>
</html>
"""


def generate_external_css_file(config: dict) -> str:
    return RESET_CSS + "\n" + generate_full_css(config, vendor_prefixes=True)
