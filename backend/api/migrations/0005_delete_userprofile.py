from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_userprofile"),
    ]

    operations = [
        migrations.DeleteModel(
            name="UserProfile",
        ),
    ]
