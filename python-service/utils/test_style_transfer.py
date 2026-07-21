from style_transfer import extract_style_profile, apply_style_to_nodes


def test_extract_dominant_color():
    nodes = [{"props": {"fill": "#ff0000"}}, {"props": {"fill": "#ff0000"}}, {"props": {"fill": "#00ff00"}}]
    profile = extract_style_profile(nodes)
    assert profile.dominant_colors[0] == "#ff0000"


def test_apply_style_remaps_fill():
    nodes = [{"props": {"fill": "#000000"}}]
    profile = extract_style_profile([{"props": {"fill": "#ff00ff"}}])
    applied = apply_style_to_nodes(nodes, profile)
    assert applied[0]["props"]["fill"] == "#ff00ff"
