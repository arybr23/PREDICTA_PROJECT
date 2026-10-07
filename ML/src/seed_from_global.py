"""Seed a store's dataset from the shared mock history, shifted to end today.

Usage:
    python seed_from_global.py --store STR-4418 [--date 2026-10-05] [--menu /tmp/menu.json]
    python seed_from_global.py --store STR-4418 --dry-run

Reads ML/data/raw/historical_sales.csv (the 720-day x 25-product mock history),
projects it onto the store dataset columns (date, item_id, item_name,
units_sold, stockout) and slides every date forward by whole days so the LAST
day equals --date (default: today). Values are untouched — only the calendar
moves, so the seeded history never has a gap before today.

Menu alignment
--------------
When --menu points at the store's menu JSON, matched rows take both their
item_id and item_name from the menu entry — matched by code first, then by
name (case-insensitive), the same convention import_sales.py uses. Which side
wins is decided by the caller: it writes the menu file after applying the
user's choices, and a full align to that file implements either choice
("replace menu" already changed the menu; "replace in dataset" leaves it, so
the dataset follows it here).

Rows with no menu match keep their original values and are still written:
this is a full copy of the global history; unresolved pairs are reported as
`unmatched_items` instead of being dropped. A dry run should be called WITHOUT
--menu so the caller can classify the raw global products against the menu
itself.

Prints one JSON object on stdout; diagnostics go to stderr.
"""

import argparse
import json
import os
import re
from datetime import datetime

import pandas as pd

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

from store_paths import GLOBAL_HISTORY, dataset_path, sanitize_store_id  # noqa: E402
from import_sales import fail, parse_stockout, write_dataset  # noqa: E402

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_menu(path):
    """Code/name lookup tables for one store's menu: by id, by lower id, by lower name."""
    by_id, by_id_ci, by_name = {}, {}, {}
    with open(path, encoding="utf-8") as handle:
        menu = json.load(handle)
    for item in menu.get("items", []):
        item_id = str(item.get("itemId") or "").strip()
        name = str(item.get("name") or "").strip()
        if not item_id:
            continue
        entry = {"itemId": item_id, "name": name}
        by_id[item_id] = entry
        by_id_ci[item_id.lower()] = entry
        if name:
            by_name[name.lower()] = entry
    return by_id, by_id_ci, by_name


def main():
    parser = argparse.ArgumentParser(description="Seed a store dataset from the global mock history")
    parser.add_argument("--store", required=True, help="Store id the rows belong to")
    parser.add_argument("--date", default=None,
                        help="YYYY-MM-DD the seeded history should end on (default: today)")
    parser.add_argument("--menu", default=None,
                        help='JSON file: {"items":[{"itemId","name"}]}')
    parser.add_argument("--dry-run", action="store_true",
                        help="Report the plan without writing the dataset")
    args = parser.parse_args()

    try:
        store_id = sanitize_store_id(args.store)
    except ValueError as exc:
        fail(str(exc))

    if not os.path.exists(GLOBAL_HISTORY):
        fail(f"Global history not found: {GLOBAL_HISTORY}")

    target_text = args.date or datetime.now().strftime("%Y-%m-%d")
    if not DATE_RE.match(target_text):
        fail(f"--date must be YYYY-MM-DD, got '{target_text}'")
    try:
        target = datetime.strptime(target_text, "%Y-%m-%d")
    except ValueError:
        fail(f"--date is not a real date: '{target_text}'")

    frame = pd.read_csv(GLOBAL_HISTORY)
    if frame.empty:
        fail("Global history has no rows")

    needed = {"date", "item_id", "item_name", "units_sold"}
    missing = needed - set(frame.columns)
    if missing:
        fail(f"Global history is missing columns: {', '.join(sorted(missing))}")
    stockout_col = "stockout" if "stockout" in frame.columns else (
        "stockout_flag" if "stockout_flag" in frame.columns else None
    )

    rows_read = len(frame)
    frame["_date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["_units"] = pd.to_numeric(frame["units_sold"], errors="coerce")
    bad = frame["_date"].isna() | frame["_units"].isna()
    problems = []
    if int(bad.sum()):
        problems.append({"reason": "unreadable date or quantity", "count": int(bad.sum())})
    frame = frame[~bad]
    if frame.empty:
        fail("Global history has no readable rows")

    # ---- Slide the calendar so the last day is the target -------------------
    last = frame["_date"].max().to_pydatetime()
    shift_days = int((target - last).days)
    frame["_date"] = frame["_date"] + pd.Timedelta(days=shift_days)

    # ---- Align to the store's menu (optional) -------------------------------
    by_id, by_id_ci, by_name = ({}, {}, {})
    menu_supplied = bool(args.menu and os.path.exists(args.menu))
    if menu_supplied:
        by_id, by_id_ci, by_name = load_menu(args.menu)

    cols = ["_date", "item_id", "item_name", "_units"]
    if stockout_col:
        cols.append(stockout_col)

    rows = {}
    unmatched = {}
    reconciled = {}
    skipped_no_id = 0

    for rec in frame[cols].to_dict("records"):
        date = rec["_date"].strftime("%Y-%m-%d")
        raw_id = str(rec.get("item_id") or "").strip()
        raw_name = str(rec.get("item_name") or "").strip()

        entry = None
        if menu_supplied:
            entry = by_id.get(raw_id) or by_id_ci.get(raw_id.lower()) or by_name.get(raw_name.lower())

        if entry:
            resolved_id = entry["itemId"]
            resolved_name = entry["name"] or raw_name
            if resolved_id != raw_id or resolved_name != raw_name:
                reconciled.setdefault(
                    f"{raw_id}|{raw_name}",
                    {"item_id": raw_id, "item_name": raw_name,
                     "menu_id": resolved_id, "menu_name": resolved_name},
                )
        else:
            resolved_id, resolved_name = raw_id, raw_name
            if menu_supplied:
                unmatched.setdefault(
                    f"{raw_id}|{raw_name}",
                    {"item_id": raw_id, "item_name": raw_name},
                )

        if not resolved_id:
            skipped_no_id += 1
            continue

        rows[f"{date}::{resolved_id}"] = {
            "date": date,
            "item_id": resolved_id,
            "item_name": resolved_name or resolved_id,
            "units_sold": int(rec["_units"]),
            "stockout": parse_stockout(rec.get(stockout_col)) if stockout_col else 0,
        }

    if not rows:
        fail("No rows could be seeded", rows_read=rows_read, problems=problems)

    dates = {r["date"] for r in rows.values()}
    items = sorted({(r["item_id"], r["item_name"]) for r in rows.values()}, key=lambda p: p[0])

    out_path = None
    if not args.dry_run:
        out_path = dataset_path(store_id)
        write_dataset(out_path, rows)

    output = {
        "status": "success",
        "store_id": store_id,
        "source": os.path.basename(GLOBAL_HISTORY),
        "rows_read": rows_read,
        "rows_imported": len(rows),
        "rows_updated_existing": 0,
        "rows_skipped": int(rows_read - len(frame)) + skipped_no_id,
        "unmatched_items": [f"{u['item_id']} {u['item_name']}" for u in list(unmatched.values())[:20]],
        "unmatched_count": len(unmatched),
        "reconciled": list(reconciled.values()),
        "reconciled_count": len(reconciled),
        "problems": problems[:20],
        "ambiguous_dates": 0,
        "date_from": min(dates) if dates else None,
        "date_to": max(dates) if dates else None,
        "days_imported": len(dates),
        "dataset": {"file": out_path, "rows": len(rows), "days": len(dates)},
        "dry_run": bool(args.dry_run),
        "shift_days": shift_days,
        "target_date": target_text,
        "menu_supplied": menu_supplied,
        "items": [{"item_id": i, "item_name": n} for i, n in items],
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
