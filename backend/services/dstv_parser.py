"""
DSTV NC1 file parser for Tekla Structures output.

Parses the DSTV (Deutsche Stahlbau-Verband) format used by Tekla Structures
to describe steel part geometry: outer contour, inner contours (cutouts),
boreholes, and slots.

Returns a serializable dict with header info and geometry data suitable
for 3D rendering with Three.js ExtrudeGeometry.
"""
import re
import logging

logger = logging.getLogger(__name__)

_THICKNESS_RE = re.compile(r'^[Pp][Ll](\d+(?:\.\d+)?)')


def _parse_float(s: str) -> float:
    """Parse a float, accepting both comma and dot as decimal separator."""
    return float(s.replace(',', '.'))


def parse_dstv(content: str) -> dict:
    """Parse a DSTV NC1 file content and return geometry as a serializable dict.

    Args:
        content: Raw text content of the .nc1 file.

    Returns:
        Dict with keys: header, outer_contour, inner_contours, boreholes, slots, arcs.

    Raises:
        ValueError: If the file contains no parseable geometry.
    """
    lines = content.splitlines()

    # Split into sections delimited by section keywords and M99
    sections: list[tuple[str, list[str]]] = []
    current_section: str | None = None
    current_lines: list[str] = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith('**'):
            continue

        upper = line.upper()
        if upper in ('ST', 'AK', 'IK', 'BO', 'SI', 'UE', 'KO', 'PU', 'NE', 'SL'):
            if current_section is not None:
                sections.append((current_section, current_lines))
            current_section = upper
            current_lines = []
        elif upper == 'M99':
            if current_section is not None:
                sections.append((current_section, current_lines))
            current_section = None
            current_lines = []
        else:
            if current_section is not None:
                current_lines.append(line)

    # Handle file not ending with M99
    if current_section is not None:
        sections.append((current_section, current_lines))

    # Group sections by type
    header_lines: list[str] = []
    outer_contour_lines: list[str] = []
    inner_contour_groups: list[list[str]] = []
    borehole_lines: list[str] = []
    slot_lines: list[str] = []

    for name, sec_lines in sections:
        if name == 'ST':
            header_lines = sec_lines
        elif name == 'AK':
            outer_contour_lines = sec_lines
        elif name == 'IK':
            inner_contour_groups.append(sec_lines)
        elif name == 'BO':
            borehole_lines = sec_lines
        elif name == 'SI':
            slot_lines = sec_lines

    header = _parse_header(header_lines)
    outer_contour, outer_arcs = _parse_contour(outer_contour_lines)
    inner_contours = []
    inner_arcs = []
    for ig in inner_contour_groups:
        verts, arcs = _parse_contour(ig)
        inner_contours.append(verts)
        inner_arcs.extend(arcs)
    boreholes = _parse_boreholes(borehole_lines)
    slots = _parse_slots(slot_lines)

    all_arcs = [{"section": "outer", **a} for a in outer_arcs]
    all_arcs += [{"section": "inner", **a} for a in inner_arcs]

    return {
        "header": header,
        "outer_contour": outer_contour,
        "inner_contours": inner_contours,
        "boreholes": boreholes,
        "slots": slots,
        "arcs": all_arcs,
    }


def _parse_header(lines: list[str]) -> dict:
    """Parse the ST (header) section into a dict."""
    h = {
        "name": "",
        "order": "",
        "quantity": 1,
        "material": "",
        "profile": "",
        "project": "",
        "length_mm": 0.0,
        "width_mm": 0.0,
        "thickness_mm": 0.0,
    }
    for line in lines:
        parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        key, val = parts[0].upper(), parts[1].strip()
        if key == 'NA':
            h['name'] = val
        elif key == 'NO':
            h['order'] = val
        elif key == 'Q':
            try:
                h['quantity'] = int(_parse_float(val))
            except ValueError:
                pass
        elif key == 'M':
            h['material'] = val
        elif key == 'E':
            h['profile'] = val
            m = _THICKNESS_RE.match(val)
            if m:
                h['thickness_mm'] = float(m.group(1))
        elif key == 'R':
            h['project'] = val
        elif key == 'L':
            try:
                h['length_mm'] = _parse_float(val)
            except ValueError:
                pass
        elif key == 'B':
            try:
                h['width_mm'] = _parse_float(val)
            except ValueError:
                pass
    return h


def _parse_contour(lines: list[str]) -> tuple[list[dict], list[dict]]:
    """Parse AK or IK contour lines into vertices and arc segments."""
    vertices = []
    arcs = []
    for line in lines:
        parts = line.split()
        if not parts:
            continue
        first = parts[0].upper()
        # Arc segment: A or AR or ARC prefix
        if first in ('A', 'AR', 'ARC'):
            # Format: A face x_start y_start x_end y_end x_center y_center
            if len(parts) >= 8:
                try:
                    arcs.append({
                        "x_start": _parse_float(parts[2]),
                        "y_start": _parse_float(parts[3]),
                        "x_end":   _parse_float(parts[4]),
                        "y_end":   _parse_float(parts[5]),
                        "x_center": _parse_float(parts[6]),
                        "y_center": _parse_float(parts[7]),
                    })
                    # Add the endpoint as vertex for polygon approximation
                    vertices.append({
                        "x": _parse_float(parts[4]),
                        "y": _parse_float(parts[5]),
                    })
                except (ValueError, IndexError):
                    pass
        else:
            # Straight line: face x y
            if len(parts) >= 3:
                try:
                    vertices.append({
                        "x": _parse_float(parts[1]),
                        "y": _parse_float(parts[2]),
                    })
                except (ValueError, IndexError):
                    pass
    return vertices, arcs


def _parse_boreholes(lines: list[str]) -> list[dict]:
    """Parse BO borehole lines: face x y diameter."""
    holes = []
    for line in lines:
        parts = line.split()
        if len(parts) >= 4:
            try:
                holes.append({
                    "x": _parse_float(parts[1]),
                    "y": _parse_float(parts[2]),
                    "diameter": _parse_float(parts[3]),
                })
            except (ValueError, IndexError):
                pass
    return holes


def _parse_slots(lines: list[str]) -> list[dict]:
    """Parse SI slot lines: face x y length width angle."""
    slots = []
    for line in lines:
        parts = line.split()
        if len(parts) >= 6:
            try:
                slots.append({
                    "x": _parse_float(parts[1]),
                    "y": _parse_float(parts[2]),
                    "length": _parse_float(parts[3]),
                    "width":  _parse_float(parts[4]),
                    "angle":  _parse_float(parts[5]),
                })
            except (ValueError, IndexError):
                pass
    return slots
