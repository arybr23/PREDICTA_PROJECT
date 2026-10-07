"""
FastAPI service that exposes the ML pipeline as HTTP endpoints.

Run locally:
    npm run ml:api          (from the repo root; ml:api:dev adds --reload)
    cd ML && ./venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 5001

Run on Modal (see ML/modal_app.py):
    npm run ml:seed && npm run ml:deploy

The Node.js backend (BE/services/python.js) calls these endpoints when
ML_API_URL points here, so the Python environment stays warm instead of being
imported afresh for every request. The backend still knows how to spawn the
scripts itself and falls back to that when this service is not running.

Contract: ML scripts print one JSON object on stdout. Whether it says
"status": "success" or "status": "error", it is returned as-is at HTTP 200 —
the caller in BE decides what the error means. Only a script that could not be
run to a usable answer (crash, traceback, timeout) produces a 500.

Security: when the ML_API_KEY env var is set (it comes from the Modal secret),
every request except /health must carry a matching X-ML-Key header — the
*.modal.run URL is otherwise public. Locally the variable is unset and nothing
is enforced.
"""

import json
import os
import subprocess
import sys
import tempfile
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ML_DIR, "src")
VENV_PYTHON = os.path.join(ML_DIR, "venv", "bin", "python")
SALES_HISTORY_ROOT = os.path.join(ML_DIR, "salesHistory")


def _resolve_python() -> str:
    if os.environ.get("PYTHON_BIN"):
        return os.environ["PYTHON_BIN"]
    if os.path.exists(VENV_PYTHON):
        return VENV_PYTHON
    # On Modal there is no venv: run the scripts with the very interpreter that
    # is serving this API, so they see the same installed packages.
    return sys.executable


PYTHON = _resolve_python()

DEFAULT_TIMEOUT = 60
TRAIN_TIMEOUT = 180

# ---------------------------------------------------------------------------
# Subprocess runner (same logic as the old node python.js)
# ---------------------------------------------------------------------------


class ScriptError(RuntimeError):
    """The script could not be run to a usable JSON answer (crash, timeout,
    unusable stdout). Distinct from a script *reported* error, which arrives as
    {"status": "error", ...} on stdout and is returned to the caller as-is."""


def _last_json_line(text: str) -> Optional[str]:
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    for ln in reversed(lines):
        if ln.startswith("{") and ln.endswith("}"):
            return ln
    return None


def _run_script(script: str, args: list[str], timeout: int = DEFAULT_TIMEOUT, stdin_data: Optional[str] = None) -> dict:
    cmd = [PYTHON, os.path.join(SRC_DIR, script), *args]
    proc = subprocess.Popen(
        cmd,
        cwd=ML_DIR,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        stdin=subprocess.PIPE if stdin_data else None,
        text=True,
    )

    try:
        stdout, stderr = proc.communicate(input=stdin_data, timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise ScriptError(f"Script '{script}' timed out after {timeout}s")

    line = _last_json_line(stdout)
    if not line:
        raise ScriptError(
            f"Script '{script}' produced no JSON (exit {proc.returncode})",
            detail=(stderr.strip() or stdout.strip())[-2000:],
        )

    try:
        parsed = json.loads(line)
    except json.JSONDecodeError as exc:
        raise ScriptError(f"Invalid JSON from '{script}': {exc}", detail=stdout.strip()[-2000:])

    # A script-reported error ({'status': 'error', 'message': ..., extras})
    # keeps its full payload and goes back to the caller at HTTP 200, exactly
    # as the subprocess bridge would hand it over. The Node side turns it into
    # an Error carrying .message and .payload, which is what the routes match
    # on (the NOT_READY patterns) and what /sales/import reports back.
    return parsed


# ---------------------------------------------------------------------------
# File helpers (mirror node python.js logic in Python)
# ---------------------------------------------------------------------------


def _safe_store_id(store_id: str) -> str:
    return "".join(ch for ch in str(store_id or "").strip() if ch.isalnum() or ch in "_-").strip()


def _store_history_path(store_id: str) -> Optional[str]:
    sid = _safe_store_id(store_id)
    if not sid:
        return None
    return os.path.join(SALES_HISTORY_ROOT, sid, "raw", "historical_sales.csv")


def _dataset_path(store_id: str) -> Optional[str]:
    sid = _safe_store_id(store_id)
    if not sid:
        return None
    return os.path.join(SALES_HISTORY_ROOT, sid, "datasets", f"{sid}.csv")


def _materialise_json(content: str) -> str:
    """Write an inline JSON payload (sent over HTTP) to a temp file the scripts
    can read through their usual --menu/--weather path flags."""
    handle = tempfile.NamedTemporaryFile(
        "w", suffix=".json", delete=False, encoding="utf-8"
    )
    with handle:
        handle.write(content)
    return handle.name


def _unlink_quiet(path: Optional[str]) -> None:
    if not path:
        return
    try:
        os.unlink(path)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    storeId: Optional[str] = None
    date: Optional[str] = None
    weather: Optional[str] = None
    temperature: Optional[float] = None
    model: Optional[str] = None


class BenchmarkRequest(BaseModel):
    days: int = 30
    model: Optional[str] = None
    storeId: Optional[str] = None


class AppendLogRequest(BaseModel):
    storeId: Optional[str] = None
    payload: dict


class TrainRequest(BaseModel):
    storeId: Optional[str] = None
    tailDays: Optional[int] = None
    rounds: Optional[int] = None


class ImportRequest(BaseModel):
    storeId: str
    file: str
    menuFile: Optional[str] = None
    sheet: Optional[str] = None
    dryRun: bool = False


class RebuildRequest(BaseModel):
    storeId: str
    weatherFile: Optional[str] = None
    menuFile: Optional[str] = None
    # The Node bridge sends the sidecar content itself when it runs in HTTP
    # mode: its temp files live on the API host, not in this container.
    weatherJson: Optional[str] = None
    menuJson: Optional[str] = None
    skipFeatures: bool = False


class SeedRequest(BaseModel):
    storeId: str
    date: Optional[str] = None
    menuJson: Optional[str] = None
    dryRun: bool = False


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="PREDICTA ML API", version="1.0.0")

API_KEY = os.environ.get("ML_API_KEY", "").strip()


@app.middleware("http")
async def require_api_key(request, call_next):
    if API_KEY and request.url.path != "/health":
        if request.headers.get("x-ml-key", "") != API_KEY:
            return JSONResponse(
                status_code=401,
                content={"status": "error", "message": "Missing or invalid X-ML-Key header"},
            )
    return await call_next(request)


@app.exception_handler(ScriptError)
def script_error_handler(request, exc: ScriptError):
    body = {"status": "error", "message": str(exc)}
    if getattr(exc, "detail", None):
        body["detail"] = exc.detail
    return JSONResponse(status_code=500, content=body)


@app.exception_handler(Exception)
def unhandled_error_handler(request, exc: Exception):
    # Always answer with JSON so the Node bridge can read the reason out of the
    # body instead of the bare "Internal Server Error" text.
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": str(exc) or exc.__class__.__name__},
    )


@app.get("/health")
def health():
    return {"status": "ok", "python": PYTHON, "ml_dir": ML_DIR}


@app.get("/info")
def info():
    return {
        "python": PYTHON,
        "ml_dir": ML_DIR,
        "venv": os.path.exists(VENV_PYTHON),
    }


@app.post("/predict")
def predict(req: PredictRequest):
    args = []
    if req.storeId:
        args += ["--store", req.storeId]
    if req.model:
        args += ["--model", req.model]
    if req.date:
        args += ["--date", req.date]
    if req.weather:
        args += ["--weather", req.weather]
    if req.temperature is not None:
        args += ["--temperature", str(req.temperature)]
    return _run_script("predict.py", args)


@app.post("/benchmark")
def benchmark(req: BenchmarkRequest):
    args = ["--days", str(req.days)]
    if req.model:
        args += ["--model", req.model]
    if req.storeId:
        args += ["--store", req.storeId]
    return _run_script("benchmark.py", args, timeout=TRAIN_TIMEOUT)


@app.post("/append-log")
def append_log(req: AppendLogRequest):
    args = ["--store", req.storeId] if req.storeId else []
    return _run_script(
        "append_daily_log.py",
        args,
        timeout=TRAIN_TIMEOUT,
        stdin_data=json.dumps(req.payload),
    )


@app.post("/train")
def train(req: TrainRequest):
    args = []
    if req.storeId:
        args += ["--store", req.storeId]
    if req.tailDays is not None:
        args += ["--tail-days", str(req.tailDays)]
    if req.rounds is not None:
        args += ["--rounds", str(req.rounds)]
    return _run_script("incremental_train.py", args, timeout=TRAIN_TIMEOUT)


@app.post("/import-sales")
def import_sales(req: ImportRequest):
    args = ["--store", req.storeId, "--file", req.file]
    if req.menuFile:
        args += ["--menu", req.menuFile]
    if req.sheet:
        args += ["--sheet", req.sheet]
    if req.dryRun:
        args += ["--dry-run"]
    return _run_script("import_sales.py", args, timeout=TRAIN_TIMEOUT)


@app.post("/rebuild")
def rebuild(req: RebuildRequest):
    args = ["--store", req.storeId]
    temps: list[str] = []
    weather = req.weatherFile
    menu = req.menuFile
    # Inline content wins over a path: a path from the API host does not exist
    # inside this container, and a missing sidecar would be silently ignored.
    if req.weatherJson:
        weather = _materialise_json(req.weatherJson)
        temps.append(weather)
    if req.menuJson:
        menu = _materialise_json(req.menuJson)
        temps.append(menu)
    if weather:
        args += ["--weather", weather]
    if menu:
        args += ["--menu", menu]
    if req.skipFeatures:
        args += ["--skip-features"]
    try:
        return _run_script("rebuild_store_history.py", args, timeout=TRAIN_TIMEOUT)
    finally:
        for path in temps:
            _unlink_quiet(path)


@app.post("/seed-dataset")
def seed_dataset(req: SeedRequest):
    """Seed one store's dataset from the shared mock history (shifted to end
    on --date), optionally aligned to the store's menu passed as inline JSON."""
    args = ["--store", req.storeId]
    if req.date:
        args += ["--date", req.date]
    menu_path = None
    if req.menuJson:
        menu_path = _materialise_json(req.menuJson)
        args += ["--menu", menu_path]
    if req.dryRun:
        args += ["--dry-run"]
    try:
        return _run_script("seed_from_global.py", args, timeout=TRAIN_TIMEOUT)
    finally:
        _unlink_quiet(menu_path)


# ---------------------------------------------------------------------------
# Read-only file endpoints (implemented directly, no subprocess)
# ---------------------------------------------------------------------------

@app.get("/store-history-days/{store_id}")
def store_history_days(store_id: str):
    file = _store_history_path(store_id)
    if not file or not os.path.exists(file):
        return {"days": 0}

    with open(file, "r", encoding="utf-8") as fh:
        lines = fh.read().split("\n")

    if not lines:
        return {"days": 0}

    date_index = lines[0].split(",").index("date") if "date" in lines[0] else -1
    if date_index == -1:
        return {"days": 0}

    dates = set()
    for line in lines[1:]:
        if not line.strip():
            continue
        value = line.split(",")[date_index].strip() if len(line.split(",")) > date_index else ""
        if value:
            dates.add(value)
    return {"days": len(dates)}


@app.get("/has-store-history/{store_id}")
def has_store_history(store_id: str):
    file = _store_history_path(store_id)
    return {"has_history": bool(file and os.path.exists(file))}


@app.get("/dataset-span/{store_id}")
def dataset_span(store_id: str):
    file = _dataset_path(store_id)
    if not file or not os.path.exists(file):
        return {"span": None}

    with open(file, "r", encoding="utf-8") as fh:
        lines = [ln for ln in fh.read().split("\n") if ln.strip()]

    if len(lines) < 2:
        return {"span": None}

    date_index = lines[0].split(",").index("date") if "date" in lines[0] else -1
    if date_index == -1:
        return {"span": None}

    values = []
    for line in lines[1:]:
        v = line.split(",")[date_index].strip() if len(line.split(",")) > date_index else ""
        if v:
            values.append(v)

    if not values:
        return {"span": None}
    return {"span": {"from": min(values), "to": max(values)}}


@app.get("/dataset-path/{store_id}")
def dataset_path_route(store_id: str):
    return {"path": _dataset_path(store_id)}


@app.get("/store-history-path/{store_id}")
def store_history_path_route(store_id: str):
    return {"path": _store_history_path(store_id)}
