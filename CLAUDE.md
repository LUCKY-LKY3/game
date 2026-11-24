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
- `?wave=N` starts Endless Mohalla at wave N (to test modifiers, bosses, new cousins).
- `?foes=thali_tiwari,chintu` spawns those cousins in zone 1 wave 1 (any key from `VILLAGE_COUSIN_ROSTER`).
- `?headlab` shows all six heads. Add `&body` for full bodies, `&body&mid` for torsos, `&only=0,2` to pick fighters (0 Qari, 1 Saf, 2 Dara/Jav, 3 Jam, 4 Chet, 5 Immy).

## Versioning
The version shows bottom-right on the title screen (from `qari-jaleel/package.json`, injected as `__APP_VERSION__`). On EVERY release: run `npm version patch --no-git-tag-version` in `qari-jaleel/` before `npx vite build`, then commit with the push, and tell the user the version. Current: 1.0.55.

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
- `engine/street/endlessExtras.ts`: Endless pickups (chai/samosa), no-hit streak multiplier, cousin taunts and hero quips (`data/jokes.ts`), Bullhorn Bhai buffs. Wave plan + modifiers (lathi/rickshaw/mela, boss every 5th, daily seed) in `flow.ts` `planEndlessWave`.
- Background crowd run (fan girls, jolly aunties/uncles, Immy trailing) lives in `streetStage.ts` (`crowdRun`), screams + Immy chat-up lines in `endlessExtras.ts` / `data/jokes.ts`. Street Brawl and Endless only.
- `engine/street/bossMoves.ts`: boss special attacks (`volley`, `summon`, `charge`, `stomp`) driven by `spec.bossMoves` in `villageThugs.ts`. Mini-bosses: Chappal Chaudhary (zone 1), Dhol Daku (zone 2); Bade Tau (final) unlocks specials on rage and gets a final-rage phase below 25% HP. `?foes=chappal_chaudhary` or `dhol_daku` to test.
- `utils/settings.ts` + `components/SettingsPanel.tsx`: persisted settings (music volume/mute, touch button size S/M/L, auto-aim). Opened from the title gear and the pause menu Settings tab.
- `utils/leaderboard.ts` + `components/Leaderboard.tsx`: Endless Mohalla Hall of Fame (top 10, nickname + fighter + wave + score). Online it uses the Artifact `db` capability: one doc per player at `scores/<userId>` (rules: everyone reads, each player writes only their own, owner can moderate). Needs publish with `capabilities: {db:{rules:[{path:"scores",read:"view",write:"owner"},{path:"scores/{self}",write:"interact"}]}, user:{}}` (re-pass these on every publish). Only people with Contributor access can post online; otherwise it falls back to a per-device board. `?lbtest&score=N` shows the name-entry form alone.
- `components/LoadingScreen.tsx`: logo splash shown at boot (`BOOT_MS`) and when a match starts (`MATCH_MS`) in `App.tsx`.
- `engine/powerupDirector.ts`: 3D props for each fighter's power move (chair, car, cue, fan girls...).
- `engine/fighterRig.ts`: body rig, outfits, poses. Each power move has a `case 'powerup_<name>'` pose.
- `engine/stylizedHead.ts`: procedural head sculpt (nose, brow, eyes, beard, hair). Face specs in `engine/faceSculptor.ts`.
- `components/CombatHud.tsx`: HUD, touch pad, speech bubbles, comic countdown clock (`hud.comedyTimer`).

## Fighters and their power moves
Note: Immy (profile id `rebel_shadow`) is a MAN (a sleazy smooth-talking charmer), use he/him and never "her".
Qari (`qari_jaleel`, kind `fady_smoke`) is DONE: "I'll be 2 mins bro". Red plastic chair, chai, smoke, countdown clock that stalls on 0:01 then +10:00, cousin banter bubbles, chair smash. Use it as the template for the others.
Saf (`rebel_aviator`) is DONE (man bun, shirt-off flex, bear hug). Chet (`rebel_striker`) look + Kung Fu style is DONE (his Ford runover move still needs comic polish). Jam (`rebel_enforcer`) is DONE: very tall/skinny speedy boxer, snooker move with chalk, practice strokes, ball break and PG-13 innuendo jokes. Jav (`rebel_tactician`) is DONE: huge lazy giant (`lazy_giant` style: slouchy idle, slow uninterruptible 1.9x damage punches, awe popups from onlookers) with the dozing "Nap Time Knockout" move. Still to polish: Immy (`immy_girls`), Qari's look, Chet's Ford move.

## Comic move recipe (from Qari)
1. Speech bubbles via `this.speechBubble` + `this.speechTimer` in the engine.
2. Timeline by `phase` (0..1) inside `stepHeroPowerup`, using `hero.powerupHitsMask` bits so each beat fires once.
3. Props and animation in `powerupDirector.ts`; pose in `fighterRig.ts`.
4. Longer `actionDuration` and matching `invulnTimer` in `startHeroPowerup`.
5. Ask the user for one in-joke or catchphrase per fighter before writing the gag.

## Later (web release)
Web leaderboard is CONFIGURED in `src/config.ts` (user's Google Form + Sheet). It only runs on a normal website; the Artifact uses its own db. Not yet tested against Google (sandbox cannot reach it). Needs web hosting to use. See `qari-jaleel/WEB_LEADERBOARD.md`.

## Web hosting (GitHub Pages)
`.github/workflows/deploy-web.yml` builds `qari-jaleel/` on every push to the dev branch (or main) and publishes `dist/` to the `gh-pages` branch; GitHub Pages serves that branch. Vite `base` is `./` and image paths in `roster.ts` are relative (`src/assets/...`) so it works at any URL path.
