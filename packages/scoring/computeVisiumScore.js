// ═══════════════════════════════════════════════════════════════════════════
// VISIUM · computeVisiumScore — Fase 3 · Motor de Reglas Determinista
//
// HIPÓTESIS A VALIDAR: la permanencia ponderada por zona (dwell) más las
// acciones de alta intención (UX conversions) son señal suficiente para
// rankear leads inmobiliarios sin modelos de ML en la Fase 1-4 del roadmap.
//
// Contrato de entrada:
//   sessionEvents  — Array de filas de public.spatial_events para la sesión
//   zonesSchema    — Array de zonas del zones.json del viewer
//
// Contrato de salida:
//   Objeto compatible con la tabla public.visium_scores
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ── Constantes del algoritmo (v1 — aprobadas en arquitectura Fase 3) ────────
const ALGORITHM_VERSION       = 'v1';

const DWELL_SCORE_CAP         = 50;   // pts máximos por engagement espacial
const CONVERSION_SCORE_CAP    = 50;   // pts máximos por acciones de intención
const MAX_DWELL_RATIO         = 2.0;  // tope de ratio para evitar pestañas abandonadas
const DECISION_ZONE_BOOST     = 1.2;  // multiplicador extra para zonas de decisión
const SCALE_THRESHOLD         = 0.70; // umbral mínimo de confianza del modelo 3D

// Bonus de conversión (cada tipo se contabiliza solo una vez, salvo mediciones)
const CONVERSION_WEIGHTS = {
  CONTACT_CLICKED:  25,
  PROPERTY_SHARED:  10,
  DOLLHOUSE_OPENED:  5,
  FLOORPLAN_OPENED:  5,
};

const MEASUREMENT_FIRST_BONUS = 15;
const MEASUREMENT_EXTRA_PTS   = 5;
const MEASUREMENT_EXTRA_CAP   = 10;  // cap del bonus por mediciones adicionales
const RETURN_VISITOR_BONUS    = 15;

// Temperatura termodinámica del lead
const TEMPERATURE_THRESHOLDS = [
  { min: 80,  label: 'HOT'  },
  { min: 65,  label: 'WARM' },
  { min: 40,  label: 'MILD' },
  { min: -Infinity, label: 'COLD' },
];

// Textos en lenguaje natural para el breakdown ejecutivo
const SIGNAL_LABELS = {
  CONTACT_CLICKED:   'Contactó al agente por WhatsApp',
  PROPERTY_SHARED:   'Compartió la propiedad',
  DOLLHOUSE_OPENED:  'Exploró la maqueta 3D',
  FLOORPLAN_OPENED:  'Revisó el plano de planta',
  MEASUREMENT_EXTRA: 'Mediciones adicionales',
  RETURN:            'Visita recurrente',
};


// ── Utilidades internas ──────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function getTemperature(score) {
  return TEMPERATURE_THRESHOLDS.find(t => score >= t.min).label;
}


// ── Componente 1: Dwell Score (cap 50 pts) ───────────────────────────────────
//
// HIPÓTESIS A VALIDAR: la duración relativa (ratio real/esperado) ponderada
// por el peso estructural de la zona es un proxy de atención del comprador.
//
function computeDwellScore(sessionEvents, zonesMap) {
  const zoneExits = sessionEvents.filter(
    ev => ev.event_type === 'ZONE_EXIT' && ev.zone_id
  );

  let weightedRatioSum  = 0;
  let maxPossibleWeight = 0;
  const signals = [];

  for (const ev of zoneExits) {
    const cfg = zonesMap.get(ev.zone_id);
    if (!cfg) continue;

    const dwellMs = ev.payload?.dwell_ms ?? 0;
    if (dwellMs <= 0) continue;

    const ratio          = clamp(dwellMs / cfg.expected_dwell_ms, 0, MAX_DWELL_RATIO);
    const effectiveWeight = cfg.analytics_weight * (cfg.decision_zone ? DECISION_ZONE_BOOST : 1.0);

    weightedRatioSum  += ratio * effectiveWeight;
    maxPossibleWeight += MAX_DWELL_RATIO * effectiveWeight;

    // Solo señalamos zonas donde el usuario superó el tiempo base (ratio >= 1)
    if (ratio >= 1.0) {
      signals.push({
        type:    'DWELL',
        zone_id: ev.zone_id,
        label:   `Exploró ${cfg.label ?? ev.zone_id} (${Math.round(ratio * 100)}% del tiempo base)`,
        value:   round2(ratio),
        weight:  round2(effectiveWeight),
      });
    }
  }

  const rawScore = maxPossibleWeight === 0
    ? 0
    : (weightedRatioSum / maxPossibleWeight) * DWELL_SCORE_CAP;

  return {
    zone_score: round2(clamp(rawScore, 0, DWELL_SCORE_CAP)),
    signals,
  };
}


// ── Componente 2: Conversion Score (cap 50 pts) ──────────────────────────────
//
// HIPÓTESIS A VALIDAR: los eventos de conversión directa (contacto, medición,
// retorno) son la señal de intención más fuerte y deben dominar el score
// cuando se combinan con dwell espacial positivo.
//
function computeConversionScore(sessionEvents, isReturn) {
  let total = 0;
  const signals = [];
  const seen = new Set();

  // Bonus de retorno (identidad persistente vía visitorId)
  if (isReturn) {
    total += RETURN_VISITOR_BONUS;
    signals.push({
      type:   'RETURN',
      label:  SIGNAL_LABELS.RETURN,
      points: RETURN_VISITOR_BONUS,
    });
  }

  // Acciones de conversión estándar (deduplicadas por tipo)
  for (const [eventType, points] of Object.entries(CONVERSION_WEIGHTS)) {
    if (seen.has(eventType)) continue;
    const fired = sessionEvents.some(ev => ev.event_type === eventType);
    if (fired) {
      total += points;
      seen.add(eventType);
      signals.push({
        type:   eventType,
        label:  SIGNAL_LABELS[eventType],
        points,
      });
    }
  }

  // Lógica especial de mediciones (primera + adicionales con cap)
  const measurements = sessionEvents.filter(ev => ev.event_type === 'MEASUREMENT_CREATED');
  if (measurements.length > 0) {
    total += MEASUREMENT_FIRST_BONUS;
    signals.push({
      type:   'MEASUREMENT_CREATED',
      label:  'Usó la herramienta de medición',
      points: MEASUREMENT_FIRST_BONUS,
    });

    if (measurements.length > 1) {
      const extraBonus = clamp(
        (measurements.length - 1) * MEASUREMENT_EXTRA_PTS,
        0,
        MEASUREMENT_EXTRA_CAP
      );
      total += extraBonus;
      signals.push({
        type:   'MEASUREMENT_EXTRA',
        label:  `${measurements.length - 1} medición(es) adicional(es)`,
        points: extraBonus,
      });
    }
  }

  return {
    conversion_score: round2(clamp(total, 0, CONVERSION_SCORE_CAP)),
    signals,
  };
}


// ── Función principal ────────────────────────────────────────────────────────

/**
 * computeVisiumScore
 * @param {Object[]} sessionEvents  Filas de spatial_events para esta sesión
 * @param {Object[]} zonesSchema    Array de zonas del zones.json
 * @returns {Object} Payload compatible con public.visium_scores
 */
export function computeVisiumScore(sessionEvents, zonesSchema) {
  if (!Array.isArray(sessionEvents) || sessionEvents.length === 0) {
    throw new Error('[computeVisiumScore] sessionEvents vacío o inválido.');
  }
  if (!Array.isArray(zonesSchema) || zonesSchema.length === 0) {
    throw new Error('[computeVisiumScore] zonesSchema vacío o inválido.');
  }

  // Mapa de acceso O(1) a la configuración de cada zona
  const zonesMap = new Map(zonesSchema.map(z => [z.zone_id, z]));

  // Metadatos de sesión (SESSION_START es la fuente de verdad)
  const sessionStart    = sessionEvents.find(ev => ev.event_type === 'SESSION_START');
  const isReturn        = !!(sessionStart?.payload?.is_return);
  const scaleConfidence = sessionStart?.payload?.scale_confidence ?? null;

  // ── Cómputo de componentes ──
  const { zone_score,       signals: dwellSignals      } = computeDwellScore(sessionEvents, zonesMap);
  const { conversion_score, signals: conversionSignals } = computeConversionScore(sessionEvents, isReturn);

  // ── Score base ──
  let rawScore = zone_score + conversion_score;

  // ── Degradación por baja confianza de escala del modelo 3D ──
  // HIPÓTESIS A VALIDAR: un modelo con scale_confidence < 0.70 genera zonas
  // sub-calibradas, haciendo que expected_dwell_ms sea poco confiable. La
  // penalización lineal preserva la señal de conversión pero descuenta el dwell.
  let score_reliable = true;

  if (scaleConfidence !== null && scaleConfidence < SCALE_THRESHOLD) {
    const penalty = scaleConfidence / SCALE_THRESHOLD; // rango (0, 1)
    rawScore       = rawScore * penalty;
    score_reliable = false;
  }

  const score = round2(clamp(rawScore, 0, 100));

  return {
    score,
    zone_score,
    conversion_score,
    temperature:   getTemperature(score),
    score_reliable,
    breakdown: {
      signals: [...dwellSignals, ...conversionSignals],
    },
    // Campos de auditoría (para upsert en visium_scores)
    is_return:         isReturn,
    scale_confidence:  scaleConfidence,
    algorithm_version: ALGORITHM_VERSION,
  };
}
