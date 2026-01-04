# Remove old fournisseur CharField and rename fournisseur_client to fournisseur

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('stock', '0005_migrate_fournisseur_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='purchase',
            name='fournisseur',
        ),
        migrations.RenameField(
            model_name='purchase',
            old_name='fournisseur_client',
            new_name='fournisseur',
        ),
    ]

