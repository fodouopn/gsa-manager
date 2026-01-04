"""
Utilities for billing app - PDF generation and invoice acceptance.
"""
import os
import secrets
import hashlib
from django.conf import settings
from django.template.loader import render_to_string
from .models import Invoice

# Try to import WeasyPrint, but make it optional
try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_ERROR = str(e)


def generate_invoice_pdf(invoice):
    """
    Generate PDF for an invoice.
    Returns the file path relative to MEDIA_ROOT.
    Raises Exception if WeasyPrint is not available.
    """
    if not WEASYPRINT_AVAILABLE:
        raise Exception(
            f"PDF generation is not available. WeasyPrint dependencies are missing. "
            f"Error: {WEASYPRINT_ERROR if 'WEASYPRINT_ERROR' in globals() else 'Unknown error'}"
        )
    
    # Ensure invoices directory exists
    invoices_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
    os.makedirs(invoices_dir, exist_ok=True)
    
    # Get company settings
    from .models import CompanySettings
    company_settings = CompanySettings.get_settings()
    
    # Ensure invoice totals are up to date (recalculate if needed)
    invoice.calculate_totals()
    
    # Build logo URL if exists (WeasyPrint needs file:// URL)
    logo_url = None
    if company_settings.logo:
        logo_path = os.path.join(settings.MEDIA_ROOT, company_settings.logo.name)
        if os.path.exists(logo_path):
            logo_url = f"file://{logo_path}"
    
    # Calculate due date (14 days from validation or creation)
    from datetime import timedelta
    if invoice.validated_at:
        due_date = invoice.validated_at + timedelta(days=14)
    else:
        due_date = invoice.created_at + timedelta(days=14)
    
    # Render HTML template
    try:
        html_content = render_to_string('billing/invoice_template.html', {
            'invoice': invoice,
            'lines': invoice.invoice_lines.select_related('product').all(),
            'payments': invoice.payments.all(),
            'company': company_settings,
            'logo_url': logo_url,
            'due_date': due_date,
        })
    except Exception as e:
        raise Exception(f"Error rendering invoice template: {str(e)}")
    
    # Generate PDF
    try:
        font_config = FontConfiguration()
        pdf_file = HTML(string=html_content)
    except Exception as e:
        raise Exception(f"Error creating HTML object for PDF: {str(e)}")
    
    # File path - use invoice number or ID as fallback
    invoice_number = invoice.numero or f"Brouillon-{invoice.id}"
    filename = f"{invoice_number}.pdf"
    filepath = os.path.join(invoices_dir, filename)
    
    # Generate PDF - use target parameter instead of positional argument
    try:
        pdf_file.write_pdf(
            target=filepath,
            font_config=font_config
        )
    except Exception as e:
        # Clean up if file was partially created
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        raise Exception(f"Error writing PDF file: {str(e)}")
    
    # Return relative path
    relative_path = f"invoices/{filename}"
    return relative_path


def get_invoice_pdf_path(invoice):
    """Get the full path to invoice PDF."""
    if not invoice.pdf_path:
        return None
    return os.path.join(settings.MEDIA_ROOT, invoice.pdf_path)


def generate_acceptance_token():
    """Generate a secure token for invoice acceptance."""
    return secrets.token_urlsafe(32)


def hash_token(token):
    """Hash a token using SHA-256."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def verify_token(token, token_hash):
    """Verify if a token matches its hash."""
    return hash_token(token) == token_hash


def calculate_pdf_hash(pdf_path):
    """Calculate SHA-256 hash of a PDF file."""
    sha256_hash = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def get_client_ip(request):
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
