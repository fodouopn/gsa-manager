# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0007_update_tva_fields'),
    ]

    operations = [
        # Remove old tva_taux field from CompanySettings
        migrations.RemoveField(
            model_name='companysettings',
            name='tva_taux',
        ),
        # Remove old tva field from Invoice
        migrations.RemoveField(
            model_name='invoice',
            name='tva',
        ),
    ]

