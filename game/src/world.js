// Lumen Tide — the game world: pure state and update rules, no DOM, no canvas.
// The renderer draws this state; main.js feeds it input and time. Keeping it
// DOM-free means the same file runs in a Node logic test.

import { VIEW, PLAYER, ORB, ENEMY, POWERUP, WAVES, LIVES, PARTICLE_CAP, BUBBLE_COUNT } from './config.js';
import { mulberry32, range, pick } from './random.js';

export const PHASE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WIN: 'win',
  OVER: 'over',
};

export function waveQuota(wave) {
  return WAVES.quotaBase + WAVES.quotaPerWave * (wave - 1);
}

export function createWorld(seed) {
  const rng = mulberry32(seed >>> 0 || 1);
  const world = {
    seed: seed >>> 0 || 1,
    rng,
    phase: PHASE.TITLE,
    time: 0,
    wave: 1,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    lives: LIVES,
    orbsCollected: 0,
    orbsNeeded: waveQuota(1),
    kills: 0,
    blasts: 0,
    blastCooldown: 0,
    spawnTimer: 1.2,
    powerTimer: 9,
    banner: '',
    bannerTimer: 0,
    shake: 0,
    flash: 0,
    slowTimer: 0,
    magnetTimer: 0,
    shield: false,
    invuln: 0,
    player: {
      x: VIEW.width / 2, y: VIEW.height / 2 + 80,
      vx: 0, vy: 0, angle: -Math.PI / 2, trail: [],
    },
    orbs: [],
    enemies: [],
    powerups: [],
    particles: [],
    bubbles: [],
    floaters: [],
    stats: { orbs: 0, kills: 0, blasts: 0, wavesCleared: 0, timePlayed: 0 },
  };
  for (let i = 0; i < BUBBLE_COUNT; i++) {
    world.bubbles.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      r: range(rng, 1.5, 5),
      speed: range(rng, 8, 30),
      wobble: range(rng, 0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 5; i++) spawnOrb(world);
  return world;
}

export function startRun(world) {
  const keepBest = world.best;
  const fresh = createWorld((world.seed + 7919) >>> 0);
  fresh.best = keepBest;
  fresh.phase = PHASE.PLAYING;
  fresh.banner = 'WAVE 1 — GATHER THE LIGHT';
  fresh.bannerTimer = WAVES.bannerTime;
  Object.assign(world, fresh);
  world.rng = fresh.rng;
}

export function spawnOrb(world) {
  const margin = 60;
  world.orbs.push({
    x: range(world.rng, margin, VIEW.width - margin),
    y: range(world.rng, 90, VIEW.height - margin),
    r: ORB.radius,
    phase: world.rng() * Math.PI * 2,
    pulse: range(world.rng, 0.8, 1.2),
    hue: world.rng() < 0.82 ? 'gold' : 'cyan',
    vx: 0, vy: 0,
  });
}

export function spawnEnemy(world) {
  const wave = world.wave;
  const roll = world.rng();
  let kind = 'drifter';
  if (wave >= 3 && roll < 0.3) kind = 'chaser';
  else if (wave >= 4 && roll < 0.52) kind = 'splitter';
  const edge = Math.floor(world.rng() * 4);
  let x = 0, y = 0;
  if (edge === 0) { x = world.rng() * VIEW.width; y = -30; }
  else if (edge === 1) { x = world.rng() * VIEW.width; y = VIEW.height + 30; }
  else if (edge === 2) { x = -30; y = world.rng() * VIEW.height; }
  else { x = VIEW.width + 30; y = world.rng() * VIEW.height; }
  const spec = ENEMY[kind];
  const speedScale = 1 + (wave - 1) * 0.06;
  world.enemies.push({
    kind, x, y,
    vx: 0, vy: 0,
    r: spec.radius,
    speed: spec.speed * speedScale * range(world.rng, 0.9, 1.15),
    score: spec.score,
    wobble: world.rng() * Math.PI * 2,
    wobbleSpeed: range(world.rng, 1.2, 2.6),
    turn: range(world.rng, 1.6, 2.6),
    hp: kind === 'splitter' ? 2 : 1,
  });
}

export function spawnPowerup(world) {
  const kind = pick(world.rng, POWERUP.kinds);
  world.powerups.push({
    kind,
    x: range(world.rng, 70, VIEW.width - 70),
    y: range(world.rng, 110, VIEW.height - 70),
    r: POWERUP.radius,
    phase: world.rng() * Math.PI * 2,
    life: 12,
  });
}

export function burst(world, x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    if (world.particles.length >= PARTICLE_CAP) return;
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: range(world.rng, 1.5, 4.5),
      color, life: range(world.rng, life * 0.5, life),
      maxLife: life,
    });
  }
}

export function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function fireBlast(world) {
  if (world.phase !== PHASE.PLAYING || world.blastCooldown > 0) return false;
  world.blastCooldown = PLAYER.blastCooldown;
  world.blasts += 1;
  world.stats.blasts += 1;
  world.shake = Math.max(world.shake, 9);
  world.flash = 0.55;
  burst(world, world.player.x, world.player.y, '#7df3ff', 42, 420, 0.7);
  const R = PLAYER.blastRadius;
  const victims = [];
  for (const e of world.enemies) {
    if (dist2(e.x, e.y, world.player.x, world.player.y) < (R + e.r) * (R + e.r)) victims.push(e);
  }
  for (const e of victims) killEnemy(world, e, true);
  return true;
}

export function killEnemy(world, enemy, byBlast) {
  const idx = world.enemies.indexOf(enemy);
  if (idx === -1) return;
  world.enemies.splice(idx, 1);
  const color = ENEMY[enemy.kind].color;
  burst(world, enemy.x, enemy.y, color, enemy.kind === 'splitter' ? 26 : 16, 260, 0.8);
  const gained = enemy.score * (1 + Math.min(world.combo, 10) * 0.1);
  world.score += Math.round(gained);
  world.kills += 1;
  world.stats.kills += 1;
  addFloater(world, enemy.x, enemy.y, `+${Math.round(gained)}`, color);
  if (enemy.kind === 'splitter' && enemy.hp > 0) {
    for (let i = 0; i < 2; i++) {
      world.enemies.push({
        kind: 'drifter',
        x: enemy.x + (i === 0 ? -14 : 14), y: enemy.y,
        vx: range(world.rng, -60, 60), vy: range(world.rng, -40, 40),
        r: ENEMY.drifter.radius * 0.8,
        speed: ENEMY.drifter.speed * 1.25,
        score: ENEMY.drifter.score,
        wobble: world.rng() * Math.PI * 2,
        wobbleSpeed: 2.2, turn: 2.2, hp: 1,
      });
    }
  }
  if (byBlast) world.combo = Math.min(world.combo + 1, 20);
}

export function collectOrb(world, orb) {
  const idx = world.orbs.indexOf(orb);
  if (idx === -1) return;
  world.orbs.splice(idx, 1);
  world.combo += 1;
  world.comboTimer = ORB.comboWindow;
  const mult = 1 + Math.min(world.combo - 1, 20) * 0.25;
  const gained = Math.round(ORB.baseScore * mult);
  world.score += gained;
  world.orbsCollected += 1;
  world.stats.orbs += 1;
  burst(world, orb.x, orb.y, orb.hue === 'gold' ? '#ffc94d' : '#37e6ff', 14, 200, 0.6);
  addFloater(world, orb.x, orb.y - 10, `+${gained}`, orb.hue === 'gold' ? '#ffc94d' : '#7df3ff');
  spawnOrb(world);
  if (world.orbsCollected >= world.orbsNeeded) advanceWave(world);
}

export function advanceWave(world) {
  world.score += WAVES.clearBonus + world.wave * 25;
  world.stats.wavesCleared += 1;
  if (world.wave >= WAVES.total) {
    world.phase = PHASE.WIN;
    world.best = Math.max(world.best, world.score);
    burst(world, world.player.x, world.player.y, '#ffc94d', 90, 480, 1.4);
    burst(world, world.player.x, world.player.y, '#37e6ff', 60, 380, 1.2);
    return;
  }
  world.wave += 1;
  world.orbsCollected = 0;
  world.orbsNeeded = waveQuota(world.wave);
  world.banner = `WAVE ${world.wave} — THE DARK DEEPENS`;
  world.bannerTimer = WAVES.bannerTime;
  world.enemies.length = 0;
  for (let i = 0; i < 2 + world.wave; i++) spawnOrb(world);
  if (world.wave % 3 === 0) spawnPowerup(world);
}

export function hurtPlayer(world) {
  if (world.invuln > 0) return;
  if (world.shield) {
    world.shield = false;
    world.invuln = PLAYER.invulnTime;
    world.shake = Math.max(world.shake, 12);
    burst(world, world.player.x, world.player.y, '#7df3ff', 30, 320, 0.7);
    addFloater(world, world.player.x, world.player.y - 30, 'SHIELD DOWN', '#7df3ff');
    return;
  }
  world.lives -= 1;
  world.combo = 0;
  world.comboTimer = 0;
  world.invuln = PLAYER.invulnTime;
  world.shake = 18;
  world.flash = 0.8;
  burst(world, world.player.x, world.player.y, '#ff5d7a', 40, 380, 0.9);
  if (world.lives <= 0) {
    world.phase = PHASE.OVER;
    world.best = Math.max(world.best, world.score);
  }
}

export function applyPowerup(world, kind) {
  if (kind === 'shield') {
    world.shield = true;
    addFloater(world, world.player.x, world.player.y - 30, 'SHIELD UP', '#7df3ff');
  } else if (kind === 'magnet') {
    world.magnetTimer = POWERUP.magnetTime;
    addFloater(world, world.player.x, world.player.y - 30, 'MAGNET!', '#ffc94d');
  } else if (kind === 'slow') {
    world.slowTimer = POWERUP.slowTime;
    addFloater(world, world.player.x, world.player.y - 30, 'SLOW TIME!', '#a78bff');
  }
}

function updatePlayer(world, input, dt) {
  const p = world.player;
  let ax = 0, ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    ax /= len; ay /= len;
    p.vx += ax * PLAYER.accel * dt;
    p.vy += ay * PLAYER.accel * dt;
  }
  const drag = Math.exp(-PLAYER.drag * dt);
  p.vx *= drag;
  p.vy *= drag;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > PLAYER.maxSpeed) {
    p.vx = (p.vx / speed) * PLAYER.maxSpeed;
    p.vy = (p.vy / speed) * PLAYER.maxSpeed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(PLAYER.radius, Math.min(VIEW.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius + 56, Math.min(VIEW.height - PLAYER.radius, p.y));
  if (speed > 40) {
    const target = Math.atan2(p.vy, p.vx);
    let diff = target - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += diff * Math.min(1, dt * 10);
  }
  p.trail.unshift({ x: p.x, y: p.y, life: 0.35 });
  if (p.trail.length > PLAYER.trail) p.trail.pop();
  for (const t of p.trail) t.life -= dt;
}

function updateEnemies(world, dt) {
  const p = world.player;
  const slow = world.slowTimer > 0 ? POWERUP.slowFactor : 1;
  for (const e of world.enemies) {
    e.wobble += e.wobbleSpeed * dt;
    if (e.kind === 'chaser') {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const steer = e.turn * dt;
      e.vx += (dx / d) * e.speed * steer;
      e.vy += (dy / d) * e.speed * steer;
      const sp = Math.hypot(e.vx, e.vy);
      const cap = e.speed * slow;
      if (sp > cap) { e.vx = (e.vx / sp) * cap; e.vy = (e.vy / sp) * cap; }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const chase = e.kind === 'splitter' ? 0.35 : 0.18;
      e.vx += (dx / d) * e.speed * chase * dt * 2;
      e.vy += (dy / d) * e.speed * chase * dt * 2;
      const wob = Math.sin(e.wobble) * 26;
      e.x += (e.vx + Math.cos(e.wobble) * wob) * dt * slow;
      e.y += (e.vy + Math.sin(e.wobble) * wob * 0.5) * dt * slow;
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > e.speed) { e.vx = (e.vx / sp) * e.speed; e.vy = (e.vy / sp) * e.speed; }
    }
    if (e.x < -60 || e.x > VIEW.width + 60 || e.y < -60 || e.y > VIEW.height + 60) {
      e.x = Math.max(30, Math.min(VIEW.width - 30, e.x));
      e.y = Math.max(80, Math.min(VIEW.height - 30, e.y));
    }
  }
}

function updateOrbs(world, dt) {
  const p = world.player;
  for (const o of world.orbs) {
    o.phase += dt * 2.4;
    if (world.magnetTimer > 0) {
      const d = Math.hypot(p.x - o.x, p.y - o.y);
      if (d < ORB.magnetRadius && d > 1) {
        const pull = 520 * (1 - d / ORB.magnetRadius);
        o.vx += ((p.x - o.x) / d) * pull * dt;
        o.vy += ((p.y - o.y) / d) * pull * dt;
      }
    }
    o.vx *= Math.exp(-2 * dt);
    o.vy *= Math.exp(-2 * dt);
    o.x += o.vx * dt;
    o.y += o.vy * dt;
  }
}

export function updateWorld(world, input, dt) {
  dt = Math.min(dt, 1 / 30);
  world.time += dt;
  if (world.bannerTimer > 0) world.bannerTimer -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.8);
  for (const b of world.bubbles) {
    b.y -= b.speed * dt;
    b.wobble += dt;
    b.x += Math.sin(b.wobble * 2) * 8 * dt;
    if (b.y < -10) { b.y = VIEW.height + 10; b.x = world.rng() * VIEW.width; }
  }
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { world.particles.splice(i, 1); continue; }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-1.5 * dt);
    pt.vy *= Math.exp(-1.5 * dt);
  }
  for (let i = world.floaters.length - 1; i >= 0; i--) {
    const f = world.floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) world.floaters.splice(i, 1);
  }
  if (world.phase !== PHASE.PLAYING) return;
  world.stats.timePlayed += dt;
  if (world.blastCooldown > 0) world.blastCooldown -= dt;
  if (world.invuln > 0) world.invuln -= dt;
  if (world.slowTimer > 0) world.slowTimer -= dt;
  if (world.magnetTimer > 0) world.magnetTimer -= dt;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  updatePlayer(world, input, dt);
  updateOrbs(world, dt);
  updateEnemies(world, dt);

  // Spawning pressure grows with the wave.
  world.spawnTimer -= dt;
  const interval = Math.max(
    ENEMY.spawnIntervalMin,
    ENEMY.spawnIntervalBase - (world.wave - 1) * 0.16,
  );
  if (world.spawnTimer <= 0 && world.enemies.length < ENEMY.maxAlive) {
    spawnEnemy(world);
    world.spawnTimer = interval * range(world.rng, 0.7, 1.3);
  }
  world.powerTimer -= dt;
  if (world.powerTimer <= 0) {
    spawnPowerup(world);
    world.powerTimer = range(world.rng, 11, 17);
  }

  const p = world.player;
  // Orb collection.
  for (let i = world.orbs.length - 1; i >= 0; i--) {
    const o = world.orbs[i];
    const rr = ORB.collectRadius + o.r;
    if (dist2(o.x, o.y, p.x, p.y) < rr * rr) collectOrb(world, o);
  }
  // Power-up collection.
  for (let i = world.powerups.length - 1; i >= 0; i--) {
    const u = world.powerups[i];
    u.life -= dt;
    if (u.life <= 0) { world.powerups.splice(i, 1); continue; }
    const rr = POWERUP.radius + PLAYER.radius + 6;
    if (dist2(u.x, u.y, p.x, p.y) < rr * rr) {
      world.powerups.splice(i, 1);
      applyPowerup(world, u.kind);
    }
  }
  // Enemy contact.
  if (world.invuln <= 0) {
    for (const e of world.enemies) {
      const rr = e.r + PLAYER.radius - 4;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        hurtPlayer(world);
        // Knock the enemy back so one touch is not a double hit.
        const dx = e.x - p.x, dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * 60;
        e.y += (dy / d) * 60;
        break;
      }
    }
  }
}
