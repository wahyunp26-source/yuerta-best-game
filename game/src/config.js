// Lumen Tide — tuning constants and palette. One job: every number the game
// balances on lives here, so a tweak never means hunting through logic.

export const VIEW = { width: 1280, height: 720 };

export const PALETTE = {
  deep: '#04101f',
  abyss: '#02070f',
  waterTop: '#06233d',
  waterMid: '#04263f',
  cyan: '#37e6ff',
  cyanSoft: '#7df3ff',
  gold: '#ffc94d',
  goldDeep: '#ff9d2e',
  coral: '#ff5d7a',
  violet: '#a78bff',
  foam: '#e8fbff',
  ink: '#0a1a2e',
};

export const PLAYER = {
  radius: 20,
  accel: 1500,
  maxSpeed: 340,
  drag: 3.2,
  blastRadius: 150,
  blastCooldown: 2.4,
  invulnTime: 1.6,
  trail: 14,
};

export const ORB = {
  radius: 11,
  baseScore: 10,
  comboWindow: 4.0,
  magnetRadius: 260,
  collectRadius: 34,
};

export const ENEMY = {
  drifter: { radius: 18, speed: 55, score: 25, color: '#ff5d7a' },
  chaser: { radius: 16, speed: 135, score: 40, color: '#c86bff' },
  splitter: { radius: 24, speed: 75, score: 60, color: '#ff9d2e' },
  spawnIntervalBase: 2.1,
  spawnIntervalMin: 0.65,
  maxAlive: 26,
};

export const POWERUP = {
  radius: 15,
  kinds: ['shield', 'magnet', 'slow'],
  shieldColor: '#7df3ff',
  magnetColor: '#ffc94d',
  slowColor: '#a78bff',
  magnetTime: 7,
  slowTime: 6,
  slowFactor: 0.45,
};

export const WAVES = {
  total: 10,
  quotaBase: 8,
  quotaPerWave: 3,
  clearBonus: 150,
  bannerTime: 2.2,
};

export const LIVES = 3;
export const PARTICLE_CAP = 420;
export const BUBBLE_COUNT = 46;
