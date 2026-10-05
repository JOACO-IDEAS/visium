# Arquitectura — Pipeline de procesamiento estructurado

> Historical design note. The canonical whole-system architecture now lives in `docs/ARCHITECTURE.md`. This document preserves the earlier web-side property-processing design and may describe stubs that now have a separate Python implementation under `services/spatial-pipeline/`; the two are not yet integrated.

> Estado: diseño inicial / prototipo. Nada de lo descrito acá corre en
> producción todavía — ver `app/api/v1/property-processor/route.ts` y
> `lib/property-pipeline/` para el estado real del código (stubs).

## Por qué este pivot

El pipeline anterior probó Gaussian Splatting nativo en el cliente
(descripto en commits previos de este repo). Para el estándar comercial
de Visium, la relación calidad/peso de un splat que entra cómodo en un
repo git (~13 MB tras sub-muestrear ~85-90% de los puntos) no alcanza.
Este documento reemplaza esa dirección por un pipeline de **entrada
estructurada**: en vez de reconstruir todo desde video crudo, partimos
de un plano 2D (que ya trae la geometría exacta) y usamos fotos/video
solo para texturizar y dar contexto visual — mucho menos trabajo de
reconstrucción "a ciegas".

## Paquete de entrada (estilo ZonaProp)

```ts
type PropertyPackage = {
  sourcePropertyId?: string;
  floorplanImageUrl: string;   // plano 2D (imagen)
  photoUrls: string[];         // fotos sueltas del ambiente
  walkthroughVideoUrl: string; // video de recorrido
};
```

Contrato actual en `lib/property-pipeline/types.ts`. El endpoint de
prueba `POST /api/v1/property-processor` valida este shape y devuelve
un `ProcessingJob` mockeado (sin procesamiento real todavía) — es el
contrato de API sobre el que vamos a iterar, no la implementación
final.

## Pasos del pipeline

```
PropertyPackage
      │
      ├─► (a) Detección de muros ──────┐
      │     (plano 2D → geometría)     │
      │                                ▼
      ├─► (b) Extracción de keyframes  │
      │     (video → frames útiles)    │
      │                                ▼
      └─► fotos sueltas ──────► (c) Reconstrucción en la nube
                                        │
                                        ▼
                          Asset navegable (TwinViewer)
```

### (a) Detección de muros — `lib/property-pipeline/wall-detection.ts`

Segmenta el plano 2D en muros, aberturas (puertas/ventanas) y ambientes,
vectorizados a un sistema de coordenadas métrico. Hoy es un stub que
documenta la interfaz (`detectWallsFromFloorplan`) y tira `Error` si se
invoca — no hay visión computacional real implementada.

Approach previsto: binarizar + Canny + transformada de Hough para
candidatos a muro, o un modelo de segmentación semántica entrenado
(estilo CubiCasa5k) para planos con estilos heterogéneos. Es candidato
a correr como microservicio Python (OpenCV + modelo), no dentro del
proceso de Next.js — el contrato de tipos es el mismo corra donde corra.

### (b) Extracción de keyframes — `lib/property-pipeline/keyframe-extraction.ts`

Del video de recorrido, selecciona frames representativos (por cambio
de escena, no por intervalo fijo, para no repetir frames de tramos de
cámara quieta) y descarta los borrosos (varianza del Laplaciano). Hoy
es un stub (`extractKeyframesFromVideo`) — no procesa video real.

Approach previsto: `ffmpeg` para decodificar/samplear, un score de
nitidez por frame, y timestamps para poder correlacionar cada keyframe
con las fotos sueltas del paquete. Mismo criterio que (a): candidato a
vivir fuera del proceso Next.js (ffmpeg no es una librería pura de
Node).

### (c) Reconstrucción en la nube — pendiente de diseño de integración

Todavía no tiene módulo propio (no está en el alcance de este pivot
inicial). La idea: una vez que (a) entrega geometría de muros y (b)
entrega keyframes + timestamps, ese paquete combinado (+ las fotos
sueltas) se envía a un servicio de reconstrucción 3D en la nube que
devuelve el asset navegable final.

Candidatos a evaluar (ninguno integrado todavía, requiere decisión de
producto/costo antes de comprometerse a uno):
- **Luma AI** (Interactive Scenes / API) — de foto+video a experiencia
  navegable, con API de generación.
- **Polycam API** — captura + reconstrucción, tiene soporte de planos
  como referencia geométrica.
- **Pipeline propio (COLMAP + 3D Gaussian Splatting)** self-hosted en
  GPU cloud (ej. un job puntual en Modal/RunPod) — más control y costo
  marginal más bajo a escala, pero es infraestructura a mantener
  nosotros.

## Cómo se conecta con TwinViewer

El output de (c) debería resolver a un asset que `TwinViewer.tsx` ya
sabe consumir (`.glb` — ver `MODEL_URL` en ese componente) o a un
formato nuevo que se sume de la misma manera que se evaluó y se
descartó para splats: como una fuente adicional, nunca reemplazando el
modo `.glb` estable que ya está en producción.

## Qué falta para pasar de esto a producción

- Definir dónde corren (a) y (b): ¿microservicio propio, función
  serverless con límite de tiempo/memoria distinto al del resto de la
  app, o un proveedor gestionado?
- Elegir un proveedor de (c) y validar costo por propiedad procesada.
- Reemplazar el store en memoria de `ProcessingJob` (se pierde en cada
  redeploy) por persistencia real antes de que el endpoint sea algo
  más que una prueba de contrato.
- Definir manejo de errores/reintentos por paso (hoy cada paso es
  todo-o-nada).
