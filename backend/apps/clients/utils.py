"""
Utilities for clients app - PDF generation.
"""
import os
from datetime import datetime, date
from django.conf import settings
from django.template.loader import render_to_string
from django.db.models import Sum, Q
from .models import Client
from apps.billing.models import Invoice, InvoiceStatus


def get_clients_with_dues_at_date(target_date):
    """
    Get all clients with their total due amounts at a specific date.
    Returns a list of dicts: [{'client': Client, 'total_due': Decimal}, ...]
    """
    clients = Client.objects.filter(actif=True)
    clients_data = []
    
    for client in clients:
        # Get all validated invoices with remaining balance up to target date
        invoices = Invoice.objects.filter(
            client=client,
            statut=InvoiceStatus.VALIDEE,
            reste__gt=0,
            validated_at__date__lte=target_date
        )
        total_due = invoices.aggregate(total=Sum('reste'))['total'] or 0
        
        if total_due > 0:
            clients_data.append({
                'client': client,
                'total_due': total_due,
                'unpaid_count': invoices.count()
            })
    
    # Sort by total_due descending
    clients_data.sort(key=lambda x: x['total_due'], reverse=True)
    
    return clients_data


# Try to import WeasyPrint, but make it optional
try:
    from weasyprint import HTML, CSS
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_ERROR = str(e)


def generate_clients_pdf(target_date):
    """
    Generate PDF for clients report with dues at a specific date.
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
    
    # Get clients data
    clients_data = get_clients_with_dues_at_date(target_date)
    
    # Calculate total
    total_due = sum(item['total_due'] for item in clients_data)
    
    # Format date for filename
    date_str = target_date.strftime('%Y-%m-%d')
    filename = f"clients_{date_str}.pdf"
    filepath = os.path.join(reports_dir, filename)
    
    # Render HTML template
    html_content = render_to_string('clients/clients_report.html', {
        'clients_data': clients_data,
        'target_date': target_date,
        'date_str': date_str,
        'total_due': total_due,
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


def generate_client_detail_pdf(client):
    """
    Generate PDF for client detail with invoices, payments, purchases, and financial summary.
    Returns the file path relative to MEDIA_ROOT.
    Raises Exception if WeasyPrint is not available.
    """
    if not WEASYPRINT_AVAILABLE:
        raise Exception(
            f"PDF generation is not available. WeasyPrint dependencies are missing. "
            f"Error: {WEASYPRINT_ERROR if 'WEASYPRINT_ERROR' in globals() else 'Unknown error'}"
        )
    
    from apps.billing.models import Invoice, InvoiceStatus, Payment, CompanySettings
    from apps.stock.models import Purchase, PurchaseStatus
    
    # Get company settings
    company = CompanySettings.get_settings()
    
    # Get logo URL for PDF generation
    logo_url = None
    if company.logo:
        try:
            logo_path = os.path.join(settings.MEDIA_ROOT, company.logo.name)
            if os.path.exists(logo_path):
                # Use file:// protocol for WeasyPrint
                logo_url = f"file://{logo_path}"
        except Exception as e:
            print(f"Error getting logo path: {e}")
    
    # Ensure reports directory exists
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Get all invoices for this client
    invoices = Invoice.objects.filter(client=client).order_by('-created_at')
    
    # Calculate invoice totals
    total_invoices = invoices.aggregate(total=Sum('total_ttc'))['total'] or 0
    total_paid = invoices.aggregate(total=Sum('paye'))['total'] or 0
    total_due = invoices.filter(statut=InvoiceStatus.VALIDEE, reste__gt=0).aggregate(total=Sum('reste'))['total'] or 0
    
    # Calculate excess payments on invoices
    excess_invoice_payments = 0
    for invoice in invoices.filter(statut__in=[InvoiceStatus.VALIDEE, InvoiceStatus.ACCEPTEE]):
        if float(invoice.paye) > float(invoice.total_ttc):
            excess_invoice_payments += (float(invoice.paye) - float(invoice.total_ttc))
    
    # Get avoirs
    avoirs = Invoice.objects.filter(client=client, statut=InvoiceStatus.AVOIR)
    total_avoirs = avoirs.aggregate(total=Sum('total_ttc'))['total'] or 0
    
    # Get all payments for this client's invoices
    payments = Payment.objects.filter(invoice__client=client).order_by('-date')
    
    # Calculate purchases (if client is also a supplier)
    purchases = Purchase.objects.filter(fournisseur=client, statut=PurchaseStatus.VALIDE)
    total_unpaid_purchases = 0
    excess_purchase_payments = 0
    for purchase in purchases:
        purchase_rest = float(purchase.reste)
        if purchase_rest > 0:
            total_unpaid_purchases += purchase_rest
        if float(purchase.paye) > float(purchase.total):
            excess_purchase_payments += (float(purchase.paye) - float(purchase.total))
    
    # Calculate total owed to client
    total_owed = float(total_avoirs) + excess_invoice_payments + float(total_unpaid_purchases) + float(excess_purchase_payments)
    
    # Format filename
    filename = f"client_{client.id}_{client.nom_complet.replace(' ', '_')}.pdf"
    filepath = os.path.join(reports_dir, filename)
    
    # Render HTML template
    html_content = render_to_string('clients/client_detail.html', {
        'company': company,
        'logo_url': logo_url,
        'client': client,
        'invoices': invoices,
        'payments': payments,
        'purchases': purchases,
        'avoirs': avoirs,
        'total_invoices': total_invoices,
        'total_paid': total_paid,
        'total_due': total_due,
        'total_owed': total_owed,
        'total_avoirs': total_avoirs,
        'excess_invoice_payments': excess_invoice_payments,
        'total_unpaid_purchases': total_unpaid_purchases,
        'excess_purchase_payments': excess_purchase_payments,
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

