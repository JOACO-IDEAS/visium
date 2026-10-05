"""
Microservicio FastAPI del pipeline espacial.

    .venv/bin/uvicorn service.api:app --reload --port 8000

POST /process-mesh  (multipart: file=<escaneo crudo>)
  → devuelve el .glb optimizado (Draco + WebP) listo para TwinViewer.tsx.
  El reporte de métricas viaja en el header X-Pipeline-Report (JSON).

POST /detect-walls  (multipart: file=<plano 2D, PNG/JPEG>)
  → devuelve el JSON de muros/aberturas detectados (OpenCV clásico).
  Reemplazo real de lib/property-pipeline/wall-detection.ts (Next.js),
  que hoy simula la geometría — ver pipeline/wall_detection.py.
"""

from __future__ import annotations

import json
import shutil
import tempfile
from dataclasses import asdict
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from pipeline import __version__
from pipeline.steps import PipelineConfig, process_file
from pipeline.wall_detection import WallDetectionConfig, detect_walls

SUPPORTED = {".obj", ".ply", ".glb", ".gltf", ".stl"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB — escaneos crudos son pesados

SUPPORTED_IMAGES = {".png", ".jpg", ".jpeg"}
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB — de sobra para un plano escaneado

app = FastAPI(title="VISIUM Spatial Pipeline", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo/testing — restringir al dominio en producción
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
    expose_headers=["X-Pipeline-Report"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}


@app.post("/process-mesh")
async def process_mesh(
    file: UploadFile = File(...),
    target_face_frac: float = 0.55,
    max_hole_size: int = 400,
    draco: bool = True,
) -> FileResponse:
    suffix = Path(file.filename or "scan.glb").suffix.lower()
    if suffix not in SUPPORTED:
        raise HTTPException(415, f"Formato no soportado: {suffix}. Aceptados: {sorted(SUPPORTED)}")

    tmpdir = Path(tempfile.mkdtemp(prefix="visium-upload-"))
    try:
        raw = tmpdir / f"scan{suffix}"
        size = 0
        with raw.open("wb") as fh:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "El escaneo supera los 500 MB")
                fh.write(chunk)

        out = tmpdir / "twin-optimized.glb"
        cfg = PipelineConfig(target_face_frac=target_face_frac, max_hole_size=max_hole_size, draco=draco)

        # CPU-bound → threadpool: no bloquea el event loop con otros uploads
        report = await run_in_threadpool(process_file, raw, out, cfg)

        return FileResponse(
            out,
            media_type="model/gltf-binary",
            filename="twin-optimized.glb",
            headers={"X-Pipeline-Report": json.dumps(report, ensure_ascii=False)},
            background=BackgroundTask(shutil.rmtree, tmpdir, ignore_errors=True),
        )
    except HTTPException:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise
    except Exception as exc:  # el detalle queda en logs del server
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(500, f"El pipeline falló: {type(exc).__name__}") from exc


@app.post("/detect-walls")
async def detect_walls_endpoint(
    file: UploadFile = File(...),
    assumed_scale_m_per_px: float = 0.01,
) -> dict:
    suffix = Path(file.filename or "plan.png").suffix.lower()
    if suffix not in SUPPORTED_IMAGES:
        raise HTTPException(415, f"Formato no soportado: {suffix}. Aceptados: {sorted(SUPPORTED_IMAGES)}")

    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "El plano supera los 20 MB")

    cfg = WallDetectionConfig(assumed_scale_m_per_px=assumed_scale_m_per_px)
    try:
        # CPU-bound (OpenCV) → threadpool, no bloquea el event loop
        result = await run_in_threadpool(detect_walls, data, cfg)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:  # el detalle queda en logs del server
        raise HTTPException(500, f"La detección de muros falló: {type(exc).__name__}") from exc

    return asdict(result)
