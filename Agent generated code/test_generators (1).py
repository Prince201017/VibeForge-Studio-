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


# --- New: code_formatter --------------------------------------------------

def test_minify_css_removes_whitespace():
    from backend.services.code_formatter import minify_css
    css = generate_full_css(sample_config())
    minified = minify_css(css)
    assert "\n" not in minified
    assert len(minified) < len(css)


def test_format_code_falls_back_without_prettier():
    from backend.services.code_formatter import format_code
    css = "@keyframes x{0%{opacity:0;}100%{opacity:1;}}"
    formatted = format_code(css, "css")
    assert "opacity" in formatted


# --- New: source_maps ------------------------------------------------------

def test_source_map_has_valid_v3_shape():
    from backend.services.source_maps import generate_source_map
    cfg = sample_config()
    css = generate_full_css(cfg)
    smap = generate_source_map(css, cfg["name"], cfg)
    assert smap["version"] == 3
    assert smap["file"] == "fadeSlideIn.css"
    assert isinstance(smap["mappings"], str) and len(smap["mappings"]) > 0
    assert smap["sources"] == ["fadeSlideIn.config.json"]


def test_source_map_comment_appended():
    from backend.services.source_maps import append_source_map_comment
    result = append_source_map_comment("body{}", "x.css.map")
    assert "sourceMappingURL=x.css.map" in result


# --- New: advanced_effects -------------------------------------------------

def test_glassmorphism_includes_backdrop_filter():
    from backend.services.advanced_effects import generate_glassmorphism
    css = generate_glassmorphism(".card")
    assert "backdrop-filter: blur" in css


def test_neumorphism_includes_dual_shadow():
    from backend.services.advanced_effects import generate_neumorphism
    css = generate_neumorphism(".btn")
    assert css.count("box-shadow") == 1
    assert "rgba(0,0,0" in css and "rgba(255,255,255" in css


def test_magnetic_cursor_has_mousemove_listener():
    from backend.services.advanced_effects import generate_magnetic_cursor
    js = generate_magnetic_cursor(".magnet")
    assert "mousemove" in js and "mouseleave" in js


def test_parallax_generates_layers():
    from backend.services.advanced_effects import generate_parallax_scroll
    js = generate_parallax_scroll([{"selector": ".bg", "speed": 0.3}, {"selector": ".fg", "speed": 0.8}])
    assert ".bg" in js and ".fg" in js and "scroll" in js


def test_scroll_reveal_pair():
    from backend.services.advanced_effects import generate_scroll_triggered_reveal, generate_scroll_reveal_observer
    css = generate_scroll_triggered_reveal(".reveal")
    js = generate_scroll_reveal_observer(".reveal")
    assert "is-visible" in css and "is-visible" in js
    assert "IntersectionObserver" in js


def test_liquid_morph_generates_animate_call():
    from backend.services.advanced_effects import generate_liquid_morph
    js = generate_liquid_morph("#blob", "M0,0", "M10,10", 1000)
    assert ".animate(" in js and "M0,0" in js and "M10,10" in js


def test_micro_interaction_button_press():
    from backend.services.advanced_effects import generate_micro_interaction
    css = generate_micro_interaction("button-press", ".btn")
    assert ":active" in css


# --- New: component_library -------------------------------------------------

def test_component_library_lists_all_categories():
    from backend.services.component_library import list_component_presets
    presets = list_component_presets()
    categories = {p["category"] for p in presets}
    assert {"button", "card", "menu", "modal", "loader", "transition", "notification"}.issubset(categories)


def test_component_library_get_known_preset():
    from backend.services.component_library import get_component_preset
    preset = get_component_preset("card-flip")
    assert preset is not None
    assert "rotateY(180deg)" in preset["css"]


def test_component_library_unknown_preset_returns_none():
    from backend.services.component_library import get_component_preset
    assert get_component_preset("does-not-exist") is None


# --- New: performance_analyzer ----------------------------------------------

def test_gpu_analysis_flags_layout_properties():
    from backend.services.performance_analyzer import analyze_gpu_usage
    cfg = sample_config()
    cfg["tracks"].append({
        "id": "t3", "property": "width", "enabled": True,
        "keyframes": [{"offset": 0, "value": 100}, {"offset": 1, "value": 200}],
    })
    result = analyze_gpu_usage(cfg["tracks"])
    assert result["gpuOnly"] is False
    assert "width" in result["nonGpuProperties"]


def test_gpu_only_animation_passes():
    from backend.services.performance_analyzer import analyze_gpu_usage
    cfg = sample_config()  # only opacity + translateY
    result = analyze_gpu_usage(cfg["tracks"])
    assert result["gpuOnly"] is True


def test_duplicate_detection_finds_identical_configs():
    from backend.services.performance_analyzer import detect_duplicate_animations
    cfg_a = sample_config()
    cfg_b = sample_config()
    cfg_b["name"] = "differentName"
    cfg_b["id"] = "different-id"
    dupes = detect_duplicate_animations([cfg_a, cfg_b])
    assert len(dupes) == 1
    assert set(dupes[0]["names"]) == {"fadeSlideIn", "differentName"}


def test_full_analysis_returns_warnings_structure():
    from backend.services.performance_analyzer import analyze_animation
    cfg = sample_config()
    css = generate_full_css(cfg)
    report = analyze_animation(cfg, css)
    assert "size" in report and "gpu" in report and "willChange" in report and "warnings" in report


# --- New: container queries -------------------------------------------------

def test_container_queries_generated_for_breakpoints():
    from backend.services.css_generator import generate_container_queries
    cfg = sample_config()
    cfg["breakpoints"] = [{"name": "mobile", "maxWidth": 480, "overrides": {"durationMs": 300}}]
    cq = generate_container_queries(cfg["name"], cfg["selector"], cfg["breakpoints"])
    assert "@container" in cq and "animation-duration: 300ms" in cq


def test_full_css_can_use_container_queries():
    cfg = sample_config()
    cfg["breakpoints"] = [{"name": "mobile", "maxWidth": 480, "overrides": {"durationMs": 300}}]
    css = generate_full_css(cfg, use_container_queries=True)
    assert "@container" in css
