// Lumen Tide — deterministic screenshot scenes for ?shot=title|play|win|over.
// Each scene builds a world from a fixed seed, steps it a fixed number of
// ticks with scripted input, and leaves it ready to render. No wall clock, no
// real input: the same URL always draws the same frame.

import { VIEW, PLAYER } from './config.js';
import { createWorld, startRun, updateWorld, fireBlast, PHASE, spawnEnemy, spawnPowerup } from './world.js';
import { mulberry32, range } from './random.js';

const IDLE_INPUT = {
  up: false, down: false, left: false, right: false,
  blast: false, mouseX: 640, mouseY: 360,
};

function scriptedInput(t, seed) {
  // A gentle, looping swim pattern so the play shot looks alive.
  const s = Math.sin(t * 0.9 + seed) > 0;
  const c = Math.cos(t * 0.55 + seed) > 0;
  return {
    up: t % 3 < 1.4,
    down: t % 3 >= 1.4,
    left: s,
    right: !s,
    blast: false,
    mouseX: 640, mouseY: 360,
  };
}

function stepWorld(world, seconds, inputFn) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    const input = inputFn ? inputFn(world.time) : IDLE_INPUT;
    updateWorld(world, input, dt);
  }
}

export function buildShotScene(kind, seed) {
  const world = createWorld(seed);
  if (kind === 'title') {
    world.phase = PHASE.TITLE;
    world.best = 1840;
    stepWorld(world, 2.5, null);
    return world;
  }

  startRun(world);
  if (kind === 'play') {
    // Mid-game: wave 5, a healthy score and combo, enemies of all three kinds
    // on screen, a shield power-up waiting, HUD fully populated.
    world.wave = 5;
    world.score = 2450;
    world.combo = 7;
    world.comboTimer = 3.2;
    world.orbsCollected = 11;
    world.orbsNeeded = 20;
    world.lives = 3;
    world.shield = true;
    world.blastCooldown = 0.9;
    const rng = mulberry32(seed ^ 0x5eed);
    for (let i = 0; i < 9; i++) {
      const kinds = ['drifter', 'chaser', 'splitter'];
      const k = kinds[i % 3];
      world.enemies.push({
        kind: k,
        x: range(rng, 120, VIEW.width - 120),
        y: range(rng, 140, VIEW.height - 120),
        vx: range(rng, -40, 40), vy: range(rng, -30, 30),
        r: k === 'splitter' ? 24 : k === 'drifter' ? 18 : 16,
        speed: 80, score: 25,
        wobble: rng() * Math.PI * 2, wobbleSpeed: 2, turn: 2, hp: 1,
      });
    }
    world.powerups.push({
      kind: 'magnet', x: 980, y: 200, r: 15, phase: 0, life: 10,
    });
    world.player.x = 560;
    world.player.y = 430;
    world.player.angle = -0.4;
    stepWorld(world, 1.6, (t) => scriptedInput(t, 1.7));
    world.banner = '';
    world.bannerTimer = 0;
    // Re-compose the frame after the simulation: fish centre-stage, shield
    // visibly up, no stray floating text, best score populated.
    world.player.x = 470;
    world.player.y = 400;
    world.player.vx = 60;
    world.player.vy = -20;
    world.player.angle = -0.3;
    world.floaters.length = 0;
    world.shield = true;
    world.best = 2450;
    return world;
  }

  if (kind === 'win') {
    world.wave = 10;
    world.score = 8930;
    world.best = 8930;
    world.stats.orbs = 132;
    world.stats.kills = 41;
    world.stats.blasts = 18;
    world.stats.wavesCleared = 10;
    world.stats.timePlayed = 386;
    world.phase = PHASE.WIN;
    stepWorld(world, 1.2, null);
    world.banner = '';
    world.bannerTimer = 0;
    world.orbsCollected = 8;
    world.orbsNeeded = 8;
    return world;
  }

  // over
  world.wave = 6;
  world.score = 3120;
  world.best = 3120;
  world.lives = 0;
  world.stats.orbs = 58;
  world.stats.kills = 19;
  world.stats.blasts = 9;
  world.stats.wavesCleared = 5;
  world.stats.timePlayed = 214;
  world.phase = PHASE.OVER;
  world.flash = 0.25;
  stepWorld(world, 1.2, null);
  world.banner = '';
  world.bannerTimer = 0;
  world.orbsCollected = 14;
  world.orbsNeeded = 23;
  return world;
}

export function shotKindFromUrl(url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const shot = params.get('shot');
  if (shot === 'title' || shot === 'play' || shot === 'win' || shot === 'over') return shot;
  return null;
}

export function shotSeedFromUrl(url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const raw = Number.parseInt(params.get('seed') || '', 10);
  return Number.isFinite(raw) ? raw : 20261116;
}
