"""
PDF processing helpers for Tekla "onderdelen POSNR" drawings.

Pure functions — no database access.  Imported by LaserplannerService.

Dependencies (add to requirements.txt):
    pymupdf>=1.24.0
    pypdf>=4.3.0

NOTE: pdfplumber was removed.  It hangs indefinitely on Tekla cover pages
(dense vector graphics) and is 100-300× slower than PyMuPDF for text
extraction on Tekla drawing pages.  PyMuPDF (fitz) handles both text
extraction and thumbnail rendering, so pdfplumber is no longer needed.
"""

import re
import io
import base64
import logging
from typing import Optional

import fitz          # PyMuPDF — text extraction + thumbnail generation
from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Posnr regex
# Matches: [P61]  [Kd60]  [V1]  [P363 - 1]
# Capture group 1 returns the inner text without brackets: "P61", "Kd60", etc.
# ---------------------------------------------------------------------------
POSNR_RE = re.compile(r'\[([A-Z][a-z]?\d+(?:\s*-\s*\d+)?)\]')


def extract_posnr_from_page(fitz_page: "fitz.Page") -> Optional[str]:
    """
    Extract the Posnr string from a PyMuPDF (fitz) page object.

    Uses fitz.Page.get_text() which is orders of magnitude faster than
    pdfplumber on Tekla vector drawings and does not hang on complex cover
    pages.

    Returns the matched value without brackets, e.g. "P61".
    Returns None for cover pages or pages without a recognisable Posnr.
    """
    text = fitz_page.get_text()
    matches = POSNR_RE.findall(text)
    return matches[0] if matches else None


def extract_page_bytes(reader: "PdfReader", page_index: int) -> bytes:
    """
    Extract a single page from an already-opened PdfReader and return it as bytes.

    Accepts a PdfReader so the caller can reuse a single reader across multiple
    pages, avoiding the O(n²) cost of re-parsing the source PDF for every page.
    """
    writer = PdfWriter()
    writer.add_page(reader.pages[page_index])
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def generate_thumbnail(page_pdf_bytes: bytes, max_px: int = 200) -> str:
    """
    Render the Posnr field of a Tekla drawing page as a base64-encoded PNG.

    Crops tightly to the Posnr identifier in the bottom-right title block
    (approx. x 0.898-0.963, y 0.951-0.989 relative).  The resulting thumbnail
    shows only the Posnr text, large and readable even at small UI sizes.

    Uses PyMuPDF (fitz) for high-quality rasterisation.  The cropped region is
    scaled so its longest dimension equals max_px.

    Returns the base64-encoded PNG as an ASCII string (no data: prefix).
    """
    doc = fitz.open(stream=page_pdf_bytes, filetype="pdf")
    page = doc[0]

    # Crop tightly around the Posnr field in the Tekla title block.
    # The Posnr text sits at relative position x: 0.908-0.953, y: 0.956-0.981
    # across all tested Tekla drawings.  Minimal padding is added to avoid
    # clipping the text while keeping the crop as tight as possible.
    rect = page.rect
    crop = fitz.Rect(
        rect.width * 0.898,   # left edge (posnr x0 ~0.908 minus padding)
        rect.height * 0.951,  # top edge  (posnr y0 ~0.956 minus padding)
        rect.width * 0.963,   # right edge (posnr x1 ~0.953 plus padding)
        rect.height * 0.989,  # bottom edge (posnr y1 ~0.981 plus padding)
    )

    scale = max_px / max(crop.width, crop.height)
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=crop)
    png = base64.b64encode(pix.tobytes("png")).decode("ascii")
    doc.close()
    return png


def process_pdf(
    pdf_bytes: bytes,
    job_posnrs: set,
    existing_posnr_keys: set,
) -> dict:
    """
    Process all pages of a PDF and return a preview suitable for the confirm step.

    Args:
        pdf_bytes:           Raw bytes of the uploaded PDF.
        job_posnrs:          Set of lowercase posnr values from the job's line items.
        existing_posnr_keys: Set of lowercase posnr_key values already stored for this job.

    Returns a dict::

        {
            "total_pages":   <int>,   # including skipped pages
            "skipped_count": <int>,   # pages without a recognisable Posnr
            "pages": [
                {
                    "page_number":    <int>,   # 1-based
                    "extracted_posnr": <str>,  # e.g. "P61" (no brackets)
                    "thumbnail_png":  <str>,   # base64 PNG
                    "match_status":   <str>,   # see below
                },
                ...
            ]
        }

    match_status values:
        "matched"        — posnr found in job's line items, no existing drawing
        "unmatched"      — posnr NOT found in job's line items
        "will_overwrite" — posnr found in job's line items AND an existing drawing exists
    """
    # Open the PDF once with PyMuPDF for text extraction.
    # fitz is used for both text extraction (fast, no hang on complex pages)
    # and thumbnail rendering, so pdfplumber is not needed at all.
    fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(fitz_doc)

    # Create the pypdf reader once so extract_page_bytes can reuse it for every
    # page without re-parsing the source PDF (avoids O(n²) behaviour on large files).
    reader = PdfReader(io.BytesIO(pdf_bytes))

    logger.info("PDF processing started: %d pages, %d job posnrs", total_pages, len(job_posnrs))

    pages = []
    try:
        for i, fitz_page in enumerate(fitz_doc):
            posnr = extract_posnr_from_page(fitz_page)
            if posnr is None:
                logger.debug("Page %d/%d — no posnr found (skipped)", i + 1, total_pages)
                continue  # cover page or unrecognised — skip

            posnr_lower = posnr.lower().strip()

            if posnr_lower in job_posnrs:
                status = "will_overwrite" if posnr_lower in existing_posnr_keys else "matched"
            else:
                status = "unmatched"

            logger.info("Page %d/%d — posnr=%s  status=%s", i + 1, total_pages, posnr, status)

            page_bytes = extract_page_bytes(reader, i)
            thumbnail = generate_thumbnail(page_bytes)

            pages.append({
                "page_number":     i + 1,
                "extracted_posnr": posnr,
                "thumbnail_png":   thumbnail,
                "match_status":    status,
            })
    finally:
        fitz_doc.close()

    skipped = total_pages - len(pages)
    logger.info(
        "PDF processing complete: %d saved, %d skipped (of %d total)",
        len(pages), skipped, total_pages,
    )
    return {
        "total_pages":   total_pages,
        "skipped_count": skipped,
        "pages":         pages,
    }
