"""
Utilities for containers app - PDF generation.
"""
import os
from datetime import datetime, date
from django.conf import settings
from django.template.loader import render_to_string
from .models import Container


def get_containers_at_date(target_date, date_field='created_at'):
    """
    Get all containers at a specific date based on date field.
    date_field can be 'created_at', 'date_arrivee_estimee', or 'date_arrivee_reelle'
    Returns a list of Container objects.
    """
    if date_field == 'created_at':
        containers = Container.objects.filter(created_at__date__lte=target_date)
    elif date_field == 'date_arrivee_estimee':
        containers = Container.objects.filter(date_arrivee_estimee__lte=target_date)
    elif date_field == 'date_arrivee_reelle':
        containers = Container.objects.filter(date_arrivee_reelle__lte=target_date)
    else:
        containers = Container.objects.filter(created_at__date__lte=target_date)
    
    return containers.select_related('validated_by').prefetch_related(
        'manifest_lines__product',
        'received_lines__product'
    ).order_by('-date_arrivee_estimee', '-created_at')


def generate_containers_pdf(target_date, date_field='created_at'):
    """
    Generate PDF for containers report at a specific date.
    Returns the file path relative to MEDIA_ROOT.
    Raises Exception if WeasyPrint is not available.
    """
    # Try to import WeasyPrint
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        WEASYPRINT_AVAILABLE = True
    except (ImportError, OSError) as e:
        WEASYPRINT_AVAILABLE = False
        WEASYPRINT_ERROR = str(e)
    
    if not WEASYPRINT_AVAILABLE:
        raise Exception(
            f"PDF generation is not available. WeasyPrint dependencies are missing. "
            f"Error: {WEASYPRINT_ERROR if 'WEASYPRINT_ERROR' in locals() else 'Unknown error'}"
        )
    
    # Ensure reports directory exists
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Get containers data
    containers = get_containers_at_date(target_date, date_field)
    
    # Calculate totals for each container
    containers_data = []
    for container in containers:
        from django.db.models import Sum
        total_prevue = container.manifest_lines.aggregate(total=Sum('qty_prevue'))['total'] or 0
        total_recue = container.received_lines.aggregate(total=Sum('qty_recue'))['total'] or 0
        containers_data.append({
            'container': container,
            'total_prevue': total_prevue,
            'total_recue': total_recue,
        })
    
    # Format date for filename
    date_str = target_date.strftime('%Y-%m-%d')
    filename = f"containers_{date_str}.pdf"
    filepath = os.path.join(reports_dir, filename)
    
    # Render HTML template
    html_content = render_to_string('containers/containers_report.html', {
        'containers_data': containers_data,
        'target_date': target_date,
        'date_str': date_str,
        'date_field': date_field,
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

