# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0004_alter_product_unique_together_remove_product_marque'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='categorie',
            field=models.CharField(
                choices=[('BIERE', 'Bière'), ('JUS', 'Jus')],
                default='BIERE',
                max_length=10,
                verbose_name='Catégorie'
            ),
        ),
    ]

