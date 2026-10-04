"""Import a store's pre-existing sales history from a csv or Excel file.

Reads a file the user already has — a POS export, a spreadsheet, a hand-kept
log — works out which columns mean what, and merges the rows into the store's
own dataset (ML/salesHistory/<storeId>/datasets/<storeId>.csv) in the same format the checkout
publisher writes.

Usage:
    python import_sales.py --store STR-4418 --file /tmp/sales.xlsx --menu /tmp/menu.json
    python import_sales.py --store STR-4418 --file /tmp/sales.csv --sheet "September"
    python import_sales.py --store STR-4418 --file /tmp/sales.csv --dry-run

Prints one JSON object on stdout. Diagnostics go to stderr, so the API layer can
parse stdout directly.

Column detection
----------------
Headers are matched against alias lists (English and Indonesian), so a file
with `Tanggal, Kode Barang, Produk, Qty` works without renaming anything. If no
header row can be found, columns are read positionally: 3 columns are taken as
date, item_name, units_sold; 5 as date, item_id, item_name, units_sold,
stockout. Anything else is refused rather than guessed at.

Product matching
----------------
Rows are matched to the store's menu by `item_id` first, then by `item_name`
(case-insensitive). Anything that matches neither is reported back and NOT
written, so an import never silently invents or drops a product.
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timedelta

import pandas as pd

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

from store_paths import dataset_path  # noqa: E402

COLUMNS = ["date", "item_id", "item_name", "units_sold", "stockout"]

# Excel stores dates as days since 1899-12-30 (the 1900 leap-year bug included).
EXCEL_EPOCH = datetime(1899, 12, 30)
EXCEL_SERIAL_MIN = 20000  # ~1954
EXCEL_SERIAL_MAX = 60000  # ~2064

SUPPORTED = (".csv", ".txt", ".tsv", ".xlsx", ".xlsm")

# ---- Column aliases -------------------------------------------------------
# Lowercased, non-alphanumerics collapsed to underscores before matching.

ALIASES = {
    "date": {
        "date", "tanggal", "tgl", "datetime", "waktu", "time", "day",
        "sales_date", "transaction_date", "order_date", "period", "periode",
    },
    "item_id": {
        "item_id", "itemid", "id", "sku", "kode", "kode_barang", "product_id",
        "productid", "product_code", "item_code", "code", "barcode",
    },
    "item_name": {
        "item_name", "itemname", "name", "nama", "product", "produk",
        "product_name", "nama_produk", "item", "barang", "menu", "description",
        "deskripsi",
    },
    "units_sold": {
        "units_sold", "unitssold", "qty", "quantity", "units", "unit", "sold",
        "terjual", "jumlah", "jumlah_terjual", "total", "sales", "penjualan",
        "kuantitas", "volume", "count",
    },
    "stockout": {
        "stockout", "stock_out", "stockout_flag", "sold_out", "soldout",
        "habis", "kehabisan", "out_of_stock",
    },
}

TRUTHY = {"1", "true", "yes", "y", "ya", "t", "habis", "sold out", "soldout"}


def fail(message, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    print(json.dumps(payload))
    sys.exit(1)


def normalise_header(value):
    """Lowercase and collapse anything non-alphanumeric to a single underscore."""
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


# ---- Reading --------------------------------------------------------------

def read_table(path, sheet=None):
    """Return (DataFrame of strings with the header row included, sheet name)."""
    ext = os.path.splitext(path)[1].lower()

    if ext in (".csv", ".txt", ".tsv"):
        sep = "\t" if ext == ".tsv" else ","
        try:
            return pd.read_csv(path, header=None, dtype=str, keep_default_na=False, sep=sep), None
        except UnicodeDecodeError:
            return pd.read_csv(
                path, header=None, dtype=str, keep_default_na=False, sep=sep,
                encoding="latin-1",
            ), None

    if ext == ".xls":
        raise ValueError(
            "Legacy .xls files need the 'xlrd' package. Save the file as .xlsx "
            "or .csv and try again."
        )

    if ext in (".xlsx", ".xlsm"):
        try:
            book = pd.ExcelFile(path)
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                f"Reading Excel needs the 'openpyxl' package ({exc}). "
                "Run: ML/venv/bin/pip install openpyxl"
            )

        names = book.sheet_names
        if not names:
            raise ValueError("The workbook has no sheets")

        # A workbook usually has several tabs and the first is often a summary,
        # so the caller can name one; otherwise take the first.
        if sheet is None:
            chosen = names[0]
        elif isinstance(sheet, int) or (isinstance(sheet, str) and sheet.isdigit()):
            index = int(sheet)
            if index >= len(names):
                raise ValueError(
                    f"Sheet index {index} is out of range. The workbook has "
                    f"{len(names)} sheet(s): {', '.join(names)}"
                )
            chosen = names[index]
        else:
            chosen = str(sheet)
            if chosen not in names:
                raise ValueError(
                    f"Sheet '{chosen}' not found. Available: {', '.join(names)}"
                )

        return pd.read_excel(book, header=None, dtype=str, sheet_name=chosen), chosen

    raise ValueError(
        f"Unsupported file type '{ext}'. Supported: {', '.join(SUPPORTED)}"
    )


def resolve_columns(header):
    """Map our field names onto column indexes using the alias lists."""
    used = set()
    resolved = {}

    for field in ("date", "item_id", "item_name", "units_sold", "stockout"):
        aliases = ALIASES[field]
        found = None

        for i, cell in enumerate(header):
            if i in used:
                continue
            if cell in aliases:
                found = i
                break

        if found is None:
            for i, cell in enumerate(header):
                if i in used or not cell:
                    continue
                if any(len(a) >= 3 and a in cell for a in aliases):
                    found = i
                    break

        if found is not None:
            resolved[field] = found
            used.add(found)

    return resolved


def positional_columns(width):
    """Fall back to fixed positions when there is no usable header."""
    if width == 3:
        return {"date": 0, "item_name": 1, "units_sold": 2}
    if width == 5:
        return {"date": 0, "item_id": 1, "item_name": 2, "units_sold": 3, "stockout": 4}
    return None


# ---- Value parsing --------------------------------------------------------

DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y", "%m/%d/%Y")


def parse_date(raw):
    """Return (iso_date, ambiguous). ambiguous is True when D/M and M/D both fit."""
    text = str(raw or "").strip()
    if not text:
        return None, False

    # Excel serial number
    if re.fullmatch(r"\d{4,6}(\.\d+)?", text):
        number = float(text)
        if EXCEL_SERIAL_MIN <= number <= EXCEL_SERIAL_MAX:
            return (EXCEL_EPOCH + timedelta(days=number)).strftime("%Y-%m-%d"), False

    text = re.split(r"[ T]", text)[0]

    for fmt in DATE_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt)
        except ValueError:
            continue
        ambiguous = False
        if fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y"):
            # Both orderings valid only when the first two parts are <= 12.
            parts = re.split(r"[/\-.]", text)
            if len(parts) == 3 and all(p.isdigit() for p in parts[:2]):
                ambiguous = int(parts[0]) <= 12 and int(parts[1]) <= 12
        return parsed.strftime("%Y-%m-%d"), ambiguous

    return None, False


def parse_units(raw):
    """Integers with optional thousands separators. Returns None when unusable."""
    text = str(raw or "").strip()
    if not text:
        return 0
    text = re.sub(r"[^\d.,\-]", "", text)
    if not text:
        return None
    # 1.234 or 1,234 -> 1234 when the separator groups in threes
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", text):
        text = text.replace(".", "").replace(",", "")
    else:
        text = text.replace(",", ".")
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def parse_stockout(raw):
    return 1 if str(raw or "").strip().lower() in TRUTHY else 0


# ---- Dataset IO -----------------------------------------------------------

def escape_cell(value):
    text = "" if value is None else str(value)
    if any(ch in text for ch in ',\"\n\r'):
        return '"' + text.replace('"', '""') + '"'
    return text


def parse_csv_line(line):
    cells, current, quoted = [], "", False
    i = 0
    while i < len(line):
        ch = line[i]
        if quoted:
            if ch == '"':
                if i + 1 < len(line) and line[i + 1] == '"':
                    current += '"'
                    i += 1
                else:
                    quoted = False
            else:
                current += ch
        elif ch == '"':
            quoted = True
        elif ch == ",":
            cells.append(current)
            current = ""
        else:
            current += ch
        i += 1
    cells.append(current)
    return cells


def read_dataset(store_id):
    """Existing rows for this store, keyed date::item_id."""
    path = dataset_path(store_id)
    rows = {}
    if not os.path.exists(path):
        return rows, path

    with open(path, newline="", encoding="utf-8") as handle:
        lines = [line.rstrip("\n") for line in handle if line.strip()]
    if not lines:
        return rows, path

    start = 1 if lines[0].split(",")[0] == "date" else 0
    for line in lines[start:]:
        cells = parse_csv_line(line)
        cells += [""] * (len(COLUMNS) - len(cells))
        row = dict(zip(COLUMNS, cells[: len(COLUMNS)]))
        rows[f"{row['date']}::{row['item_id']}"] = row
    return rows, path


def write_dataset(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ordered = sorted(rows.values(), key=lambda r: (r["date"], r["item_id"]))
    body = [",".join(COLUMNS)]
    for row in ordered:
        body.append(
            ",".join(
                [
                    escape_cell(row["date"]),
                    escape_cell(row["item_id"]),
                    escape_cell(str(row["item_name"]).replace("\n", " ").replace("\r", " ")),
                    escape_cell(int(row["units_sold"])),
                    escape_cell(1 if row["stockout"] else 0),
                ]
            )
        )
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(body) + "\n")
    return len(ordered)


# ---- Main -----------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Import pre-existing sales history")
    parser.add_argument("--store", required=True, help="Store id the rows belong to")
    parser.add_argument("--file", required=True, help="Path to the uploaded csv/xlsx")
    parser.add_argument("--menu", default=None,
                        help="JSON file: {\"items\":[{\"itemId\",\"name\"}]}")
    parser.add_argument("--sheet", default=None, help="Excel sheet name or index")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and report without writing the dataset")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        fail(f"Uploaded file not found: {args.file}")

    store_id = re.sub(r"[^A-Za-z0-9_-]", "", str(args.store or "").strip())
    if not store_id:
        fail("store id is empty")

    # ---- the store's menu, used to resolve products ----------------------
    by_id, by_id_ci, by_name = {}, {}, {}
    if args.menu and os.path.exists(args.menu):
        with open(args.menu, encoding="utf-8") as handle:
            menu = json.load(handle)
        for item in menu.get("items", []):
            item_id = str(item.get("itemId") or "").strip()
            name = str(item.get("name") or "").strip()
            if item_id:
                by_id[item_id] = item_id
                by_id_ci[item_id.lower()] = item_id
            if name:
                by_name[name.lower()] = item_id or name

    # ---- read -------------------------------------------------------------
    try:
        frame, sheet_name = read_table(args.file, args.sheet)
    except (ValueError, ImportError) as exc:
        fail(str(exc))

    if frame.empty:
        fail("The uploaded file has no rows")

    raw = frame.values.tolist()
    width = len(raw[0]) if raw else 0

    header = None
    if raw and sum(1 for c in raw[0] if normalise_header(c) in
                   set().union(*ALIASES.values())) >= 2:
        header = [normalise_header(c) for c in raw[0]]
        data = raw[1:]
    else:
        data = raw

    if header is not None:
        columns = resolve_columns(header)
        detected = {f: (header[i] if i is not None else None) for f, i in columns.items()}
    else:
        columns = positional_columns(width)
        detected = {f: (f"column {i + 1}" if i is not None else None)
                    for f, i in (columns or {}).items()}

    if not columns:
        fail(
            f"Could not work out the columns. The file has {width} columns and no "
            "recognisable header. Expected at least a date column and a quantity "
            "column, or 3/5 columns in the default order.",
            columns_found=detected,
        )

    missing = [f for f in ("date", "units_sold") if f not in columns]
    if "item_id" not in columns and "item_name" not in columns:
        missing.append("item_id or item_name")
    if missing:
        fail(
            "Could not find: " + ", ".join(missing) + ". Rename the columns or "
            "use the default order.",
            columns_found=detected,
        )

    # ---- parse rows -------------------------------------------------------
    def cell(row, field):
        index = columns.get(field)
        if index is None or index >= len(row):
            return ""
        return row[index]

    existing, dataset_path = read_dataset(store_id)
    merged = dict(existing)

    rows_read = 0
    written = 0
    updated = 0
    problems = []
    unmatched = {}
    ambiguous_dates = 0
    dates = set()

    for offset, row in enumerate(data, start=2 if header is not None else 1):
        if not any(str(c).strip() for c in row):
            continue
        rows_read += 1

        date, ambiguous = parse_date(cell(row, "date"))
        if ambiguous:
            ambiguous_dates += 1
        if date is None:
            problems.append({"row": offset, "reason": "unreadable date",
                             "value": str(cell(row, "date"))[:40]})
            continue

        units = parse_units(cell(row, "units_sold"))
        if units is None:
            problems.append({"row": offset, "reason": "unreadable quantity",
                             "value": str(cell(row, "units_sold"))[:40]})
            continue
        if units < 0:
            problems.append({"row": offset, "reason": "negative quantity", "value": units})
            continue

        raw_id = str(cell(row, "item_id") or "").strip()
        raw_name = str(cell(row, "item_name") or "").strip()

        resolved_id = None
        if by_id or by_name:
            if raw_id and raw_id in by_id:
                resolved_id = by_id[raw_id]
            elif raw_id and raw_id.lower() in by_id_ci:
                resolved_id = by_id_ci[raw_id.lower()]
            elif raw_name and raw_name.lower() in by_name:
                resolved_id = by_name[raw_name.lower()]

        if not resolved_id:
            label = raw_name or raw_id or "(blank)"
            unmatched[label] = unmatched.get(label, 0) + 1
            continue

        key = f"{date}::{resolved_id}"
        if key in existing:
            updated += 1
        merged[key] = {
            "date": date,
            "item_id": resolved_id,
            "item_name": raw_name or resolved_id,
            "units_sold": units,
            "stockout": parse_stockout(cell(row, "stockout")),
        }
        written += 1
        dates.add(date)

    if not written:
        fail(
            "No rows could be imported",
            rows_read=rows_read,
            unmatched_items=sorted(unmatched)[:20],
            problems=problems[:20],
            hint="Check that the file's product names or codes match this store's menu",
        )

    total_rows = None
    if not args.dry_run:
        total_rows = write_dataset(dataset_path, merged)

    output = {
        "status": "success",
        "store_id": store_id,
        "file": os.path.basename(args.file),
        "sheet": sheet_name,
        "columns": detected,
        "rows_read": rows_read,
        "rows_imported": written,
        "rows_updated_existing": updated,
        "rows_skipped": len(problems) + sum(unmatched.values()),
        "unmatched_items": sorted(unmatched)[:20],
        "unmatched_count": len(unmatched),
        "problems": problems[:20],
        "ambiguous_dates": ambiguous_dates,
        "date_from": min(dates) if dates else None,
        "date_to": max(dates) if dates else None,
        "days_imported": len(dates),
        "dataset": {
            "file": dataset_path,
            "rows": total_rows if total_rows is not None else len(merged),
            "days": len({r["date"] for r in merged.values()}),
        },
        "dry_run": bool(args.dry_run),
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
