// Lumen Tide — every pixel the player sees. One job: draw a world state onto
// a 2D canvas, plus the HUD and the title / victory / game-over screens.

import { VIEW, PALETTE, PLAYER, ORB, ENEMY, POWERUP, WAVES, LIVES } from './config.js';
import { PHASE } from './world.js';

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.waterTop);
  g.addColorStop(0.55, PALETTE.waterMid);
  g.addColorStop(1, PALETTE.abyss);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Distant light rays from the surface.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = PALETTE.cyanSoft;
  for (let i = 0; i < 5; i++) {
    const x = 140 + i * 240 + Math.sin(world.time * 0.2 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 190, VIEW.height);
    ctx.lineTo(x + 40, VIEW.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Rocky floor silhouettes.
  ctx.fillStyle = '#03101f';
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  ctx.lineTo(0, VIEW.height - 46);
  for (let x = 0; x <= VIEW.width; x += 90) {
    ctx.lineTo(x, VIEW.height - 46 - Math.sin(x * 0.011 + 2) * 22 - ((x / 90) % 2) * 10);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  ctx.fill();

  // Rising bubbles.
  for (const b of world.bubbles) {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = PALETTE.cyanSoft;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrb(ctx, world, o) {
  const pulse = 1 + Math.sin(o.phase) * 0.16;
  const r = o.r * o.pulse * pulse;
  const color = o.hue === 'gold' ? PALETTE.gold : PALETTE.cyan;
  glowCircle(ctx, o.x, o.y, r * 3.4, color, 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(o.x - r * 0.25, o.y - r * 0.25, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // Sparkle cross.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  const s = r * 1.7;
  ctx.beginPath();
  ctx.moveTo(o.x - s, o.y); ctx.lineTo(o.x + s, o.y);
  ctx.moveTo(o.x, o.y - s); ctx.lineTo(o.x, o.y + s);
  ctx.stroke();
}

function drawEnemy(ctx, world, e) {
  const spec = ENEMY[e.kind];
  const t = world.time;
  if (e.kind === 'drifter') {
    glowCircle(ctx, e.x, e.y, e.r * 2.6, spec.color, 0.5);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.sin(e.wobble) * 0.2;
      const rr = e.r * (i % 2 === 0 ? 1 : 0.62);
      const px = e.x + Math.cos(a) * rr;
      const py = e.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b0210';
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.15, 3.4, 0, Math.PI * 2);
    ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.15, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'chaser') {
    glowCircle(ctx, e.x, e.y, e.r * 2.8, spec.color, 0.55);
    const ang = Math.atan2(world.player.y - e.y, world.player.x - e.x);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(ang);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.moveTo(e.r * 1.3, 0);
    ctx.lineTo(-e.r * 0.9, -e.r * 0.85);
    ctx.lineTo(-e.r * 0.45, 0);
    ctx.lineTo(-e.r * 0.9, e.r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.r * 0.35, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // splitter: a cracked orange orb with a bright core.
    glowCircle(ctx, e.x, e.y, e.r * 3, spec.color, 0.55);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,10,0,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 0.7, e.y - e.r * 0.4);
    ctx.lineTo(e.x - e.r * 0.1, e.y + e.r * 0.1);
    ctx.lineTo(e.x + e.r * 0.5, e.y - e.r * 0.5);
    ctx.moveTo(e.x + e.r * 0.2, e.y + e.r * 0.6);
    ctx.lineTo(e.x + e.r * 0.6, e.y + e.r * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 0.34 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPowerup(ctx, world, u) {
  const color = u.kind === 'shield' ? POWERUP.shieldColor
    : u.kind === 'magnet' ? POWERUP.magnetColor : POWERUP.slowColor;
  const blink = u.life < 3 ? (Math.sin(world.time * 14) > 0 ? 1 : 0.25) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  glowCircle(ctx, u.x, u.y, u.r * 3, color, 0.55);
  ctx.fillStyle = '#04101f';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(u.kind === 'shield' ? 'S' : u.kind === 'magnet' ? 'M' : 'T', u.x, u.y + 1);
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(
    u.kind === 'shield' ? 'SHIELD' : u.kind === 'magnet' ? 'MAGNET' : 'SLOW',
    u.x, u.y + u.r + 14,
  );
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const blink = world.invuln > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (blink) return;

  // Glow trail.
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const a = Math.max(0, t.life / 0.35) * 0.35 * (1 - i / p.trail.length);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 9 * (1 - i / p.trail.length) + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Lantern glow.
  glowCircle(ctx, p.x, p.y, 74, PALETTE.cyan, 0.5);
  glowCircle(ctx, p.x, p.y, 120, PALETTE.gold, 0.16);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Tail fin.
  const wag = Math.sin(world.time * 9) * 6;
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-34, -12 + wag);
  ctx.lineTo(-30, 0);
  ctx.lineTo(-34, 12 + wag);
  ctx.closePath();
  ctx.fill();
  // Body: a lantern fish.
  const bodyGrad = ctx.createLinearGradient(-20, 0, 22, 0);
  bodyGrad.addColorStop(0, '#0e7490');
  bodyGrad.addColorStop(0.6, '#22d3ee');
  bodyGrad.addColorStop(1, '#a5f3fc');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly light stripes.
  ctx.strokeStyle = 'rgba(255,201,77,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 6); ctx.lineTo(4, 8);
  ctx.moveTo(-4, 10); ctx.lineTo(8, 10);
  ctx.stroke();
  // Eye.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(11, -4, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#04101f';
  ctx.beginPath();
  ctx.arc(12.5, -4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Lantern stalk + bulb.
  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(6, -11);
  ctx.quadraticCurveTo(14, -24, 24, -22);
  ctx.stroke();
  const bulbPulse = 1 + Math.sin(world.time * 4) * 0.15;
  glowCircle(ctx, 24, -22, 16 * bulbPulse, PALETTE.gold, 0.9);
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(24, -22, 6 * bulbPulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Shield ring.
  if (world.shield) {
    ctx.strokeStyle = 'rgba(125,243,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 12 + Math.sin(world.time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Blast cooldown ring.
  if (world.blastCooldown > 0) {
    const frac = 1 - world.blastCooldown / PLAYER.blastCooldown;
    ctx.strokeStyle = 'rgba(125,243,255,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 20, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of world.floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  // Top bar.
  ctx.fillStyle = 'rgba(2,10,20,0.62)';
  ctx.fillRect(0, 0, VIEW.width, 58);
  ctx.fillStyle = 'rgba(55,230,255,0.25)';
  ctx.fillRect(0, 58, VIEW.width, 2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 22, 30);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#9fb8c8';
  ctx.fillText(`BEST ${world.best}`, 22, 48);

  // Combo.
  if (world.combo >= 2) {
    ctx.textAlign = 'center';
    ctx.fillStyle = world.combo >= 8 ? PALETTE.gold : PALETTE.cyan;
    ctx.font = `bold ${22 + Math.min(world.combo, 10)}px system-ui, sans-serif`;
    ctx.fillText(`COMBO x${world.combo}`, VIEW.width / 2, 30);
    const w = 160;
    const frac = Math.max(0, world.comboTimer / ORB.comboWindow);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(VIEW.width / 2 - w / 2, 46, w, 5);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(VIEW.width / 2 - w / 2, 46, w * frac, 5);
  }

  // Wave + quota.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave}/${WAVES.total}`, VIEW.width - 22, 26);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(
    `ORBS ${Math.min(world.orbsCollected, world.orbsNeeded)}/${world.orbsNeeded}`,
    VIEW.width - 22, 48,
  );
  const barW = 150;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(VIEW.width - 22 - barW, 54, barW, 4);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(VIEW.width - 22 - barW, 54, barW * Math.min(1, world.orbsCollected / world.orbsNeeded), 4);

  // Lives (hearts) bottom-left.
  for (let i = 0; i < LIVES; i++) {
    const x = 34 + i * 34;
    const y = VIEW.height - 30;
    ctx.fillStyle = i < world.lives ? '#ff5d7a' : 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x - 12, y - 2, x - 7, y - 12, x, y - 4);
    ctx.bezierCurveTo(x + 7, y - 12, x + 12, y - 2, x, y + 8);
    ctx.fill();
  }

  // Blast cooldown bottom-right.
  const ready = world.blastCooldown <= 0;
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = ready ? PALETTE.cyan : '#7d94a6';
  ctx.fillText(ready ? 'BLAST READY — SPACE / CLICK' : `BLAST ${world.blastCooldown.toFixed(1)}s`, VIEW.width - 22, VIEW.height - 30);
  const bw = 170;
  const frac = ready ? 1 : 1 - world.blastCooldown / PLAYER.blastCooldown;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(VIEW.width - 22 - bw, VIEW.height - 22, bw, 6);
  ctx.fillStyle = ready ? PALETTE.cyan : PALETTE.violet;
  ctx.fillRect(VIEW.width - 22 - bw, VIEW.height - 22, bw * frac, 6);

  // Active power-up timers.
  let ty = VIEW.height - 62;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  if (world.shield) { ctx.fillStyle = POWERUP.shieldColor; ctx.fillText('🛡 SHIELD', 22, ty); ty -= 20; }
  if (world.magnetTimer > 0) { ctx.fillStyle = POWERUP.magnetColor; ctx.fillText(`🧲 MAGNET ${Math.ceil(world.magnetTimer)}s`, 22, ty); ty -= 20; }
  if (world.slowTimer > 0) { ctx.fillStyle = POWERUP.slowColor; ctx.fillText(`⏳ SLOW ${Math.ceil(world.slowTimer)}s`, 22, ty); ty -= 20; }

  // Wave banner.
  if (world.bannerTimer > 0 && world.banner) {
    const a = Math.min(1, world.bannerTimer / 0.6);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 24;
    ctx.fillText(world.banner, VIEW.width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(2,12,24,0.78)';
  ctx.strokeStyle = 'rgba(55,230,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(2,7,15,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A few decorative orbs around the title.
  for (let i = 0; i < 7; i++) {
    const a = world.time * 0.3 + (i / 7) * Math.PI * 2;
    const ox = VIEW.width / 2 + Math.cos(a) * 330;
    const oy = 210 + Math.sin(a * 1.3) * 46;
    glowCircle(ctx, ox, oy, 26, i % 2 ? PALETTE.gold : PALETTE.cyan, 0.5);
  }
  panel(ctx, VIEW.width / 2 - 360, 92, 720, 470);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 30;
  ctx.fillText('LUMEN TIDE', VIEW.width / 2, 168);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('— a lantern-fish arcade —', VIEW.width / 2, 214);
  ctx.fillStyle = PALETTE.foam;
  ctx.font = '17px system-ui, sans-serif';
  const lines = [
    'Pilot your lantern fish through the dark tide.',
    'Gather light orbs to fill each wave — 10 waves to win.',
    'Dodge void wisps: drifters, chasers, and splitters.',
    'SPACE or CLICK fires a pulse blast. Grab S / M / T power-ups.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 258 + i * 28));
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText('WASD / ARROWS move  •  SPACE / CLICK blast  •  P pause  •  R restart', VIEW.width / 2, 396);
  const pulse = 0.65 + Math.sin(world.time * 4) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('▶  PRESS ENTER OR CLICK TO DIVE IN', VIEW.width / 2, 452);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = '#9fb8c8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`BEST SCORE ${world.best}`, VIEW.width / 2, 498);
  }
  ctx.fillStyle = 'rgba(159,184,200,0.8)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('An original game — no assets, no network, pure canvas + WebAudio.', VIEW.width / 2, 532);
}

function drawEndScreen(ctx, world, won) {
  ctx.fillStyle = won ? 'rgba(10,30,8,0.55)' : 'rgba(20,4,10,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 330, 130, 660, 420);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (won) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 30;
    ctx.fillText('🏆 THE TIDE IS LIT!', VIEW.width / 2, 198);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.foam;
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('All 10 waves cleared — the lantern fish shines again.', VIEW.width / 2, 248);
  } else {
    ctx.fillStyle = PALETTE.coral;
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.shadowColor = PALETTE.coral;
    ctx.shadowBlur = 30;
    ctx.fillText('THE LIGHT FADES…', VIEW.width / 2, 198);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.foam;
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('The void wisps swallowed your glow.', VIEW.width / 2, 248);
  }
  ctx.fillStyle = PALETTE.foam;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`FINAL SCORE  ${world.score}`, VIEW.width / 2, 308);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#c8dcea';
  const stats = [
    `Waves cleared: ${world.stats.wavesCleared} / ${WAVES.total}`,
    `Light orbs gathered: ${world.stats.orbs}   •   Wisps blasted: ${world.stats.kills}`,
    `Pulse blasts fired: ${world.stats.blasts}   •   Time: ${Math.floor(world.stats.timePlayed)}s`,
    `Best score: ${world.best}`,
  ];
  stats.forEach((s, i) => ctx.fillText(s, VIEW.width / 2, 352 + i * 28));
  const pulse = 0.65 + Math.sin(world.time * 4) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, 498);
  ctx.globalAlpha = 1;
}

export function renderWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0.3) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);
  for (const o of world.orbs) drawOrb(ctx, world, o);
  for (const u of world.powerups) drawPowerup(ctx, world, u);
  for (const e of world.enemies) drawEnemy(ctx, world, e);
  if (world.phase !== PHASE.TITLE) drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();

  // Red damage flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,40,80,${world.flash * 0.28})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  // Vignette.
  const vg = ctx.createRadialGradient(
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42,
    VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  if (world.phase === PHASE.PLAYING || world.phase === PHASE.PAUSED) {
    drawHud(ctx, world);
    if (world.phase === PHASE.PAUSED) {
      ctx.fillStyle = 'rgba(2,7,15,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.foam;
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('⏸ PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Press P to resume — R to restart', VIEW.width / 2, VIEW.height / 2 + 40);
    }
  } else if (world.phase === PHASE.TITLE) {
    drawTitle(ctx, world);
  } else if (world.phase === PHASE.WIN) {
    drawHud(ctx, world);
    drawEndScreen(ctx, world, true);
  } else if (world.phase === PHASE.OVER) {
    drawHud(ctx, world);
    drawEndScreen(ctx, world, false);
  }
}
