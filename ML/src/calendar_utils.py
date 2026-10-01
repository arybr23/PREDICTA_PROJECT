"""Shared Indonesian / Hijri calendar helpers.

Mirrors the calendar logic used by generate_mock_data.py so that training data
and live predictions agree on what counts as a weekend or a holiday.
"""

from datetime import datetime

from hijridate import Hijri, Gregorian

# Indonesian national holidays (month, day) — fixed Gregorian dates.
ID_HOLIDAYS_GREGORIAN = [
    (1, 1),    # Tahun Baru
    (5, 1),    # Hari Buruh
    (5, 20),   # Kenaikan Isa Almasih (approx)
    (6, 1),    # Hari Lahir Pancasila
    (6, 27),   # Idul Adha (approx, varies)
    (8, 17),   # HUT RI
    (12, 25),  # Natal
]

HIJRI_MONTH_NAMES = {
    1: "Muharram", 2: "Safar", 3: "Rabi al-Awwal", 4: "Rabi al-Thani",
    5: "Jumada al-Ula", 6: "Jumada al-Thani", 7: "Rajab", 8: "Syaban",
    9: "Ramadan", 10: "Syawal", 11: "Dzulkaidah", 12: "Dzulhijjah",
}

WEEKDAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
]


def gregorian_to_hijri(dt):
    """Convert a Gregorian date/datetime to a hijridate.Hijri object."""
    return Gregorian(dt.year, dt.month, dt.day).to_hijri()


def get_indonesian_holidays(year, hijri_year):
    """Return a set of (month, day) tuples covering Gregorian + Islamic holidays."""
    holidays = set(ID_HOLIDAYS_GREGORIAN)

    # Islamic holidays move through the Gregorian calendar; approximate them by
    # converting the relevant Hijri date for the (Hijri) year in question.
    for hijri_month, hijri_day in [(10, 1), (12, 10), (1, 1)]:
        try:
            g = Hijri(hijri_year, hijri_month, hijri_day).to_gregorian()
            holidays.add((g.month, g.day))
        except Exception:
            pass

    return holidays


def build_calendar_context(dt):
    """Return the calendar feature bundle for a given Gregorian date."""
    hijri = gregorian_to_hijri(dt)
    holidays = get_indonesian_holidays(dt.year, hijri.year)
    is_holiday = (dt.month, dt.day) in holidays
    is_weekend = dt.weekday() >= 5

    return {
        "date": dt.strftime("%Y-%m-%d"),
        "date.weekday": dt.weekday(),
        "date.day": dt.day,
        "date.month": dt.month,
        "date.year": dt.year,
        "date.is_weekend": int(is_weekend),
        "is_holiday": int(is_holiday),
        "hijri_year": hijri.year,
        "hijri_month": hijri.month,
        "hijri_day": hijri.day,
        "hijri_date": f"{hijri.year}-{hijri.month:02d}-{hijri.day:02d}",
        "hijri_month_name": HIJRI_MONTH_NAMES.get(hijri.month, ""),
        "weekday_name": WEEKDAY_NAMES[dt.weekday()],
    }


def parse_date(value):
    """Parse YYYY-MM-DD (or ISO datetime) into a datetime, else None."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except ValueError:
        return None
