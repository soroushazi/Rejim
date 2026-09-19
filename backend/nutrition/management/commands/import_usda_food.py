from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from nutrition.models import FoodItem
from nutrition.usda_client import (
    USDAClientError,
    get_food,
    missing_required_fields,
    parse_food_nutrients,
    search_foods,
)


class Command(BaseCommand):
    help = (
        "Pull one food from USDA FoodData Central into our own Food Bank. On-demand only - "
        "never run automatically or in response to a user action. See USDA_API_SETUP_SPEC.md."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "query", nargs="?", default=None, help="Free-text search, e.g. 'chicken breast raw'."
        )
        parser.add_argument("--fdc-id", type=int, default=None, help="Import this exact FDC id, skipping search.")
        parser.add_argument("--limit", type=int, default=5, help="Number of search results to show (default 5).")
        parser.add_argument(
            "--data-type",
            default=None,
            help="Comma-separated FDC dataType filter, e.g. 'Foundation,SR Legacy' to skip branded products.",
        )
        parser.add_argument("--name", default=None, help="Override the name saved to our Food Bank.")
        parser.add_argument(
            "--auto", action="store_true", help="Non-interactive: import the top search result without prompting."
        )
        parser.add_argument(
            "--yes", action="store_true", help="Skip the final confirmation prompt before saving."
        )

    def handle(self, *args, **options):
        api_key = settings.USDA_API_KEY
        if not api_key:
            raise CommandError(
                "USDA_API_KEY isn't set. Add it to the repo-root .env "
                "(see USDA_API_SETUP_SPEC.md) or export it in your shell."
            )

        fdc_id = options["fdc_id"]
        if fdc_id is None:
            fdc_id = self._resolve_fdc_id_from_search(options, api_key)

        try:
            detail = get_food(fdc_id, api_key)
        except USDAClientError as exc:
            raise CommandError(str(exc)) from exc

        fields = parse_food_nutrients(detail)
        missing = missing_required_fields(fields)
        if missing:
            raise CommandError(
                f"USDA food {fdc_id} ('{detail.get('description')}') is missing required "
                f"nutrient data for: {', '.join(missing)}. Not importing."
            )

        name = options["name"] or detail.get("description") or f"USDA food {fdc_id}"

        self.stdout.write(f"\n{name}  (fdc_id={fdc_id}, dataType={detail.get('dataType')})")
        for field, value in fields.items():
            self.stdout.write(f"  {field}: {value}")

        if not options["yes"] and not options["auto"]:
            confirm = input("\nSave this to the Food Bank? [y/N] ").strip().lower()
            if confirm != "y":
                self.stdout.write(self.style.WARNING("Cancelled."))
                return

        defaults = dict(fields)
        defaults["name"] = name
        defaults["source"] = FoodItem.Source.USDA
        defaults["visibility"] = FoodItem.Visibility.PUBLIC
        defaults["approval_status"] = FoodItem.ApprovalStatus.APPROVED
        food_item, created = FoodItem.objects.update_or_create(fdc_id=fdc_id, defaults=defaults)

        verb = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{verb} FoodItem #{food_item.id}: {food_item.name}"))

    def _resolve_fdc_id_from_search(self, options, api_key):
        query = options["query"]
        if not query:
            raise CommandError("Pass a search query, or --fdc-id to import a specific food directly.")

        data_types = [dt.strip() for dt in options["data_type"].split(",")] if options["data_type"] else None
        try:
            results = search_foods(query, api_key, page_size=options["limit"], data_types=data_types)
        except USDAClientError as exc:
            raise CommandError(str(exc)) from exc

        if not results:
            raise CommandError(f"No USDA results for '{query}'.")

        if options["auto"]:
            return results[0]["fdcId"]

        self.stdout.write(f"USDA results for '{query}':\n")
        for index, food in enumerate(results, start=1):
            brand = f" [{food['brandOwner']}]" if food.get("brandOwner") else ""
            self.stdout.write(
                f"  {index}. {food.get('description')}{brand}  "
                f"(fdc_id={food['fdcId']}, {food.get('dataType')})"
            )

        choice = input(f"\nPick a number to import (1-{len(results)}), or 'q' to cancel: ").strip().lower()
        if choice == "q":
            raise CommandError("Cancelled.")
        try:
            index = int(choice)
            if not 1 <= index <= len(results):
                raise ValueError
        except ValueError as exc:
            raise CommandError(f"'{choice}' isn't a valid choice.") from exc

        return results[index - 1]["fdcId"]
