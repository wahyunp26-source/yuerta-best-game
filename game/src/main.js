// Lumen Tide — bootstrap and game loop. One job: own the canvas, the clock,
// the input, the audio, and the phase transitions; the world and renderer do
// the rest.

import { VIEW } from './config.js';
import { createWorld, startRun, updateWorld, fireBlast, PHASE } from './world.js';
import { renderWorld } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildShotScene, shotKindFromUrl, shotSeedFromUrl } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();
const input = createInput(canvas);

let world;
let shotMode = false;
let lastTime = 0;
let best = 0;

try {
  best = Number.parseInt(localStorage.getItem('lumen-tide-best') || '0', 10) || 0;
} catch (err) { best = 0; }

function saveBest() {
  try { localStorage.setItem('lumen-tide-best', String(world.best)); } catch (err) { /* storage unavailable */ }
}

function boot() {
  const kind = shotKindFromUrl(window.location.href);
  if (kind) {
    // Deterministic screenshot scene: build, render once, signal readiness.
    shotMode = true;
    world = buildShotScene(kind, shotSeedFromUrl(window.location.href));
    renderWorld(ctx, world);
    window.__shotReady = true;
    return;
  }
  world = createWorld((Date.now() % 2147483647) || 1);
  world.best = best;
  requestAnimationFrame(tick);
}

function beginRun() {
  audio.unlock();
  audio.startPad();
  audio.click();
  startRun(world);
}

function tick(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 20) : 1 / 60;
  lastTime = now;
  const edges = input.consumeEdges();
  if (input.mute !== undefined && audio.isMuted() !== !!input.mute) audio.setMuted(!!input.mute);

  if (edges.restart) {
    beginRun();
  } else if (world.phase === PHASE.TITLE) {
    if (edges.confirm || edges.blast || input.mouseDown) beginRun();
  } else if (world.phase === PHASE.PLAYING) {
    if (edges.pause) {
      world.phase = PHASE.PAUSED;
      audio.click();
    } else {
      if (edges.blast) {
        if (fireBlast(world)) audio.blast();
      }
      const before = { score: world.score, lives: world.lives, phase: world.phase, wave: world.wave, shield: world.shield };
      updateWorld(world, input, dt);
      if (world.score > before.score && world.orbsCollected !== undefined) {
        // A pickup or a kill just landed; the exact cue is picked by what changed.
        if (world.lives === before.lives) audio.pickup(world.combo);
      }
      if (world.lives < before.lives) audio.hit();
      if (world.shield && !before.shield) audio.powerup();
      if (world.wave > before.wave) audio.waveClear();
      if (world.phase === PHASE.WIN) { audio.victory(); saveBest(); }
      if (world.phase === PHASE.OVER) { audio.defeat(); saveBest(); }
    }
  } else if (world.phase === PHASE.PAUSED) {
    if (edges.pause || edges.confirm) { world.phase = PHASE.PLAYING; audio.click(); }
  } else if (world.phase === PHASE.WIN || world.phase === PHASE.OVER) {
    if (edges.confirm || edges.blast || input.mouseDown) beginRun();
  }

  renderWorld(ctx, world);
  if (!shotMode) requestAnimationFrame(tick);
}

// Keep the canvas crisp on high-DPI screens without changing game units.
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();
boot();
