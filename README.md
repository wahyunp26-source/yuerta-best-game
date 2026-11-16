# Lumen Tide

![best-game-01](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/wahyunp26-source/yuerta-best-game/rank.svg)
![reward](https://make.fun/badge/best-game-01/wahyunp26-source/yuerta-best-game/reward.svg)

**Lumen Tide** is an original 2D arcade game for [make.fun's best-game-01](https://make.fun/bounty/best-game-01) bounty. You pilot a lantern fish through a dark sea: gather light orbs, dodge void wisps, and light all **10 waves** before your three lives run out.

## How to play

| Control | Action |
|---|---|
| WASD / Arrow keys | Swim |
| Space or mouse click | Pulse blast — shatters nearby wisps (cooldown) |
| P | Pause |
| R | Restart |
| M | Mute |

- **Light orbs** score points and build your combo (up to x6). Chain pickups before the combo timer runs out.
- **Void wisps** come in three kinds: slow **drifters**, hunting **chasers**, and **splitters** that burst into two drifters when blasted.
- **Power-ups**: 🛡 Shield (blocks one hit), 🧲 Magnet (pulls orbs to you), ⏳ Slow Time (halves wisp speed).
- Clear a wave's orb quota to advance. Finish wave 10 and the tide is lit — **you win**. Lose all 3 lives and the light fades.

## What makes it shine

- Pure vanilla canvas + WebAudio: every pixel and every sound is synthesized live — no assets, no libraries, no network requests.
- Glow palette (deep blue, cyan, gold), particles, screen shake, damage flash, floating score text, and a pulsing lantern-fish trail.
- Deterministic screenshot scenes (`?shot=title|play|win|over&seed=N`) so the title, mid-game, victory, and game-over screens are real renders of the same code.
- Best score saved in `localStorage`.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080 — open it and play
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22 stdlib only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `buildDossier`. Two runs produce byte-identical output.

## Layout

```
game/
  index.html          the page
  src/
    config.js         tuning constants + palette
    random.js         seeded RNG (mulberry32)
    input.js          keyboard + mouse state
    audio.js          WebAudio synth effects + ambient pad
    world.js          pure game logic (no DOM — unit-testable in Node)
    render.js         canvas drawing, HUD, title/win/over screens
    shots.js          deterministic ?shot= scenes
    main.js           bootstrap + game loop
main.ts               the entry program
vendor/makefun-game.ts  the kit's dossier library, unchanged
```

## License

MIT — see [LICENSE](LICENSE).
