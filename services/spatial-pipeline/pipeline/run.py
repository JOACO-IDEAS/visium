"""
CLI del pipeline:
    .venv/bin/python -m pipeline.run escaneo.glb salida.glb [--target-faces 0.55] [--no-draco]
Imprime el reporte de métricas en JSON por stdout.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from pipeline.steps import PipelineConfig, process_file

SUPPORTED = {".obj", ".ply", ".glb", ".gltf", ".stl"}


def main() -> int:
    ap = argparse.ArgumentParser(description="VISIUM Spatial Pipeline — limpieza de escaneos 3D")
    ap.add_argument("input", type=Path, help="escaneo crudo (.obj/.ply/.glb/.gltf/.stl)")
    ap.add_argument("output", type=Path, help="ruta del .glb optimizado de salida")
    ap.add_argument("--target-faces", type=float, default=0.55, help="fracción de caras a conservar (0-1]")
    ap.add_argument("--max-hole", type=int, default=400, help="tamaño máximo de agujero a sellar (aristas)")
    ap.add_argument("--plane-distance", type=float, default=0.015, help="tolerancia RANSAC en metros")
    ap.add_argument("--texture-size", type=int, default=2048, help="lado máximo de texturas en px")
    ap.add_argument("--no-draco", action="store_true", help="omite la compresión final")
    args = ap.parse_args()

    if args.input.suffix.lower() not in SUPPORTED:
        print(f"formato no soportado: {args.input.suffix}", file=sys.stderr)
        return 2
    if not args.input.exists():
        print(f"no existe: {args.input}", file=sys.stderr)
        return 2

    cfg = PipelineConfig(
        target_face_frac=args.target_faces,
        max_hole_size=args.max_hole,
        plane_distance=args.plane_distance,
        texture_size=args.texture_size,
        draco=not args.no_draco,
    )

    t0 = time.time()
    report = process_file(args.input, args.output, cfg)
    report["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
