# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0008_remove_old_tva_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='tva_incluse',
            field=models.BooleanField(default=True, verbose_name='TVA incluse'),
        ),
    ]

