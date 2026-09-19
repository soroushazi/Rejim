"""One-time bulk import of a USDA FoodData Central full CSV dump (not the live API -
see usda_client.py for that) into the Food Bank. Postgres only: uses server-side COPY
into transient staging tables plus set-based SQL, since the real dump is millions of
rows (27M+ for food_nutrient.csv alone) - the ORM would take hours. See
USDA_API_SETUP_SPEC.md and CLAUDE.md's Diet Tracking section for the "USDA feeds our
DB, never called live" design this extends to full-catalog scale.

Usage (inside the backend container in production, or locally against a Postgres dev
DB): manage.py import_usda_bulk_csv --csv-dir /path/to/FoodData_Central_csv_<date>
"""

import csv
import time
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from nutrition.usda_nutrient_map import CALORIE_NUTRIENT_NUMBERS, NUTRIENT_NUMBER_TO_FIELD, REQUIRED_FIELDS

DATA_TYPES = ["foundation_food", "sr_legacy_food", "survey_fndds_food", "branded_food"]

REQUIRED_CSV_FILES = [
    "food.csv",
    "branded_food.csv",
    "food_nutrient.csv",
    "nutrient.csv",
    "food_portion.csv",
    "measure_unit.csv",
]

# (source CSV column -> cast) per staging table. Empty-string values become NULL for
# every column - simplifies the SQL downstream (no NULLIF noise) since "" and NULL mean
# the same "not provided" thing for every field we care about here.
INT = "int"
NUMERIC = "numeric"
TEXT = "text"

STAGING_TABLES = {
    "stg_food": {
        "csv_file": "food.csv",
        "columns": [("fdc_id", INT), ("data_type", TEXT), ("description", TEXT)],
    },
    "stg_branded_food": {
        "csv_file": "branded_food.csv",
        "columns": [
            ("fdc_id", INT),
            ("brand_owner", TEXT),
            ("brand_name", TEXT),
            ("gtin_upc", TEXT),
            ("serving_size", NUMERIC),
            ("serving_size_unit", TEXT),
            ("household_serving_fulltext", TEXT),
            ("market_country", TEXT),
            ("discontinued_date", TEXT),
        ],
    },
    "stg_nutrient": {
        "csv_file": "nutrient.csv",
        "columns": [("id", INT), ("nutrient_nbr", TEXT)],
    },
    "stg_food_nutrient": {
        "csv_file": "food_nutrient.csv",
        "columns": [("fdc_id", INT), ("nutrient_id", INT), ("amount", NUMERIC)],
    },
    "stg_food_portion": {
        "csv_file": "food_portion.csv",
        "columns": [
            ("fdc_id", INT),
            ("seq_num", INT),
            ("amount", NUMERIC),
            ("measure_unit_id", INT),
            ("portion_description", TEXT),
            ("modifier", TEXT),
            ("gram_weight", NUMERIC),
        ],
    },
    "stg_measure_unit": {
        "csv_file": "measure_unit.csv",
        "columns": [("id", INT), ("name", TEXT)],
    },
}

SQL_TYPE = {INT: "integer", NUMERIC: "numeric", TEXT: "text"}


def _cast(raw, kind):
    if raw is None or raw == "":
        return None
    if kind == INT:
        return int(raw)
    if kind == NUMERIC:
        try:
            return Decimal(raw)
        except InvalidOperation:
            return None
    return raw


class Command(BaseCommand):
    help = "Bulk-import a USDA FoodData Central CSV dump into the Food Bank (Postgres only, one-time/occasional)."

    def add_arguments(self, parser):
        parser.add_argument("--csv-dir", required=True, help="Path to the extracted FoodData_Central_csv_* folder.")
        parser.add_argument("--dry-run", action="store_true", help="Report counts only, write nothing.")
        parser.add_argument("--limit", type=int, default=None, help="Cap rows read per CSV file (for fast iteration).")
        parser.add_argument(
            "--data-types",
            default=None,
            help=f"Comma list of {', '.join(DATA_TYPES)} (default: all).",
        )

    def handle(self, *args, **options):
        if connection.vendor != "postgresql":
            raise CommandError("This command requires Postgres (staging tables + COPY) - not supported on SQLite.")

        csv_dir = Path(options["csv_dir"])
        if not csv_dir.is_dir():
            raise CommandError(f"{csv_dir} is not a directory.")
        for name in REQUIRED_CSV_FILES:
            if not (csv_dir / name).exists():
                raise CommandError(f"Missing {name} in {csv_dir}")

        data_types = DATA_TYPES
        if options["data_types"]:
            data_types = [dt.strip() for dt in options["data_types"].split(",")]
            unknown = set(data_types) - set(DATA_TYPES)
            if unknown:
                raise CommandError(f"Unknown data type(s): {', '.join(unknown)}. Choose from: {', '.join(DATA_TYPES)}")

        limit = options["limit"]
        dry_run = options["dry_run"]
        connection.ensure_connection()
        raw_conn = connection.connection  # underlying psycopg3 connection - COPY isn't exposed via the Django ORM

        try:
            self._create_staging_tables(raw_conn)
            self._load_staging_tables(raw_conn, csv_dir, limit)
            counts = self._transform_and_load(raw_conn, data_types, dry_run)
            raw_conn.commit()
        finally:
            self._drop_staging_tables(raw_conn)
            raw_conn.commit()

        self.stdout.write(self.style.SUCCESS(f"{'[DRY RUN] ' if dry_run else ''}Done."))
        for label, value in counts.items():
            self.stdout.write(f"  {label}: {value}")

    # -- staging --------------------------------------------------------------------

    def _create_staging_tables(self, raw_conn):
        with raw_conn.cursor() as cur:
            for table, spec in STAGING_TABLES.items():
                cur.execute(f"DROP TABLE IF EXISTS {table}")
                cols_sql = ", ".join(f"{col} {SQL_TYPE[kind]}" for col, kind in spec["columns"])
                cur.execute(f"CREATE UNLOGGED TABLE {table} ({cols_sql})")
        raw_conn.commit()

    def _drop_staging_tables(self, raw_conn):
        with raw_conn.cursor() as cur:
            for table in (*STAGING_TABLES, "eligible"):
                cur.execute(f"DROP TABLE IF EXISTS {table}")

    def _load_staging_tables(self, raw_conn, csv_dir, limit):
        for table, spec in STAGING_TABLES.items():
            path = csv_dir / spec["csv_file"]
            columns = spec["columns"]
            col_names = [c for c, _ in columns]
            started = time.monotonic()
            count = 0
            with path.open(newline="", encoding="utf-8") as f, raw_conn.cursor() as cur:
                reader = csv.reader(f)
                header = next(reader)
                positions = [header.index(name) for name in col_names]
                kinds = [kind for _, kind in columns]
                with cur.copy(f"COPY {table} ({', '.join(col_names)}) FROM STDIN") as copy:
                    for row in reader:
                        copy.write_row(tuple(_cast(row[pos], kind) for pos, kind in zip(positions, kinds)))
                        count += 1
                        if limit and count >= limit:
                            break
            raw_conn.commit()
            with raw_conn.cursor() as cur:
                cur.execute(f"CREATE INDEX ON {table} (fdc_id)" if "fdc_id" in col_names else f"CREATE INDEX ON {table} (id)")
            raw_conn.commit()
            elapsed = time.monotonic() - started
            self.stdout.write(f"Loaded {spec['csv_file']}: {count} rows ({elapsed:.1f}s)")

    # -- transform/load ---------------------------------------------------------------

    def _transform_and_load(self, raw_conn, data_types, dry_run):
        # FoodItem's nutrient fields are DecimalField(max_digits=7, decimal_places=2) -
        # max representable absolute value is 99999.99. USDA's Branded Foods data has a
        # real (if rare) rate of bad outlier entries (wrong units, data-entry typos) that
        # blow past that - e.g. a mislabeled micronutrient in the hundreds of thousands.
        # Excluding those from the pivot (rather than importing them or crashing the
        # whole batch) drops just that one bad value, not the food, unless the bad value
        # happened to be a required macro - then missing_required_fields catches it below.
        valid_range = "fn.amount >= 0 AND fn.amount < 100000"
        nutrient_filters = "\n".join(
            f"        MAX(fn.amount) FILTER (WHERE n.nutrient_nbr = '{number}' AND {valid_range}) AS {field},"
            for number, field in NUTRIENT_NUMBER_TO_FIELD.items()
        )
        calorie_coalesce = ", ".join(
            f"MAX(fn.amount) FILTER (WHERE n.nutrient_nbr = '{number}' AND {valid_range})"
            for number in CALORIE_NUTRIENT_NUMBERS
        )
        # calories_per_100g is checked separately (it's the COALESCE column, not a plain
        # nutrient_pivot field) - the other 3 required macros come straight from the map.
        required_checks = " AND ".join(f"np.{field} IS NOT NULL" for field in REQUIRED_FIELDS if field != "calories_per_100g")

        with raw_conn.cursor() as cur:
            cur.execute(f"""
                CREATE UNLOGGED TABLE eligible AS
                WITH nutrient_pivot AS (
                    SELECT
                        fn.fdc_id,
{nutrient_filters}
                        COALESCE({calorie_coalesce}) AS calories_per_100g
                    FROM stg_food_nutrient fn
                    JOIN stg_nutrient n ON fn.nutrient_id = n.id
                    GROUP BY fn.fdc_id
                )
                SELECT
                    f.fdc_id, f.data_type, f.description,
                    b.brand_owner, b.brand_name, b.gtin_upc,
                    b.serving_size, b.serving_size_unit, b.household_serving_fulltext,
                    {", ".join(f"np.{field}" for field in (*NUTRIENT_NUMBER_TO_FIELD.values(), "calories_per_100g"))}
                FROM stg_food f
                LEFT JOIN stg_branded_food b ON b.fdc_id = f.fdc_id
                JOIN nutrient_pivot np ON np.fdc_id = f.fdc_id
                WHERE f.data_type = ANY(%(data_types)s)
                  AND (f.data_type != 'branded_food' OR (
                        b.discontinued_date IS NULL
                        AND (b.market_country IS NULL OR b.market_country IN ('United States', 'US'))
                  ))
                  AND {required_checks}
                  AND np.calories_per_100g IS NOT NULL
            """, {"data_types": data_types})

            cur.execute("ALTER TABLE eligible ADD COLUMN resolved_barcode text")
            cur.execute("""
                WITH ranked AS (
                    SELECT fdc_id, gtin_upc, ROW_NUMBER() OVER (PARTITION BY gtin_upc ORDER BY fdc_id) AS rn
                    FROM eligible WHERE gtin_upc IS NOT NULL
                )
                UPDATE eligible e SET resolved_barcode = e.gtin_upc
                FROM ranked r WHERE r.fdc_id = e.fdc_id AND r.rn = 1
            """)
            cur.execute("SELECT COUNT(*) FROM eligible")
            (eligible_count,) = cur.fetchone()
            cur.execute("SELECT COUNT(DISTINCT gtin_upc) FROM eligible WHERE gtin_upc IS NOT NULL")
            (barcode_owners,) = cur.fetchone()
            cur.execute("SELECT COUNT(*) FROM eligible WHERE gtin_upc IS NOT NULL AND resolved_barcode IS NULL")
            (barcode_collisions_dropped,) = cur.fetchone()

            if dry_run:
                counts = {
                    "would import/update": eligible_count,
                    "distinct barcodes claimed": barcode_owners,
                    "barcode collisions dropped (kept NULL)": barcode_collisions_dropped,
                }
                return counts

            nutrient_field_list = ", ".join(NUTRIENT_NUMBER_TO_FIELD.values())
            cur.execute(f"""
                CREATE TEMP TABLE imported_map AS
                WITH ins AS (
                    INSERT INTO nutrition_fooditem (
                        name, brand_name, barcode, fdc_id, source, kind, visibility, approval_status,
                        calories_per_100g, {nutrient_field_list}
                    )
                    SELECT
                        COALESCE(LEFT(e.description, 255), 'USDA food ' || e.fdc_id::text),
                        LEFT(COALESCE(NULLIF(e.brand_name, ''), e.brand_owner, ''), 255),
                        CASE WHEN LENGTH(e.resolved_barcode) <= 64 THEN e.resolved_barcode END,
                        e.fdc_id, 'usda', 'single', 'public', 'approved',
                        e.calories_per_100g, {", ".join(f"e.{f}" for f in NUTRIENT_NUMBER_TO_FIELD.values())}
                    FROM eligible e
                    ON CONFLICT (fdc_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        brand_name = EXCLUDED.brand_name,
                        barcode = EXCLUDED.barcode,
                        calories_per_100g = EXCLUDED.calories_per_100g,
                        {", ".join(f"{f} = EXCLUDED.{f}" for f in NUTRIENT_NUMBER_TO_FIELD.values())}
                    RETURNING id AS food_item_id, fdc_id
                )
                SELECT * FROM ins
            """)
            cur.execute("CREATE INDEX ON imported_map (fdc_id)")
            cur.execute("SELECT COUNT(*) FROM imported_map")
            (imported_count,) = cur.fetchone()

            measure_counts = self._load_measures(cur)

        return {
            "food items created/updated": imported_count,
            "distinct barcodes claimed": barcode_owners,
            "barcode collisions dropped (kept NULL)": barcode_collisions_dropped,
            **measure_counts,
        }

    def _load_measures(self, cur):
        cur.execute("""
            DELETE FROM nutrition_fooditemmeasure
            WHERE food_item_id IN (SELECT food_item_id FROM imported_map)
        """)

        cur.execute("""
            CREATE TEMP TABLE portion_labeled AS
            SELECT
                fp.fdc_id,
                fp.seq_num,
                LEFT(COALESCE(
                    NULLIF(fp.portion_description, ''),
                    NULLIF(fp.modifier, ''),
                    CASE WHEN fp.measure_unit_id = 9999 THEN NULL ELSE mu.name END
                ), 50) AS label,
                (fp.gram_weight / NULLIF(fp.amount, 0)) AS grams_per_unit
            FROM stg_food_portion fp
            JOIN stg_measure_unit mu ON mu.id = fp.measure_unit_id
            JOIN imported_map im ON im.fdc_id = fp.fdc_id
            WHERE fp.gram_weight IS NOT NULL
        """)
        cur.execute("""
            CREATE TEMP TABLE portion_deduped AS
            SELECT DISTINCT ON (fdc_id, label) fdc_id, label, grams_per_unit, seq_num
            FROM portion_labeled
            -- Same DecimalField(7,2) overflow guard as the nutrient pivot above -
            -- FoodItemMeasure.grams_per_unit has the same 99999.99 ceiling.
            WHERE label IS NOT NULL AND grams_per_unit IS NOT NULL
              AND grams_per_unit >= 0 AND grams_per_unit < 100000
            ORDER BY fdc_id, label, seq_num
        """)
        cur.execute("""
            CREATE TEMP TABLE portion_ranked AS
            SELECT fdc_id, label, grams_per_unit,
                   ROW_NUMBER() OVER (PARTITION BY fdc_id ORDER BY seq_num) = 1 AS is_default
            FROM portion_deduped
        """)

        cur.execute("""
            INSERT INTO nutrition_fooditemmeasure (food_item_id, label, grams_per_unit, is_default)
            SELECT im.food_item_id, pr.label, pr.grams_per_unit, pr.is_default
            FROM portion_ranked pr
            JOIN imported_map im ON im.fdc_id = pr.fdc_id
        """)
        cur.execute("SELECT COUNT(*) FROM portion_ranked")
        (from_portions,) = cur.fetchone()

        # Branded items with zero usable portion measures: synthesize one from their
        # own serving_size (g/ml only - not worth a full unit-conversion table for the
        # rare fl-oz-only case).
        cur.execute("""
            INSERT INTO nutrition_fooditemmeasure (food_item_id, label, grams_per_unit, is_default)
            SELECT
                im.food_item_id,
                LEFT(COALESCE(NULLIF(b.household_serving_fulltext, ''), b.serving_size::text || ' ' || b.serving_size_unit), 50),
                b.serving_size,
                TRUE
            FROM stg_branded_food b
            JOIN imported_map im ON im.fdc_id = b.fdc_id
            WHERE b.serving_size IS NOT NULL
              AND b.serving_size_unit IN ('g', 'ml')
              AND b.serving_size >= 0 AND b.serving_size < 100000
              AND b.fdc_id NOT IN (SELECT fdc_id FROM portion_ranked)
        """)
        cur.execute("""
            SELECT COUNT(*) FROM nutrition_fooditemmeasure
            WHERE food_item_id IN (SELECT food_item_id FROM imported_map)
        """)
        (total_measures,) = cur.fetchone()

        for table in ("portion_labeled", "portion_deduped", "portion_ranked"):
            cur.execute(f"DROP TABLE IF EXISTS {table}")

        return {
            "measures from food_portion.csv": from_portions,
            "measures total (incl. synthesized)": total_measures,
        }
