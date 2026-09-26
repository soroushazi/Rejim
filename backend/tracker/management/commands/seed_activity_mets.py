from django.core.management.base import BaseCommand

from tracker.models import ActivityMET

# Source: Compendium of Physical Activities, Ainsworth et al., 2024 update - general/
# moderate-effort MET value per activity for Stage 1 simplicity (see
# tdee-calculation-spec.md at the repo root); intensity variants can be added later via
# Django admin.
#
# steps_per_minute (None = doesn't generate steps) is a judgment-call estimate of each
# activity's walking/running-gait cadence, used by calculate_tdee's Tier 2 to subtract
# the steps a logged instance of it would have contributed to that day's step count -
# see the Tier 2 note in tdee-calculation-spec.md. Only activities with an actual
# footfall/walking-style gait a wearable's accelerometer would register as steps get a
# value; machine-based (cycling, rowing machine, elliptical, stair climber), water/
# wheeled/gliding (swimming, skiing, skating, kayaking), seated (horseback riding), and
# static/floor (yoga, pilates, weightlifting) activities don't. Genuinely borderline
# calls (basketball shooting around, boxing on a bag, ballet, table tennis, ...) are
# resolved conservatively; corrections go through Django admin, same as met_value.
ACTIVITY_METS = {
    "Walking (moderate pace)": (3.5, 110),
    "Walking (brisk)": (4.3, 120),
    "Jogging": (7.0, 150),
    "Running (10 min/mile)": (9.8, 160),
    "Running (8 min/mile)": (11.5, 170),
    "Cycling (leisure)": (5.8, None),
    "Cycling (moderate, 12-14 mph)": (8.0, None),
    "Cycling (vigorous, 16-19 mph)": (12.0, None),
    "Swimming (moderate)": (5.8, None),
    "Swimming (vigorous laps)": (9.8, None),
    "Tennis (singles)": (8.0, 100),
    "Tennis (doubles)": (6.0, 70),
    "Basketball (game)": (8.0, 110),
    "Basketball (shooting around)": (5.0, None),
    "Soccer (casual)": (7.0, 100),
    "Soccer (competitive)": (10.0, 130),
    "Volleyball": (4.0, None),
    "Badminton": (5.5, 90),
    "Table tennis": (4.0, None),
    "Squash": (7.3, 140),
    "Racquetball": (7.0, 140),
    "Golf (walking, carrying clubs)": (4.5, 80),
    "Golf (cart)": (3.5, None),
    "Bowling": (3.0, None),
    "Hiking (general)": (6.0, 100),
    "Hiking (with pack)": (7.8, 95),
    "Rock climbing": (8.0, None),
    "Yoga": (3.0, None),
    "Pilates": (3.0, None),
    "Weightlifting (moderate effort)": (3.5, None),
    "Weightlifting (vigorous effort)": (6.0, None),
    "CrossFit / HIIT": (8.0, None),
    "Circuit training": (4.3, None),
    "Rowing machine (moderate)": (4.8, None),
    "Rowing machine (vigorous)": (8.5, None),
    "Elliptical trainer": (5.0, None),
    "Stair climbing machine": (8.8, None),
    "Jump rope": (10.0, 130),
    "Dancing (general)": (5.0, 80),
    "Zumba": (6.8, 90),
    "Ballet": (5.0, 60),
    "Martial arts (general)": (10.3, 90),
    "Boxing (sparring)": (12.3, 70),
    "Boxing (punching bag)": (7.0, None),
    "Kickboxing": (10.0, 90),
    "Downhill skiing (moderate)": (6.0, None),
    "Cross-country skiing": (9.0, None),
    "Snowboarding": (5.3, None),
    "Ice skating": (7.0, None),
    "Roller skating / blading": (7.5, None),
    "Kayaking / canoeing": (5.0, None),
    "Horseback riding": (5.5, None),
}


class Command(BaseCommand):
    help = "Seed the ActivityMET reference table used by tracker.services.calculate_tdee."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for name, (met_value, steps_per_minute) in ACTIVITY_METS.items():
            _, created = ActivityMET.objects.update_or_create(
                name=name, defaults={"met_value": met_value, "steps_per_minute": steps_per_minute}
            )
            created_count += created
            updated_count += not created

        self.stdout.write(
            self.style.SUCCESS(f"Seeded ActivityMETs: {created_count} created, {updated_count} updated.")
        )
