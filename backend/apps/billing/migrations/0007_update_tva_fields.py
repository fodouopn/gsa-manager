# Generated manually

from django.db import migrations, models
from django.db.models import F
import django.db.models.deletion


def migrate_company_settings(apps, schema_editor):
    """Migrate existing tva_taux to tva_biere, set tva_jus to 5.5%."""
    CompanySettings = apps.get_model('billing', 'CompanySettings')
    CompanySettings.objects.update(
        tva_biere=F('tva_taux'),
        tva_jus=5.50
    )


def migrate_invoices(apps, schema_editor):
    """Migrate existing tva to tva_biere for existing invoices."""
    Invoice = apps.get_model('billing', 'Invoice')
    Invoice.objects.update(
        tva_biere=F('tva'),
        tva_jus=0
    )


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0006_alter_payment_mode'),
    ]

    operations = [
        # Add new TVA fields to CompanySettings
        migrations.AddField(
            model_name='companysettings',
            name='tva_jus',
            field=models.DecimalField(decimal_places=2, default=5.50, max_digits=5, verbose_name='TVA Jus (%)'),
        ),
        migrations.AddField(
            model_name='companysettings',
            name='tva_biere',
            field=models.DecimalField(decimal_places=2, default=20.00, max_digits=5, verbose_name='TVA Bière (%)'),
        ),
        # Migrate existing tva_taux to tva_biere (assuming existing invoices use biere rate)
        # Set tva_jus to 5.5% default
        migrations.RunPython(
            code=migrate_company_settings,
            reverse_code=migrations.RunPython.noop,
        ),
        # Add new TVA fields to Invoice
        migrations.AddField(
            model_name='invoice',
            name='tva_jus',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='TVA Jus'),
        ),
        migrations.AddField(
            model_name='invoice',
            name='tva_biere',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='TVA Bière'),
        ),
        # Migrate existing tva to tva_biere for existing invoices
        migrations.RunPython(
            code=migrate_invoices,
            reverse_code=migrations.RunPython.noop,
        ),
        # Remove old tva_taux field (keep for now to avoid data loss, can be removed later)
        # migrations.RemoveField(
        #     model_name='companysettings',
        #     name='tva_taux',
        # ),
        # migrations.RemoveField(
        #     model_name='invoice',
        #     name='tva',
        # ),
    ]

