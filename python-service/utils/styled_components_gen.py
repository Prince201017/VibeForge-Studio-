# [CSS.A10] styled_components_gen.py
from .css_generator import generate_keyframes, generate_shorthand


def _to_pascal_case(name: str) -> str:
    """fadeSlideIn -> FadeSlideIn, fade-slide-in -> FadeSlideIn (preserves internal camelCase)."""
    words = name.replace("-", " ").replace("_", " ").split()
    out = []
    for w in words:
        out.append(w[0].upper() + w[1:] if w else w)
    return "".join(out)


def generate_styled_component(config: dict, typescript: bool = True) -> str:
    name = config["name"]
    component_name = _to_pascal_case(name)
    keyframes_css = generate_keyframes(name, config["tracks"])
    # Convert to template-literal-safe body (strip the wrapping `@keyframes name { ... }`)
    inner = "\n".join(keyframes_css.splitlines()[1:-1])
    shorthand = generate_shorthand(name, config["timing"]).replace(
        f"animation: {name} ", f"animation: ${{{name}Keyframes}} "
    )
    trigger = config.get("trigger", "load")

    pseudo = ""
    animation_decl = f"  {shorthand}"
    if trigger == "hover":
        animation_decl = ""
        pseudo = f"\n\n  &:hover {{\n    {shorthand}\n  }}"

    props_iface = ""
    props_param = ""
    if typescript:
        props_iface = f"interface {component_name}Props {{\n  active?: boolean;\n}}\n\n"
        props_param = f"<{component_name}Props>"

    return f"""// [CSS.A10] Generated Styled Components code for "{name}"
import styled, {{ keyframes }} from 'styled-components';

const {name}Keyframes = keyframes`
{inner}
`;

{props_iface}export const {component_name} = styled.div{props_param}`
{animation_decl}{pseudo}
`;

// usage:
// <{component_name} />
"""
