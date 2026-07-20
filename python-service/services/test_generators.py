# [CSS.A10] test_generators.py
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services.css_generator import generate_full_css, generate_tailwind_config
from backend.services.html_generator import generate_html_page
from backend.services.styled_components_gen import generate_styled_component
from backend.services.framer_motion_gen import generate_framer_component
from backend.services.gsap_generator import generate_gsap_code
from backend.services.motion_one_generator import generate_motion_one_code
from backend.services.anime_js_generator import generate_anime_code
from backend.services.web_animation_gen import generate_waapi_code


def sample_config():
    return {
        "id": "abc123",
        "name": "fadeSlideIn",
        "selector": ".card",
        "trigger": "load",
        "tracks": [
            {
                "id": "t1", "property": "opacity", "enabled": True,
                "keyframes": [{"offset": 0, "value": 0}, {"offset": 1, "value": 1}],
            },
            {
                "id": "t2", "property": "translateY", "enabled": True,
                "keyframes": [
                    {"offset": 0, "value": 24, "unit": "px"},
                    {"offset": 1, "value": 0, "unit": "px"},
                ],
            },
        ],
        "timing": {
            "durationMs": 600, "delayMs": 0, "iterationCount": 1,
            "direction": "normal", "fillMode": "both", "playState": "running",
            "easing": {"name": "ease-out"},
        },
    }


def test_css_generator_has_keyframes_and_rule():
    css = generate_full_css(sample_config())
    assert "@keyframes fadeSlideIn" in css
    assert "opacity: 0" in css
    assert "translateY(24px)" in css
    assert ".card {" in css


def test_css_minify_removes_whitespace():
    css = generate_full_css(sample_config(), minify=True)
    assert "\n" not in css


def test_tailwind_config_extends_theme():
    js = generate_tailwind_config(sample_config())
    assert "theme" in js and "keyframes" in js and "animate-fadeSlideIn" in js


def test_html_page_is_self_contained():
    html = generate_html_page(sample_config())
    assert "<!DOCTYPE html>" in html
    assert "@keyframes fadeSlideIn" in html
    assert "viewport" in html


def test_styled_components_defines_keyframes_and_component():
    code = generate_styled_component(sample_config())
    assert "keyframes`" in code
    assert "export const FadeSlideIn" in code


def test_framer_motion_component_compiles_structurally():
    code = generate_framer_component(sample_config())
    assert "motion.div" in code
    assert "initial=" in code and "animate=" in code


def test_gsap_generates_fromto():
    code = generate_gsap_code(sample_config())
    assert "gsap.fromTo" in code
    assert '".card"' in code


def test_motion_one_generates_animate_call():
    code = generate_motion_one_code(sample_config())
    assert "animate(" in code
    assert "from \"motion\"" in code


def test_anime_generates_call():
    code = generate_anime_code(sample_config())
    assert "anime({" in code
    assert 'targets: ".card"' in code


def test_waapi_has_no_dependencies():
    code = generate_waapi_code(sample_config())
    assert "import" not in code
    assert ".animate(" in code


def test_50_property_cap_still_generates():
    cfg = sample_config()
    cfg["tracks"] = cfg["tracks"] * 25  # 50 tracks
    css = generate_full_css(cfg)
    assert "@keyframes" in css
