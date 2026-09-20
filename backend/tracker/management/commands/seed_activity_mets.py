from django.core.management.base import BaseCommand

from tracker.models import ActivityMET

# Source: Compendium of Physical Activities, Ainsworth et al., 2024 update - general/
# moderate-effort value per activity for Stage 1 simplicity (see tdee-calculation-spec.md
# at the repo root); intensity variants can be added later via Django admin.
ACTIVITY_METS = {
    "Walking (moderate pace)": 3.5,
    "Walking (brisk)": 4.3,
    "Jogging": 7.0,
    "Running (10 min/mile)": 9.8,
    "Running (8 min/mile)": 11.5,
    "Cycling (leisure)": 5.8,
    "Cycling (moderate, 12-14 mph)": 8.0,
    "Cycling (vigorous, 16-19 mph)": 12.0,
    "Swimming (moderate)": 5.8,
    "Swimming (vigorous laps)": 9.8,
    "Tennis (singles)": 8.0,
    "Tennis (doubles)": 6.0,
    "Basketball (game)": 8.0,
    "Basketball (shooting around)": 5.0,
    "Soccer (casual)": 7.0,
    "Soccer (competitive)": 10.0,
    "Volleyball": 4.0,
    "Badminton": 5.5,
    "Table tennis": 4.0,
    "Squash": 7.3,
    "Racquetball": 7.0,
    "Golf (walking, carrying clubs)": 4.5,
    "Golf (cart)": 3.5,
    "Bowling": 3.0,
    "Hiking (general)": 6.0,
    "Hiking (with pack)": 7.8,
    "Rock climbing": 8.0,
    "Yoga": 3.0,
    "Pilates": 3.0,
    "Weightlifting (moderate effort)": 3.5,
    "Weightlifting (vigorous effort)": 6.0,
    "CrossFit / HIIT": 8.0,
    "Circuit training": 4.3,
    "Rowing machine (moderate)": 4.8,
    "Rowing machine (vigorous)": 8.5,
    "Elliptical trainer": 5.0,
    "Stair climbing machine": 8.8,
    "Jump rope": 10.0,
    "Dancing (general)": 5.0,
    "Zumba": 6.8,
    "Ballet": 5.0,
    "Martial arts (general)": 10.3,
    "Boxing (sparring)": 12.3,
    "Boxing (punching bag)": 7.0,
    "Kickboxing": 10.0,
    "Downhill skiing (moderate)": 6.0,
    "Cross-country skiing": 9.0,
    "Snowboarding": 5.3,
    "Ice skating": 7.0,
    "Roller skating / blading": 7.5,
    "Kayaking / canoeing": 5.0,
    "Horseback riding": 5.5,
}


class Command(BaseCommand):
    help = "Seed the ActivityMET reference table used by tracker.services.calculate_tdee."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for name, met_value in ACTIVITY_METS.items():
            _, created = ActivityMET.objects.update_or_create(name=name, defaults={"met_value": met_value})
            created_count += created
            updated_count += not created

        self.stdout.write(
            self.style.SUCCESS(f"Seeded ActivityMETs: {created_count} created, {updated_count} updated.")
        )
