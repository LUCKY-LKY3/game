# Project notes (read first)

Two games live in this repo:
- `index.html` (repo root): small 2D "Street Dragons" brawler prototype. Not the focus now.
- `qari-jaleel/`: the main game, titled "Mafia Bhaiyas" (logo: `src/assets/images/mafia-bhaiyas-logo.png`, inlined on the title screen). 2.5D village street brawler. React 19 + three.js + Vite 8 + Tailwind 4. Touch-first, played on a phone.

## User preferences
- Keep replies short. Be efficient with tokens: no screenshots or previews unless truly needed, batch several changes per build, republish the phone link once per batch.
- The user plays on a phone via the Artifact link below. Landscape.
- Do not use real people's photos for faces. Faces are sculpted 3D (see `stylizedHead.ts`). The friend-photo import feature was removed on purpose.
- Develop on branch `ccr-9174e2d3-aerkrs`. Commit and push when done. Do not open PRs unless asked.

## Commands (run in `qari-jaleel/`)
- `npm install` then `npx vite build` (output `dist/`). `npx tsc --noEmit` should be clean.
- Serve for testing: `python3 -m http.server 4173 --directory qari-jaleel/dist` (use `--directory`, the build wipes `dist/`).
- Playwright headless works: launch chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. Headless renders low quality and runs roughly 3x slower than real time, so a 6 second power move takes about 20 seconds of wall clock.

## Debug URL flags
- `?hq` force full render quality. `?closeup` camera beside the hero. `?fullrage` start with the power meter full (press T to fire the power move).
- `?foes=thali_tiwari,chintu` spawns those cousins in zone 1 wave 1 (any key from `VILLAGE_COUSIN_ROSTER`).
- `?headlab` shows all six heads. Add `&body` for full bodies, `&body&mid` for torsos, `&only=0,2` to pick fighters (0 Qari, 1 Saf, 2 Dara/Jav, 3 Jam, 4 Chet, 5 Immy).

## Phone link (Artifact)
URL: https://claude.ai/artifact/7fV9u8NTgFrW2x1TYb4mH9 (private, update in place, same file path each time).
1. `npx vite build` in `qari-jaleel/`.
2. `python3 qari-jaleel/scripts/make-artifact.py` builds a publish folder in `/tmp/qj-artifact` and prints the new JS filename.
3. Artifact publish with `file_path=/tmp/qj-artifact/index.html`, `root=/tmp/qj-artifact`, `files={"assets/<new>.js": "assets/<new>.js", "assets/<old>.js": null}`. Find the old JS name with Artifact `list` scope `files`. Images were uploaded already, only resend them if they change (they are in `/tmp/qj-artifact/src/assets/images`).
Artifact pages cannot load anything from the internet except Google Fonts, so keep everything bundled.

## Code map (`qari-jaleel/src/`)
- `data/roster.ts`: the six fighters, outfits, `specialMoveName`, taunts.
- `engine/streetBrawlEngine.ts`: the `StreetBrawlEngine` class shell (constructor, `step` loop, setup). Its subsystems are plain functions in `engine/street/*.ts` bound onto the class as `name = module.name` and typed `this: StreetBrawlEngine`:
  `types.ts` (HeroRuntime, EnemyRuntime...), `data.ts` (HERO_MOVES, STREET_ZONES, boons, constants), `props.ts`, `enemyAI.ts` (enemy AI, projectiles, rickshaw), `heroControl.ts` (input, clinch, dodge, moves), `partnerAI.ts` (tag partner AI, switch, assist, revive), `powerups.ts` (`startHeroPowerup`, `stepHeroPowerup`), `combat.ts` (hit resolution, `damageEnemy`, finishers, props), `flow.ts` (waves, zones, scorecard, boons), `view.ts` (camera, rig rendering, HUD snapshot, particles, popups). Add new methods to the matching file, then bind them in the class field block at the top of `StreetBrawlEngine`.
- `engine/music.ts`: game music is ONLY the user's own track `src/assets/audio/rain-slicked-escape.mp3` (3:02, ~120 BPM, inlined via `?inline`, decoded without fetch() because the Artifact sandbox blocks it), used for every mode (no synthesised music; user dislikes it). `PLANS` sets tempo (`playbackRate`) and level per mode: `normal | hype | danger | boss | rage | duel`. Modes are set through `soundEngine.setDholIntensity`; `startDholLoop/stopDholLoop` start/stop. `?musicdebug` exposes `window.__music`.
- `components/LoadingScreen.tsx`: logo splash shown at boot (`BOOT_MS`) and when a match starts (`MATCH_MS`) in `App.tsx`.
- `engine/powerupDirector.ts`: 3D props for each fighter's power move (chair, car, cue, fan girls...).
- `engine/fighterRig.ts`: body rig, outfits, poses. Each power move has a `case 'powerup_<name>'` pose.
- `engine/stylizedHead.ts`: procedural head sculpt (nose, brow, eyes, beard, hair). Face specs in `engine/faceSculptor.ts`.
- `components/CombatHud.tsx`: HUD, touch pad, speech bubbles, comic countdown clock (`hud.comedyTimer`).

## Fighters and their power moves
Qari (`qari_jaleel`, kind `fady_smoke`) is DONE: "I'll be 2 mins bro". Red plastic chair, chai, smoke, countdown clock that stalls on 0:01 then +10:00, cousin banter bubbles, chair smash. Use it as the template for the others.
Saf (`rebel_aviator`, `saf_hug`) bear hug, Dara/Jav (`jav_story`) storytime slap, Jam (`jam_snooker`) snooker cue, Chet (`chet_ford`) red Ford runover, Immy (`immy_girls`) fan squad. All exist but need the same comic polish as Qari's.

## Comic move recipe (from Qari)
1. Speech bubbles via `this.speechBubble` + `this.speechTimer` in the engine.
2. Timeline by `phase` (0..1) inside `stepHeroPowerup`, using `hero.powerupHitsMask` bits so each beat fires once.
3. Props and animation in `powerupDirector.ts`; pose in `fighterRig.ts`.
4. Longer `actionDuration` and matching `invulnTimer` in `startHeroPowerup`.
5. Ask the user for one in-joke or catchphrase per fighter before writing the gag.
