import fitz  # PyMuPDF

from app.core.config import settings


class PDFError(Exception):
    """`message` is user-safe."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def extract_pdf_text(data: bytes, filename: str, content_type: str | None) -> str:
    """Validate and extract text from an in-memory PDF. Nothing is written to disk, so there is
    nothing to clean up and the original file is never stored."""
    if not filename.lower().endswith(".pdf"):
        raise PDFError("Please upload a file with a .pdf extension.")
    if content_type not in ("application/pdf", "application/x-pdf", "application/octet-stream"):
        raise PDFError("The uploaded file is not a PDF.")
    if len(data) == 0:
        raise PDFError("The uploaded file is empty.")
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise PDFError(f"The file is too large. Maximum size is {settings.MAX_UPLOAD_MB} MB.", 413)
    if not data.lstrip()[:5] == b"%PDF-":
        raise PDFError("The uploaded file is not a valid PDF.")
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise PDFError("This PDF could not be opened. It may be corrupted.")
    try:
        if doc.needs_pass or doc.is_encrypted:
            raise PDFError("This PDF is password-protected. Please remove the password and try again.")
        if doc.page_count > settings.MAX_PDF_PAGES:
            raise PDFError(f"This PDF has {doc.page_count} pages. The maximum is {settings.MAX_PDF_PAGES}.")
        parts = []
        for page in doc:
            parts.append(page.get_text("text"))
        text = "\n".join(parts).strip()
    finally:
        doc.close()
    if len(text) < 100:
        raise PDFError("No readable text was found. The PDF may be scanned images; OCR is not supported yet.")
    return text
