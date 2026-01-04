# Generated manually

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_alter_product_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='seuil_stock',
            field=models.PositiveIntegerField(
                default=10,
                validators=[django.core.validators.MinValueValidator(0)],
                verbose_name='Seuil de stock'
            ),
        ),
    ]

