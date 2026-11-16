// Lumen Tide — the entry program. Copies game/ and screenshots/ from this
// repository into the output directory and writes dossier.json with the kit's
// buildDossier, byte for byte the way the scorer rebuilds it.
//
// Deterministic: the same repository always writes the same output bytes.
// Run it twice into two directories and compare — the bytes must match.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

if (!existsSync(gameDir)) throw new Error(`game/ not found at ${gameDir}`);
if (!existsSync(shotsDir)) throw new Error(`screenshots/ not found at ${shotsDir}`);

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`Lumen Tide entry written to ${outputDir}`);
console.log(`dossier.json: ${Buffer.byteLength(dossier, 'utf8')} bytes`);
