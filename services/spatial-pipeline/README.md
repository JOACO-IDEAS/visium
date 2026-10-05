# VISIUM Spatial Pipeline

Saneamiento automático de escaneos 3D crudos (Scaniverse, LiDAR, fotogrametría)
para el motor de gemelos digitales. Entra un `.obj/.ply/.glb/.gltf` con ruido y
agujeros; sale un `.glb` limpio, ultraliviano (Draco + WebP), listo para
`TwinViewer.tsx`.

## Los 4 pasos

1. **Outlier removal** — componentes conexos diminutos (geometría fantasma de
   la cámara en movimiento) se eliminan filtrando caras sobre el mismo objeto:
   las UVs nunca se tocan.
2. **Planarización RANSAC** (Open3D) — detecta los planos dominantes (paredes,
   piso, techo) y proyecta sobre cada plano solo los vértices cuya normal está
   alineada con él → la rugosidad desaparece y las esquinas/marcos quedan intactos.
3. **Hole filling** (PyMeshLab) — sella los agujeros negros de piso/techo por
   interpolación. *Los parches nuevos no tienen textura* (el escáner nunca vio
   esa zona); heredan el material neutro del mesh.
4. **Decimación inteligente** (PyMeshLab quadric) — reduce polígonos
   preservando bordes duros; usa el filtro `*_with_texture` cuando hay UVs.
   Export final con `gltf-transform`: Draco + texturas WebP.

## Requisitos

- **Python 3.10–3.12** (el 3.9 del sistema macOS no tiene wheels de pymeshlab).
  Con [uv](https://docs.astral.sh/uv/): `uv venv --python 3.11 .venv`
- **Node ≥ 18** (para `npx @gltf-transform/cli`)
- Linux/Docker: `apt install libgl1 libglu1-mesa libxrender1 libxext6 libsm6`
  (runtime GL de pymeshlab). macOS/Windows: nada extra, los wheels lo traen.

```bash
uv pip install --python .venv/bin/python -r requirements.txt
```

## Uso

### CLI

```bash
.venv/bin/python -m pipeline.run ~/Downloads/casa1.glb salida.glb
# tunables: --target-faces 0.55 · --max-hole 400 · --plane-distance 0.015 · --no-draco
```

Imprime el reporte JSON: componentes eliminados, planos encontrados,
vértices proyectados, agujeros cerrados, caras antes/después, bytes finales.

### Microservicio

```bash
.venv/bin/uvicorn service.api:app --reload --port 8000
```

```bash
curl -X POST http://localhost:8000/process-mesh \
  -F "file=@escaneo.glb" -o twin-optimized.glb -D headers.txt
# el reporte viaja en el header X-Pipeline-Report
```

### Docker

```bash
docker build -t visium-pipeline .
docker run -p 8000:8000 visium-pipeline
```

## Integración con el visor

El `.glb` resultante es directamente el formato que consume
`components/v2/TwinViewer.tsx` (Draco decodificado vía CDN). Reemplazar
`public/models/casa1.glb` y listo.

## Detección de muros — `POST /detect-walls`

Reemplazo real (OpenCV clásico) del stub simulado en
`lib/property-pipeline/wall-detection.ts`. Ver `pipeline/wall_detection.py`
para el detalle del algoritmo (binarizado → Canny → HoughLinesP → fusión
de segmentos colineales respetando gaps reales → emparejamiento de caras
paralelas para medir grosor → heurística de aberturas por gap).

```bash
curl -X POST http://localhost:8000/detect-walls \
  -F "file=@plano.png" \
  -F "assumed_scale_m_per_px=0.01"
```

Devuelve JSON directo (no un archivo):

```json
{
  "image_width_px": 800,
  "image_height_px": 600,
  "scale_m_per_px": 0.01,
  "scale_source": "assumed",
  "walls": [
    {
      "start": {"x": 0.77, "y": 0.80},
      "end": {"x": 7.23, "y": 0.80},
      "thickness_m": 0.15,
      "thickness_measured": true,
      "orientation": "horizontal",
      "length_m": 6.46
    }
  ],
  "openings": [{"wall_index": 1, "position_ratio": 0.5, "width_m": 1.31}],
  "raw_segments_found": 27,
  "walls_after_merge": 12
}
```

**Estado real, sin maquillaje** (smoke test contra un plano sintético con
paredes en banda rellena — ver `pipeline/wall_detection.py` para cómo
generarlo): la geometría de muros perimetrales sale limpia y con grosor
medido cuando el plano tiene el patrón de doble cara paralela; la
heurística de aberturas encuentra los huecos reales pero puede generar
algún falso positivo por ruido de Hough en los cruces en T (documentado
en el código, no oculto). Como con cualquier visión clásica, va a pedir
recalibración de los parámetros (`WallDetectionConfig`) contra planos
reales — los sintéticos solo validan que el pipeline corre de punta a
punta y no está roto.

**No resuelve la escala real** (px→metros) — no hay forma de derivarla
de una imagen sin referencia. Se recibe como parámetro opcional
(`assumed_scale_m_per_px`, default 1/100) hasta que se sume detección de
una cota acotada o un elemento de tamaño estándar en el plano.
