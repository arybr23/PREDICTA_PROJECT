"""
PREDICTA ML exposed as a Modal web endpoint.

    npm run ml:seed      # one-time: upload local ML/{data,models,salesHistory}
    npm run ml:deploy    # build the image, publish the HTTPS endpoint

Architecture
------------
`api/main.py` is unchanged: it still shells out to `src/*.py` the same way
`npm run ml:api` does. The only difference is where it runs:

  * `api/` and `src/` are baked into the image at /pkg (copy=True), so
    ML_DIR in api/main.py and src/store_paths.py resolves to /pkg — exactly
    the layout the scripts assume.
  * `data/`, `models/` and `salesHistory/` are Modal volumes mounted at
    /pkg/data, /pkg/models and /pkg/salesHistory. Import-sales and training
    write into them; those writes survive cold starts and redeploys.
  * `predicta-ml-secret` provides ML_API_KEY. When that env var is set,
    api/main.py rejects every request without a matching X-ML-Key header
    (/health stays open). The Node bridge sends it from its own ML_API_KEY.
  * Containers scale to zero after 5 idle minutes (scaledown_window=300),
    so nothing is billed between calls.

Libraries
---------
Runtime (installed into the image from requirements.txt — the complete
system dependency list):
    lightgbm, pandas, numpy, scikit-learn, scipy, hijridate, hijri-converter,
    Faker, python-dateutil, pytz, openpyxl, fastapi, uvicorn, pydantic
    (plus transitive: joblib, threadpoolctl, starlette, annotated-types, ...)
Deploy-time only, local ML/venv, never inside the image:
    modal==1.2.6

First deploy
------------
    ../ML/venv/bin/modal secret create predicta-ml-secret ML_API_KEY=<value>
    npm run ml:seed
    npm run ml:deploy
then point the backend at the printed URL:
    ML_API_URL=https://<user>--predicta-ml.modal.run
    ML_API_KEY=<same value>
"""

from __future__ import annotations

import sys
from pathlib import Path

import modal

ML_DIR = Path(__file__).resolve().parent

# 3.11: every pin in requirements.txt ships wheels for it (numpy 2.x has no
# 3.13 wheels yet, and the local venv is 3.9).
CONTAINER_PYTHON = "3.11"

# Code root inside the container. Baked dirs and volume mounts all live under
# it so ML_DIR-relative path lookups resolve unchanged.
PKG = "/pkg"

app = modal.App("predicta-ml")

image = (
    modal.Image.debian_slim(python_version=CONTAINER_PYTHON)
    .pip_install_from_requirements(str(ML_DIR / "requirements.txt"))
    .add_local_dir(str(ML_DIR / "api"), f"{PKG}/api", copy=True)
    .add_local_dir(str(ML_DIR / "src"), f"{PKG}/src", copy=True)
)

data_volume = modal.Volume.from_name("predicta-ml-data", create_if_missing=True)
models_volume = modal.Volume.from_name("predicta-ml-models", create_if_missing=True)
history_volume = modal.Volume.from_name("predicta-ml-sales-history", create_if_missing=True)

secret = modal.Secret.from_name("predicta-ml-secret")


@app.function(
    image=image,
    secrets=[secret],
    volumes={
        f"{PKG}/data": data_volume,
        f"{PKG}/models": models_volume,
        f"{PKG}/salesHistory": history_volume,
    },
    cpu=1,
    memory=2048,
    timeout=600,  # longest script budget is TRAIN_TIMEOUT = 180s
    scaledown_window=300,  # scale to zero after 5 idle minutes
)
@modal.asgi_app()
def web():
    sys.path.insert(0, PKG)
    from api.main import app as application

    volumes = (data_volume, models_volume, history_volume)

    @application.middleware("http")
    async def volume_sync(request, call_next):
        # Containers cache their own view of a volume, and writes are only
        # flushed when the container exits — so a dataset this container just
        # wrote was invisible to the next request served elsewhere, and reads
        # saw whatever was committed when THIS container started. Refresh
        # before handling (see what other containers committed) and commit
        # after (publish what this one wrote) so seed -> rebuild -> predict
        # behave the same no matter which container serves each hop.
        try:
            for volume in volumes:
                volume.reload()
        except Exception as error:  # a stale view is still better than a 500
            print(f"[volume] reload failed: {error}", file=sys.stderr)
        try:
            response = await call_next(request)
        finally:
            try:
                for volume in volumes:
                    volume.commit()
            except Exception as error:
                print(f"[volume] commit failed: {error}", file=sys.stderr)
        return response

    return application


@app.local_entrypoint()
def seed() -> None:
    """One-time (re-)upload of the local ML trees into the Modal volumes."""
    for name, volume, local in (
        ("data", data_volume, ML_DIR / "data"),
        ("models", models_volume, ML_DIR / "models"),
        ("salesHistory", history_volume, ML_DIR / "salesHistory"),
    ):
        with volume.batch_upload(force=True) as batch:
            batch.put_directory(str(local), "/")
        names = sorted(entry.path for entry in volume.listdir("/"))
        print(f"[seed] {name} -> {volume.name}: {names}")
