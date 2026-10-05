import assert from "node:assert/strict";
import test from "node:test";

import { computeVisiumScore } from "./computeVisiumScore.js";

const zones = [
  {
    zone_id: "living",
    label: "Living",
    analytics_weight: 1,
    expected_dwell_ms: 10_000,
    decision_zone: false,
  },
];

function session({ dwellMs = 10_000, isReturn = false, scaleConfidence = 1, actions = [] } = {}) {
  return [
    { event_type: "SESSION_START", payload: { is_return: isReturn, scale_confidence: scaleConfidence } },
    { event_type: "ZONE_EXIT", zone_id: "living", payload: { dwell_ms: dwellMs } },
    ...actions.map((event_type) => ({ event_type, payload: {} })),
  ];
}

test("rejects missing session events and zone configuration", () => {
  assert.throws(() => computeVisiumScore([], zones), /sessionEvents/);
  assert.throws(() => computeVisiumScore(session(), []), /zonesSchema/);
});

test("weights dwell time and caps the zone component at 50", () => {
  const baseline = computeVisiumScore(session({ dwellMs: 10_000 }), zones);
  const capped = computeVisiumScore(session({ dwellMs: 100_000 }), zones);

  assert.equal(baseline.zone_score, 25);
  assert.equal(capped.zone_score, 50);
  assert.equal(capped.breakdown.signals[0].type, "DWELL");
});

test("handles return, measurement, contact, and share signals without exceeding the conversion cap", () => {
  const result = computeVisiumScore(
    session({
      isReturn: true,
      actions: [
        "MEASUREMENT_CREATED",
        "MEASUREMENT_CREATED",
        "CONTACT_CLICKED",
        "PROPERTY_SHARED",
      ],
    }),
    zones,
  );

  assert.equal(result.conversion_score, 50);
  assert.equal(result.is_return, true);
  assert.deepEqual(
    new Set(result.breakdown.signals.map((signal) => signal.type)),
    new Set(["DWELL", "RETURN", "CONTACT_CLICKED", "PROPERTY_SHARED", "MEASUREMENT_CREATED", "MEASUREMENT_EXTRA"]),
  );
});

test("degrades the complete score when model scale confidence is below 0.70", () => {
  const result = computeVisiumScore(
    session({ scaleConfidence: 0.35, actions: ["CONTACT_CLICKED"] }),
    zones,
  );

  assert.equal(result.zone_score, 25);
  assert.equal(result.conversion_score, 25);
  assert.equal(result.score, 25);
  assert.equal(result.score_reliable, false);
  assert.equal(result.scale_confidence, 0.35);
});

test("applies documented lead-temperature thresholds and algorithm metadata", () => {
  const mild = computeVisiumScore(session({ actions: ["MEASUREMENT_CREATED"] }), zones);
  const warm = computeVisiumScore(
    session({ actions: ["CONTACT_CLICKED", "PROPERTY_SHARED", "FLOORPLAN_OPENED"] }),
    zones,
  );
  const hot = computeVisiumScore(
    session({ dwellMs: 20_000, actions: ["CONTACT_CLICKED", "PROPERTY_SHARED"] }),
    zones,
  );

  assert.equal(mild.score, 40);
  assert.equal(mild.temperature, "MILD");
  assert.equal(warm.score, 65);
  assert.equal(warm.temperature, "WARM");
  assert.equal(hot.score, 85);
  assert.equal(hot.temperature, "HOT");
  assert.equal(hot.algorithm_version, "v1");
});
