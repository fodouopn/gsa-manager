"""
Utilities for stock app - PDF generation.
"""
import os
from datetime import datetime, date
from django.conf import settings
from django.template.loader import render_to_string
from django.db.models import Sum
from .models import StockMovement
from apps.catalog.models import Product

# Try to import WeasyPrint, but make it optional
try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_ERROR = str(e)


def get_stock_at_date(target_date):
    """
    Calculate stock for all products at a specific date.
    Returns a list of dicts: [{'product': Product, 'stock': int}, ...]
    """
    products = Product.objects.filter(actif=True)
    stock_data = []
    
    for product in products:
        # Get all movements up to and including the target date
        movements = StockMovement.objects.filter(
            product=product,
            created_at__date__lte=target_date
        )
        stock = movements.aggregate(total=Sum('qty_signee'))['total'] or 0
        stock_data.append({
            'product': product,
            'stock': stock
        })
    
    return stock_data


def generate_stock_pdf(target_date):
    """
    Generate PDF for stock report at a specific date.
    Returns the file path relative to MEDIA_ROOT.
    Raises Exception if WeasyPrint is not available.
    """
    if not WEASYPRINT_AVAILABLE:
        raise Exception(
            f"PDF generation is not available. WeasyPrint dependencies are missing. "
            f"Error: {WEASYPRINT_ERROR if 'WEASYPRINT_ERROR' in globals() else 'Unknown error'}"
        )
    
    # Ensure reports directory exists
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Get company settings for logo and general info
    from apps.billing.models import CompanySettings
    company_settings = CompanySettings.get_settings()
    logo_url = None
    if company_settings.logo:
        logo_path = os.path.join(settings.MEDIA_ROOT, company_settings.logo.name)
        if os.path.exists(logo_path):
            logo_url = f"file://{logo_path}"
    
    # Get stock data
    stock_data = get_stock_at_date(target_date)
    
    # Calculate summary statistics
    total_products = len(stock_data)
    low_stock_count = sum(1 for item in stock_data if item['stock'] > 0 and item['stock'] <= (item['product'].seuil_stock or 0))
    out_of_stock_count = sum(1 for item in stock_data if item['stock'] == 0)
    
    stock_summary = {
        'total_products': total_products,
        'low_stock_count': low_stock_count,
        'out_of_stock_count': out_of_stock_count,
    }
    
    # Format date for filename
    date_str = target_date.strftime('%Y-%m-%d')
    filename = f"stock_{date_str}.pdf"
    filepath = os.path.join(reports_dir, filename)
    
    # Render HTML template
    html_content = render_to_string('stock/stock_report.html', {
        'stock_data': stock_data,
        'stock_summary': stock_summary,
        'target_date': target_date,
        'date_str': date_str,
        'company': company_settings,
        'logo_url': logo_url,
    })
    
    # Generate PDF
    font_config = FontConfiguration()
    pdf_file = HTML(string=html_content)
    
    # Generate PDF
    pdf_file.write_pdf(
        target=filepath,
        font_config=font_config
    )
    
    # Return relative path
    relative_path = f"reports/{filename}"
    return relative_path

