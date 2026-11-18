// Detection sources: one place that turns sight, sound and behaviour into heat.
// Pure logic. The game loop passes a context and applies the returned delta.
(function (HS) {
'use strict';

const RATES = {
  guardVision: 0.52,   // per second inside the detective's FOV with line of sight
  guardClose: 0.82,    // per second at close range
  camera: 0.17,        // per second per CCTV camera that sees you
  staff: 0.13,         // per second while staff report you
  sprint: 0.05,        // per second while sprinting
  tag: 0.035,          // per second per active RF tag in the bag
  motion: 0.12,        // per second crossing an armed motion zone while moving
  soundSpike: 0.16,    // one-shot when a loud action fires
  decay: 0.07,         // per second when nothing is detecting you
  decayHidden: 0.12,   // per second when crouched and unseen
  crouchScale: 0.45,   // multiplier on vision-based sources while crouched
};

function contribution(ctx, dt) {
  const scale = ctx.crouched ? RATES.crouchScale : 1;
  const events = [];
  let delta = 0;

  if (ctx.guardSees) {
    const amount = (ctx.close ? RATES.guardClose : RATES.guardVision) * scale * dt;
    delta += amount;
    events.push({ source: 'detective', kind: 'vision', amount });
  }
  if (ctx.cameras > 0) {
    const factor = ctx.camerasDisabled ? 0.15 : 1;
    const amount = RATES.camera * ctx.cameras * factor * scale * dt;
    delta += amount;
    if (amount > 0) events.push({ source: 'cctv', kind: 'vision', amount });
  }
  if (ctx.staffReport) {
    const amount = RATES.staff * scale * dt;
    delta += amount;
    events.push({ source: 'staff', kind: 'vision', amount });
  }
  if (ctx.sprint) {
    delta += RATES.sprint * dt;
    events.push({ source: 'footsteps', kind: 'sound', amount: RATES.sprint * dt });
  }
  if (ctx.tags > 0) {
    const amount = RATES.tag * ctx.tags * dt;
    delta += amount;
    events.push({ source: 'rf-tag', kind: 'tag', amount });
  }
  if (ctx.motion) {
    delta += RATES.motion * dt;
    events.push({ source: 'motion-sensor', kind: 'motion', amount: RATES.motion * dt });
  }

  const detected = ctx.guardSees || ctx.cameras > 0 || ctx.staffReport || ctx.motion;
  const decayRate = detected ? RATES.decay : (ctx.crouched ? RATES.decayHidden : RATES.decay);
  delta -= decayRate * dt;

  return { delta, events, detected };
}

function inMotionZone(zones, I, J) {
  for (const z of zones || []) {
    if (Math.hypot(I - z.I, J - z.J) <= (z.r || 1.6)) return z;
  }
  return null;
}

HS.Detect = { RATES, contribution, inMotionZone };
})(globalThis.HOUSE || (globalThis.HOUSE = {}));
