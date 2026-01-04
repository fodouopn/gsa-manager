"""
Celery tasks for billing app - automatic reminders.
"""
from celery import shared_task
from django.utils import timezone
from datetime import date
from .models import Invoice, InvoiceStatus
from apps.audit.utils import create_audit_log
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_invoice_reminders():
    """
    Check for unpaid invoices with reminder date reached and send reminders.
    This task is called by Celery Beat.
    """
    today = date.today()
    
    # Find invoices that need reminders
    invoices = Invoice.objects.filter(
        statut=InvoiceStatus.VALIDEE,
        reste__gt=0,
        prochaine_date_relance__lte=today
    ).select_related('client')
    
    reminders_sent = 0
    
    for invoice in invoices:
        try:
            # Log reminder in audit
            create_audit_log(
                instance=invoice,
                action='REMINDER_SENT',
                user=None,  # System action
                after_data={
                    'invoice_numero': invoice.numero,
                    'reste': str(invoice.reste),
                    'reminder_date': str(invoice.prochaine_date_relance)
                },
                reason=f'Relance automatique facture {invoice.numero} - Reste: {invoice.reste} €'
            )
            
            # Here you could send email, SMS, etc.
            # For now, we just log it in audit
            
            logger.info(f"Reminder sent for invoice {invoice.numero} - Reste: {invoice.reste} €")
            reminders_sent += 1
            
        except Exception as e:
            logger.error(f"Error sending reminder for invoice {invoice.numero}: {str(e)}")
    
    logger.info(f"Reminder task completed. {reminders_sent} reminders sent.")
    return f"{reminders_sent} reminders sent"
