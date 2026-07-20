"""[V0.A7] Export format registry — single source of truth for format metadata,
consumed by GET /api/export/formats and mirrored on the frontend in
lib/export/formats.ts (kept in sync manually; see that file's header comment)."""
from models.schemas import ExportFormat, FormatInfo

FORMAT_CATALOG: list[FormatInfo] = [
    FormatInfo(format=ExportFormat.MP4, category="video", label="MP4 (H.264)", extension=".mp4", supports_audio=True,
               notes="Widely compatible, best default for sharing."),
    FormatInfo(format=ExportFormat.WEBM, category="video", label="WebM (VP9)", extension=".webm", supports_audio=True,
               notes="Web-optimized, smaller files."),
    FormatInfo(format=ExportFormat.MOV, category="video", label="MOV (ProRes 422 HQ)", extension=".mov",
               supports_alpha=True, supports_audio=True, notes="High-quality intermediate for further editing."),
    FormatInfo(format=ExportFormat.MKV, category="video", label="MKV (H.265, lossless)", extension=".mkv", supports_audio=True),
    FormatInfo(format=ExportFormat.AVI, category="video", label="AVI (legacy)", extension=".avi", supports_audio=True),

    FormatInfo(format=ExportFormat.PNG_SEQUENCE, category="image_sequence", label="PNG Sequence", extension=".png",
               supports_alpha=True),
    FormatInfo(format=ExportFormat.APNG, category="image_sequence", label="Animated PNG", extension=".png", supports_alpha=True),
    FormatInfo(format=ExportFormat.WEBP_SEQUENCE, category="image_sequence", label="WebP Sequence", extension=".webp", supports_alpha=True),
    FormatInfo(format=ExportFormat.AVIF_SEQUENCE, category="image_sequence", label="AVIF Sequence", extension=".avif",
               supports_alpha=True, notes="Requires pillow-avif-plugin on the server."),
    FormatInfo(format=ExportFormat.EXR_SEQUENCE, category="image_sequence", label="OpenEXR Sequence", extension=".exr",
               supports_alpha=True, notes="Requires OpenEXR native libs on the server."),
    FormatInfo(format=ExportFormat.TIFF_SEQUENCE, category="image_sequence", label="TIFF Sequence", extension=".tiff", supports_alpha=True),

    FormatInfo(format=ExportFormat.CSS, category="code", label="CSS (@keyframes)", extension=".css"),
    FormatInfo(format=ExportFormat.HTML, category="code", label="HTML Page", extension=".html"),
    FormatInfo(format=ExportFormat.TSX, category="code", label="React (TSX)", extension=".tsx"),
    FormatInfo(format=ExportFormat.FRAMER_MOTION, category="code", label="Framer Motion", extension=".tsx"),
    FormatInfo(format=ExportFormat.GSAP, category="code", label="GSAP", extension=".js"),
    FormatInfo(format=ExportFormat.MOTION_ONE, category="code", label="Motion One", extension=".js"),
    FormatInfo(format=ExportFormat.ANIME_JS, category="code", label="Anime.js", extension=".js"),
    FormatInfo(format=ExportFormat.WEB_ANIMATION_API, category="code", label="Web Animation API", extension=".js",
               notes="Zero dependencies."),
    FormatInfo(format=ExportFormat.THREE_JS, category="code", label="Three.js", extension=".js"),
    FormatInfo(format=ExportFormat.TAILWIND, category="code", label="Tailwind CSS", extension=".tsx"),
    FormatInfo(format=ExportFormat.STYLED_COMPONENTS, category="code", label="styled-components", extension=".tsx"),

    FormatInfo(format=ExportFormat.SVG_SMIL, category="specialized", label="SVG (SMIL)", extension=".svg"),
    FormatInfo(format=ExportFormat.SVG_CSS, category="specialized", label="SVG (CSS-driven)", extension=".svg"),
    FormatInfo(format=ExportFormat.SVG_JS, category="specialized", label="SVG (JS-driven)", extension=".svg"),
    FormatInfo(format=ExportFormat.LOTTIE, category="specialized", label="Lottie JSON", extension=".json"),
    FormatInfo(format=ExportFormat.RIVE, category="specialized", label="Rive bundle", extension=".zip",
               notes="True .riv binary can't be generated programmatically; ships a Lottie + state-machine bundle for manual import into the Rive editor."),
    FormatInfo(format=ExportFormat.SPRITE_SHEET_PNG, category="specialized", label="Sprite Sheet (PNG)", extension=".png"),
    FormatInfo(format=ExportFormat.SPRITE_SHEET_JSON, category="specialized", label="Sprite Sheet (JSON + PNG)", extension=".json"),
]
