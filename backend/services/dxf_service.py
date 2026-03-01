"""
DXF parsing and SVG thumbnail generation for laser plate contours.

Handles the classic DXF format produced by laser cutting software:
  - POLYLINE / VERTEX entities on the CONTOUR_OUTER layer
  - Bulge values (group code 42) for arc segments
  - TEXT entities on MARK_PARTS / MARK_TEXT layers (metadata, not rendered)

Bulge convention (DXF):
  bulge = tan(included_angle / 4)
  positive bulge → counter-clockwise arc
  zero bulge → straight line segment

SVG coordinate system note:
  DXF uses Y-up; SVG uses Y-down.  We flip Y during normalisation so
  that the part appears upright in the browser.
"""

import math
import re
from typing import List, Optional, Tuple


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_VERTICES = 100_000  # Cap to prevent memory exhaustion from malformed DXF files

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

Vertex = Tuple[float, float, float]   # (x, y, bulge)


# ---------------------------------------------------------------------------
# DXF parser
# ---------------------------------------------------------------------------

def _iter_groups(dxf_text: str):
    """Yield (group_code: int, value: str) pairs from a DXF text."""
    lines = dxf_text.splitlines()
    i = 0
    while i + 1 < len(lines):
        code_line = lines[i].strip()
        value_line = lines[i + 1].strip()
        try:
            yield int(code_line), value_line
        except ValueError:
            pass
        i += 2


def parse_contour(dxf_text: str) -> List[Vertex]:
    """
    Extract vertices from the CONTOUR_OUTER POLYLINE in a DXF file.

    Returns a list of (x, y, bulge) tuples.  The list represents a
    closed polygon / curve; the caller should connect the last vertex
    back to the first.

    If no CONTOUR_OUTER polyline is found an empty list is returned.
    """
    groups = list(_iter_groups(dxf_text))

    # State machine
    in_entities = False
    in_polyline = False
    on_contour_layer = False
    reading_vertex = False

    pending_x: Optional[float] = None
    pending_y: Optional[float] = None
    pending_bulge: float = 0.0

    vertices: List[Vertex] = []

    i = 0
    while i < len(groups):
        code, value = groups[i]

        # ── SECTION / TABLE tracking ──
        if code == 0 and value == 'SECTION':
            i += 1
            if i < len(groups):
                _, section_name = groups[i]
                in_entities = (section_name == 'ENTITIES')
            i += 1
            continue

        if code == 0 and value == 'ENDSEC':
            in_entities = False
            in_polyline = False
            on_contour_layer = False
            i += 1
            continue

        if not in_entities:
            i += 1
            continue

        # ── Entity type ──
        if code == 0:
            entity_type = value

            # Flush pending vertex (VERTEX entities accumulate per field)
            if reading_vertex and pending_x is not None and pending_y is not None:
                if on_contour_layer:
                    vertices.append((pending_x, pending_y, pending_bulge))
                    if len(vertices) >= MAX_VERTICES:
                        return vertices  # Cap reached — stop to prevent memory exhaustion
            pending_x = None
            pending_y = None
            pending_bulge = 0.0

            if entity_type == 'POLYLINE':
                in_polyline = True
                on_contour_layer = False
                reading_vertex = False
                vertices = []          # reset — last CONTOUR_OUTER wins
            elif entity_type == 'VERTEX' and in_polyline:
                reading_vertex = True
            elif entity_type == 'SEQEND':
                reading_vertex = False
                in_polyline = False
                # keep vertices — we may encounter another polyline later
            else:
                reading_vertex = False
                if entity_type not in ('POLYLINE', 'VERTEX', 'SEQEND'):
                    in_polyline = False

            i += 1
            continue

        # ── Layer name ──
        if code == 8:
            if in_polyline:
                on_contour_layer = (value == 'CONTOUR_OUTER')
            i += 1
            continue

        # ── Vertex coordinates / bulge ──
        if in_polyline and on_contour_layer and reading_vertex:
            try:
                if code == 10:
                    pending_x = float(value)
                elif code == 20:
                    pending_y = float(value)
                elif code == 42:
                    pending_bulge = float(value)
            except ValueError:
                pass

        i += 1

    # Flush the very last vertex if it was never closed by SEQEND
    if reading_vertex and on_contour_layer and pending_x is not None and pending_y is not None:
        vertices.append((pending_x, pending_y, pending_bulge))

    return vertices


# ---------------------------------------------------------------------------
# SVG path builder
# ---------------------------------------------------------------------------

def _arc_to_svg(x1: float, y1: float, x2: float, y2: float, bulge: float) -> str:
    """
    Return an SVG arc command from (x1,y1) to (x2,y2) given a DXF bulge.

    The bulge is the tangent of 1/4 of the included arc angle.
    Positive bulge → CCW arc in DXF (Y-up); after Y-flip for SVG (Y-down)
    that becomes a CW arc, i.e. sweep-flag = 1.
    """
    theta = 4.0 * math.atan(bulge)           # signed included angle
    chord = math.hypot(x2 - x1, y2 - y1)

    sin_half = math.sin(theta / 2.0)
    if abs(sin_half) < 1e-10 or chord < 1e-10:
        # Degenerate — treat as straight line
        return f"L {x2:.4f} {y2:.4f}"

    radius = abs(chord / (2.0 * sin_half))
    large_arc = 1 if abs(theta) > math.pi else 0
    # Positive DXF bulge = CCW = CW in flipped SVG coords → sweep = 1
    sweep = 1 if bulge > 0 else 0

    return f"A {radius:.4f} {radius:.4f} 0 {large_arc} {sweep} {x2:.4f} {y2:.4f}"


def generate_thumbnail_svg(
    vertices: List[Vertex],
    max_w: int = 80,
    max_h: int = 48,
) -> str:
    """
    Generate a compact inline SVG thumbnail from CONTOUR_OUTER vertices.

    The part is scaled proportionally to fit within max_w × max_h pixels,
    preserving aspect ratio.  Y is flipped so the part appears upright.

    Args:
        vertices: List of (x, y, bulge) tuples from parse_contour().
        max_w:    Maximum SVG width in pixels.
        max_h:    Maximum SVG height in pixels.

    Returns:
        An SVG string with no outer whitespace.
    """
    if not vertices:
        return _empty_svg(max_w, max_h)

    xs = [v[0] for v in vertices]
    ys = [v[1] for v in vertices]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    part_w = max_x - min_x
    part_h = max_y - min_y

    if part_w < 1e-6 or part_h < 1e-6:
        return _empty_svg(max_w, max_h)

    # Scale factor: fit within (max_w - 2*pad) × (max_h - 2*pad) with padding
    pad = 3
    scale = min((max_w - 2 * pad) / part_w, (max_h - 2 * pad) / part_h)
    svg_w = round(part_w * scale + 2 * pad, 2)
    svg_h = round(part_h * scale + 2 * pad, 2)

    def tx(x: float) -> float:
        """Transform DXF X → SVG X."""
        return (x - min_x) * scale + pad

    def ty(y: float) -> float:
        """Transform DXF Y → SVG Y (flip)."""
        return (max_y - y) * scale + pad

    # Build SVG path
    path_parts: List[str] = []
    n = len(vertices)

    for idx in range(n):
        x1, y1, bulge = vertices[idx]
        x2, y2, _ = vertices[(idx + 1) % n]

        sx1, sy1 = tx(x1), ty(y1)
        sx2, sy2 = tx(x2), ty(y2)

        if idx == 0:
            path_parts.append(f"M {sx1:.3f} {sy1:.3f}")

        if abs(bulge) > 1e-6:
            # Arc segment — compute in SVG space (Y already flipped)
            path_parts.append(_arc_to_svg(sx1, sy1, sx2, sy2, -bulge))  # negate for Y-flip
        else:
            path_parts.append(f"L {sx2:.3f} {sy2:.3f}")

    path_parts.append("Z")
    path_d = " ".join(path_parts)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{svg_w}" height="{svg_h}" '
        f'viewBox="0 0 {svg_w} {svg_h}">'
        f'<path d="{path_d}" fill="#1e293b" stroke="none"/>'
        f'</svg>'
    )


def _empty_svg(w: int, h: int) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">'
        f'<rect width="{w}" height="{h}" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4"/>'
        f'</svg>'
    )


# ---------------------------------------------------------------------------
# High-level helper
# ---------------------------------------------------------------------------

def process_dxf(dxf_text: str, max_w: int = 80, max_h: int = 48) -> str:
    """Parse a DXF text and return the thumbnail SVG string."""
    vertices = parse_contour(dxf_text)
    return generate_thumbnail_svg(vertices, max_w=max_w, max_h=max_h)
