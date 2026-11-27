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
- `?formtest` page that sends a test score to the Google Form in a new tab (diagnose the web leaderboard).
- `?wave=N` starts Endless Mohalla at wave N (to test modifiers, bosses, new cousins).
- `?foes=mama_ji,bowler_bablu,dhaal_dinesh` (new cousins) or `?foes=thali_tiwari,chintu` spawns those cousins in zone 1 wave 1 (any key from `VILLAGE_COUSIN_ROSTER`).
- `?cousinlab` shows every cousin side by side (front + three-quarter) with Fady for comparison. Add `&only=bunty,golu` to pick, `&face` for head close-ups.
- `?botdebug` exposes the Street/Endless engine as `window.__brawl` for Playwright bot playtests (read hero hp, style, enemies).
- `?lineup` trailer shot: the six brothers walk down the street toward the camera (`components/LineupLab.tsx`, time from `performance.now()`).
- Trailer: `qari-jaleel/scripts/trailer/capture3.js` (frame-steps the game at 30 fps by faking `performance.now`/rAF, scripted inputs, burned-in captions; needs the dist server) and `cards3.js` (opener, crawl, reviews, outro). Assemble frames with ffmpeg plus the user's track. Output goes to `trailer/` (git-ignored). Latest: `trailer/mafia-bhaiyas-trailer-hungry-ones.mp4` (38 s).
- `?headlab` shows all six heads. Add `&body` for full bodies, `&body&mid` for torsos, `&only=0,2` to pick fighters (0 Qari, 1 Saf, 2 Dara/Jav, 3 Jam, 4 Chet, 5 Immy).

## Versioning
The version shows bottom-right on the title screen (from `qari-jaleel/package.json`, injected as `__APP_VERSION__`). On EVERY release: run `npm version patch --no-git-tag-version` in `qari-jaleel/` before `npx vite build`, then commit with the push, and tell the user the version. Current: 1.0.99.

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
- `engine/music.ts` (v1.0.99): streams the track through an `<audio>` element + `MediaElementSource` (~2 MB RAM instead of ~64 MB decoded); if it errors or stays silent for 5 s it falls back to decoding the buffer. `window.__music.path` says which. Each extra inlined track adds ~2.9 MB to the bundle. Game music is ONLY the user's own track `src/assets/audio/rain-slicked-escape.mp3` (3:02, ~120 BPM, inlined via `?inline`, decoded without fetch() because the Artifact sandbox blocks it), used for every mode (no synthesised music; user dislikes it). `PLANS` sets tempo (`playbackRate`) and level per mode: `normal | hype | danger | boss | rage | duel`. Modes are set through `soundEngine.setDholIntensity`; `startDholLoop/stopDholLoop` start/stop. `?musicdebug` exposes `window.__music`.
- `engine/street/endlessExtras.ts`: Endless pickups (chai/samosa), no-hit streak multiplier, cousin taunts and hero quips (`data/jokes.ts`), Bullhorn Bhai buffs. Wave plan + modifiers (lathi/rickshaw/mela, boss every 5th, daily seed) in `flow.ts` `planEndlessWave`.
- Background crowd run (fan girls, jolly aunties/uncles, Immy trailing) lives in `streetStage.ts` (`crowdRun`), screams + Immy chat-up lines in `endlessExtras.ts` / `data/jokes.ts`. Street Brawl and Endless only.
- `engine/street/bossMoves.ts`: boss special attacks (`volley`, `summon`, `charge`, `stomp`) driven by `spec.bossMoves` in `villageThugs.ts`. Mini-bosses: Chappal Chaudhary (zone 1), Dhol Daku (zone 2); Bade Tau (final) unlocks specials on rage and gets a final-rage phase below 25% HP. `?foes=chappal_chaudhary` or `dhol_daku` to test.
- `utils/settings.ts` + `components/SettingsPanel.tsx`: persisted settings (music volume/mute, touch button size S/M/L, auto-aim). Opened from the title gear and the pause menu Settings tab.
- `utils/leaderboard.ts` + `components/Leaderboard.tsx`: Endless Mohalla Hall of Fame (top 10, nickname + fighter + wave + score). Online it uses the Artifact `db` capability: one doc per player at `scores/<userId>` (rules: everyone reads, each player writes only their own, owner can moderate). Needs publish with `capabilities: {db:{rules:[{path:"scores",read:"view",write:"owner"},{path:"scores/{self}",write:"interact"}]}, user:{}}` (re-pass these on every publish). Only people with Contributor access can post online; otherwise it falls back to a per-device board. `?lbtest&score=N` shows the name-entry form alone.
- `components/LoadingScreen.tsx`: logo splash shown at boot (`BOOT_MS`) and when a match starts (`MATCH_MS`) in `App.tsx`.
- `engine/powerupDirector.ts`: 3D props for each fighter's power move (chair, car, cue, fan girls...).
- `engine/fighterRig.ts`: body rig, outfits, poses. Each power move has a `case 'powerup_<name>'` pose.
- `engine/stylizedHead.ts`: procedural head sculpt (nose, brow, eyes, beard, hair). Face specs in `engine/faceSculptor.ts`.
- `components/CombatHud.tsx`: HUD, touch pad, speech bubbles, comic countdown clock (`hud.comedyTimer`). Street/Endless top HUD is compact (v1.0.84): active hero bar (nickname, hp, thin power bar) with a slim partner row under it, one-line wave/score box with pause/mute/pad buttons beside it, slim enemy bar (no subtitle). No rickshaw warning banner (user asked to remove it). Zone/wave/round announcer is a small slanted orange ribbon at 24% height (`.zone-pop` animation in `index.css`). Phone zoom for `.hud-top` in `index.css`.

## Fighters and their power moves
Note: Immy (profile id `rebel_shadow`) is a MAN (a sleazy smooth-talking charmer), use he/him and never "her".
Qari (`qari_jaleel`, kind `fady_smoke`) is DONE: "I shall be but two minutes". Fady is now a very eloquent, posh orator who never swears; Jav speaks Punjabi gaaliyan nonstop (khotey, ullu da pattha, kutteya, kanjar, chawal; no mum/sister insults), chats twice as often, and `JAV_GAALIS` is tacked onto his generic quips. Red plastic chair, chai, smoke, countdown clock that stalls on 0:01 then +10:00, cousin banter bubbles, chair smash. Use it as the template for the others.
Saf (`rebel_aviator`) is DONE (man bun, shirt-off flex, bear hug). Chet (`rebel_striker`) look + Kung Fu style is DONE, and his Ford move is DONE (5.8 s scene: investment pitch, "Don't smoke in my car", a smooth extruded red Ford with a roof sign and CHET 12% plates, stock-ticker popups). Jam (`rebel_enforcer`) is DONE: very tall/skinny speedy boxer, snooker move with chalk, practice strokes, ball break and PG-13 innuendo jokes. Jav (`rebel_tactician`) is DONE: huge lazy giant (`lazy_giant` style: slouchy idle, slow uninterruptible 1.9x damage punches, awe popups from onlookers) with the dozing "Nap Time Knockout" move. Immy (`rebel_shadow`) is DONE: "Born To Run" (see below). Still to polish: Qari's look.

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

## PWA (installable app)
`qari-jaleel/public/` has `manifest.webmanifest`, `sw.js` (offline cache, page network-first, assets cache-first) and `icons/`. `utils/pwa.ts` registers the worker (not inside the Artifact frame), captures Chrome's install prompt and drives the title-screen Install button (iOS gets a how-to dialog). Android APK / Play Store is a possible later step (Capacitor or Bubblewrap via GitHub Actions); not started.

## Road to Chacha Chai's + Squad combos
- Chai coins + permanent upgrades live in `utils/upgrades.ts` (localStorage `mafia-bhaiyas-chai-v1`, per device). `getMods()` is read by the engine (max HP, damage, rage gain, pickup drops, wave heal, start rage). Coins are awarded in `flow.ts` `computeScorecard` (Endless: wave*6 + score/500; Brawl: defeated*2 + win bonus). UI: `components/ChachaRoad.tsx`, opened from the title button (coffee icon + coin count). 6 menu items, 26 levels total; road progress = levels bought / total.
- Squad combos: `data/combos.ts` (15 pairs, keyed by sorted fighter ids; Immy is `rebel_shadow`), triggered on a manual tag in `engine/street/squadCombo.ts` (6 s cooldown). Shown on the squad select screen between the two hero cards.

## Immy's move, dhol beat, titles
- Immy's power move is now "Born To Run" (`powerup_immy_run` pose in `fighterRig.ts`, timeline in `powerups.ts`): he strips bare (leg cloth turns skin-coloured via `rig.stripLegs`, kurta flaps hidden) and runs a figure-eight behind a random cover-up (`rig.coverKind`: Harry's pizza box, steel thali, apple, or TV pixel mosaic), cousins flee and faint. The body model has no anatomical detail and is always covered. Settings toggle `immyModest` ("Immy wears boxers") swaps in heart boxers (`rig.modest`). 1v1 Arcade (`combatEngine.ts`) uses the same Born To Run and Ford scene (shorter Arcade versions of the street timelines). Test pose: `?headlab&body&only=5&action=powerup_immy_run&phase=0.5&t=0.3&cover=0`.
- Dhol beat bonus (`utils/beat.ts`, ring in `CombatHud.tsx`): 100 BPM pulse independent of the music (the track's own beat is too loose to sync to). Hits landing as the ring closes give ON BEAT! (+30 score, +3 power, one per beat). Setting `beatBonus`.
- Achievements/titles (`utils/achievements.ts`, `components/TitlesPanel.tsx` as a tab in the Hall of Fame): 20 silly achievements, each a title. `recordRun` runs in `flow.ts` `computeScorecard`. The equipped title shows on Hall of Fame rows; on the web Form it rides in the Fighter column as "Fady|Title".

## Tougher combat (v1.0.82)
- Difficulty is a persisted setting (`settings.difficulty`: novice/pehelwan/grandmaster shown as Easy/Normal/Hard) in Settings, on the Street Brawl roster bar and the Arcade picker. The engine maps it to `difficultyLevel` 0/1/2 (`streetBrawlEngine.ts`); Endless is always Normal. It scales cousin HP (`difficultyScale`), damage (`enemyDmgScale`), wind-up speed, cooldowns, reach, attackers at once (2 / 3 from Zone 2 / up to 4 on Hard), guard and punish chances, and chai healing.
- Cousins fight back: mashing light hits makes thugs/bosses (and sometimes idiots) raise their guard (`block` ThugAction, pose in `villageThugs.ts`); blocked hits do 10% and two blocked hits trigger a COUNTER. Heavies, kicks, sweeps, throws, finishers, weapons or hits from behind cause GUARD BREAK (x1.35 dmg, long stun). Thugs also read your jabs and guard pre-emptively. Wind-up armour: light jabs often don't cancel a committed swing (NO FLINCH!). Whiffed swings can be punished (`onHeroWhiff` in `enemyAI.ts`). Logic in `combat.ts` (`tryEnemyGuard`, `damageEnemy`).
- Dodge fatigue (`hero.dodgeFatigue`): spamming dodge quickly loses its invulnerability (OUT OF BREATH!). Perfect dodge only counts early in the sidestep.
- Style grade D..S (`engine/street/style.ts`): mixing moves, dodges, parries, guard breaks, throws, finishers and on-beat hits fill it; repeats earn little, getting hit costs 30, it drains when idle. Multiplies score (x1..x2). Shown under the combo on the HUD; best grade on the results.
- Pop-up tidy-up (`view.ts` `spawnComicPopup`): max 3 fresh pop-ups, low-priority hit noises and shouts drop when something else is showing; ON BEAT flashes the beat ring instead of text.

## Challenges, comeback, sidesteps (v1.0.86)
- `engine/street/challenges.ts`: one mini challenge per Street Brawl zone / Endless wave (throws, guard breaks, perfect dodges, parry, on-beat hits, finishers, reach style A, 20s no-hit). Progress comes from `addStyle` kinds and hits taken (`stepStyle`). Done = +750 score (x style) and +40 power. Chip under the score box; count on the results.
- Desi Gussa: active hero below 25% HP deals +30% damage (`gussaOn`, set in `stepStyle`, used in `combat.ts` counterMul).
- Cousins (not bosses) sometimes sidestep a heavy as it starts (DODGED!, Normal 18% / Hard 30%) so heavy spam isn't free. The red "!" attack warning bypasses the pop-up cap.

## Practice Yard, new cousins, boss drama, hit feel (v1.0.92)
- Practice Yard: GameMode `practice_yard` (counts as a street mode; title button, roster label "Start Practice"). `ArenaCanvas` sets `engine.practiceMode = true` and restarts. `engine/street/practice.ts`: 8 lessons (combo, heavy/kick, guard break vs Kalu, throw, perfect dodge, parry, style B, power move) fed by `addStyle` hooks; heroes are topped up below 40% HP; zone progression, challenges and elites are off. Lesson panel sits under the score box.
- New cousins in `villageThugs.ts`: `mama_ji` (trait `healer`: walks to a cousin knocked out in the last 14 s and revives him at 50% via `reviveCousin`, `fallenCousins` list), `bowler_bablu` (trait `bowler`, ranged: throws a red cricket ball, the 3rd child of the chappal projectile group; deflect = SIXER!), `dhaal_dinesh` (shield partner). Shield wall: two shield cousins within 1.8 also block frontal heavies (kick, sweep, throw or flank them). Elite gold-turban cousins (`spec.elite`, Zone 2+ / Endless wave 6+, 8/16/25% by difficulty): 1.6x HP, 1.25x dmg, 2x score. New cousins are in zone 2/3 waves and Endless tier 2; Dhaal joins Thali from Endless wave 7.
- Boss drama (`engine/street/bossDrama.ts`): hero reply after the boss battle cry (`HERO_REPLY` per fighter), red warning chip with a tip during special wind-ups (longer wind-ups on Easy/Normal), banter at 75% and 25% HP, 1.4 s slow-mo + last line + BOSS DEFEATED! on the KO. `queueLine`/`speechQueue` for delayed bubbles.
- Hit feel: random pitch/tone per hit (`sound.ts` `playHit`), dust puff + small shake when a launched cousin lands (`spawnDust`), launched cousins tip over in the air and roll once on big landings (`rollTimer`, `view.ts`).

## Silly sheep
`engine/villageSheep.ts`: besides trot/graze/look the sheep randomly does stupid things (`STUPID`: faint stiff on its side, chase own tail, pronk boing, moonwalk, creepy stare at camera) and reports pop-ups via `takeEvents()`. Every 22-40 s the engine (`streetBrawlEngine.ts`, after the sheep startle) sends it charging at a nearby cousin (`chargeAt` + `steer` to follow); the BAA-BOOM headbutt does 12 damage and launches him (SHEEP ATTACK!). Stage exposes `sheep`.

## Fighter finishers, Daily Dhamaal, performance (v1.0.98)
- Each fighter's combo finisher (jab, jab, heavy) has its own effect: `engine/street/signatures.ts` (`SIGNATURE_NAMES`, `announceSignature` on start, `signatureFinisherFx` per hit). Fady GARAM CHAI SPLASH (stuns everyone in front), Saf FLEX TACKLE (shoves the row), Jav BELLY BUMP (launches all around), Jam DROP ME HOME UPPERCUT (sky-high), Chet STOCK CRASH (`markTimer`: +25% damage taken for 4 s), Immy CHARM SLAP (long stun). Arcade mirrors these in `combatEngine.ts` `resolveAttackHit`.
- Daily Dhamaal: GameMode `daily_dhamaal` (street mode, title button shows today's twist and best). `engine/street/daily.ts`: `todaysMod()` by date (lathi, sheep_army, double, glass, chai_rush, giants), local daily best (`saveDaily`). Always Normal. Effects live in `restartMatch`, `spawnWave`, `combat.ts` (glass x2), sheep/chai timers.
- Tips card is v2 (`mafia-bhaiyas-tutorial-v2`): mix it up, energy, red !, Practice Yard.
- Performance: `engine/mergeStatic.ts` bakes static meshes into one mesh per material. Used for shopfronts/trees/banyan/parallax in `streetStage.ts` and per joint in cousin rigs (`villageThugs.ts`, keeping dizzy/aura/bike/shadow separate). Hero rigs are merged too (v1.0.99, per joint in `fighterRig.ts`, keeping flaps, shirt/bare/boxer parts, cover props, sparkles, trails, dizzy face, shadows separate); vertex-coloured meshes (beards/hair) are never merged. Street bunting is one `InstancedMesh` (`pennantMesh`). Busy waves went from ~870 to ~530 draw calls. `?botdebug` also exposes `window.__renderer` (street modes).

## Energy (stamina) bar (v1.0.97)
`engine/energy.ts` is shared by both engines: each strike costs energy (`COST`, jab 5 .. finisher 14; scaled 0.75/1/1.2 by difficulty), a dodge costs 14. It refills after 0.7 s without swinging (26/s standing or guarding, 16/s moving). Below 20 the fighter is TIRED: strikes 1.35x slower, 0.7x damage, dodges give almost no invulnerability. Street: `hero.energy/energyIdle/tiredShown` (`heroControl.ts` startHeroMove + dodge, damage in `combat.ts`). Arcade: `FighterRuntime.energy` in `combatEngine.ts` `startAction`/physics/`resolveAttackHit`. HUD: thin green/yellow/red bar under the power bar (`energy` in `FighterHudState`). Exhaustion (v1.0.98): each time the bar is emptied `exhaust` goes up (max 3) and recovery slows (x0.78/0.56/0.4 via `exhaustRegenMult`), wearing off one level per 30 s; EXHAUSTED!/TOTALLY GASSED! pop-ups and ▼ pips next to the bar.

## Fighting realism (v1.0.95)
- Hit location: `damageEnemy` sets `e.rig.hitKind` (0/3 head snap left/right for jabs/hooks, 1 body for kicks/knees/finishers and some jabs, 2 legs for sweeps/axe kicks); `applyThugPose` hitstun has a pose per kind plus a two-step backward stagger. Sparks spawn at the contact point and height. Knocked-down cousins push up with their hands and a knee to stand. Heroes get head-snap/body-fold hit reactions (`rig.hitKind`, set in `checkEnemyAttackHit`).
- Combo scaling: damage x(1 - 0.05 per hit after 4, min 0.6); hitstun 0.75x after 8 hits; airborne cousins can only be re-launched weakly (no endless juggles).
- Arcade 1v1 / Local 2P (`combatEngine.ts`, v1.0.96) match this: `rig.hitKind` reactions per hit location, contact-point sparks, juggle limit, step-in (`stepInLeft`), dodge fatigue, and smarter AI (blocks more vs repeated moves via `repeatCount`, punishes whiffs via `whiffTimer`, GUARD COUNTER out of block via `counterReady`). It already had body pushbox and combo scaling.
- Body collision: heroes and cousins push apart (`enemyAI.ts`, before cousin separation; cousin gives 75%, boss 40%).

## Street gags (v1.0.94)
`engine/street/gags.ts` (`stepGags` engine timers, `stepEnemyGag` per cousin via `e.gag`): flying chappal on big knockdowns (30%, he hops after it; free hits), surrender below 30% HP when 2 or fewer cousins left (40%; hitting him = SHAMEFUL! +300, waiting = JUST KIDDING! sneak attack), two nearby cousins argue then slap each other (every 25-45 s), samosa drops and the nearest cousin runs for it (grab it first; he heals 15 if he eats it; `spawnPickupAt` in `endlessExtras.ts`), the Chai Wallah walks through every 55-85 s (cousins near him stop, heroes near him heal), idle gags per fighter after 6 s standing still (`IDLE_LINES`). Off in Practice Yard and boss fights.

## Hit ranges (v1.0.89)
Hero hit boxes in `combat.ts` `evaluateHeroAttackHits` use `rangeX*0.82 + bonus*0.8` and `rangeZ*0.72` (backward tolerance -0.25), so hits only land when bodies are close. A short step-in (`hero.stepInLeft`, set in `startHeroMove`, applied in the grounded attack branch of `heroControl.ts`) slides you up to 0.7 toward a cousin just out of reach in front. Enemy hit lane depth is 0.78.

## Zone-clear celebrations
`stepTagHighFive` in `flow.ts` (1.6 s) picks routines via `pickCelebrations`: 30% a paired high five / chest bump, otherwise each fighter does one of their own (`CELEBRATIONS` per fighter id, popups in `CELEBRATE_CALLS`). Poses live in `fighterRig.ts` `case 'high_five'` switched on `rig.celebrateKind` (0 high five, 1 chest bump, 2 bhangra, 3 flex, 4 dab, 5 thumka, 6 namaste bow, 7 spin pump, 8 arms folded, 9 shadow boxing, 10 kung fu salute + crane, 11 blow a kiss, 12 yawn stretch). Solo routines face the camera (`view.ts`). Comic gags (v1.0.91, 2.3 s): `rig.celebrateGag` makes the second half go wrong (high five misses 60%, chest bump knocks the partner on his bum, pulled back, kurta rip shake, over-dab spin, wild thumka, bow-bonk, dizzy plop, nodding off, self-punch, crane topples, swoon, falls asleep); 80% of solo routines gag. The victim says a line from `GAG_LINES` in `flow.ts` (Jav adds a gaali) with a pop-up. Preview: `?headlab&body&only=0&action=high_five&phase=0.8&t=0.4&cel=2&gag`.

## Speech bubbles
Bubbles are anchored above the speaker: `speechAnchor` in `view.ts` (Street/Endless: hero by profile name, cousin by `spec.name`, generic "Cousin"/"Cousin 2" sticks to the nearest cousin for that line) and `bubbleAnchor` in `combatEngine.ts` (1v1, by side). The HUD (20 Hz) places them at `xPct/yPct` with a 90 ms CSS glide; falls back to left/right side if no anchor. Linger factor is `realDt * 0.85`.

## Auto-rickshaw
The passing hazard model is in `streetStage.ts` (search `CNG auto`): extruded green tub + cowl, curved yellow canvas roof, open sides with seats and a driver, chrome pillars, glass windscreen, spoked wheels (groups spun on Z in `enemyAI.ts` `updateAutoRickshaw`), DL plate, RAJA AUTO side decals and HORN OK PLEASE on the back.

## Share card
`utils/shareCard.ts` draws a 1200x630 funny result picture on a canvas (logo, hero portraits, wave/rank, score, equipped title, caption in a speech bubble). `components/ShareCard.tsx` shows it with Share (Web Share API with the file) and Save. Opened from the Share button on the Street Brawl / Endless results screen.

## Smashable scenery
Fixed props are slimmer (pillars 0.6x wide/0.74x tall, haystacks/stalls/charpoys/pumps ~0.8x) and `streetStage.ts` exposes `smashProps` (pillars 3 hp, charpoys/hand pumps/chai stalls 2 hp). Hero strikes (`combat.ts` section 1c, `smashPropFx`), thrown cousins bouncing off pillars, and the rickshaw damage them; at 0 hp they shatter into debris, popup + 100 score. `resetProps` restores them. Broken props stop bouncing cousins or splashing.

## Cousin look
`engine/thugParts.ts` holds the shaped cousin parts: `torsoGeometry(bulge)` (one lathe torso with the pot belly pushed out of the front, no separate belly ball), `limbGeometry` (tapered rounded limbs hanging from their joint), fists, chappal feet, `ribbonGeometry` (draped checked gamcha) and `fabricTexture` (woven plain/check/stripe/madras, picked per cousin by `hashString(name)`). `villageThugs.ts` keeps the same joint groups so `applyThugPose` is unchanged. Release 1 done (bodies, bellies, hands, clothes). Release 2 done: one-piece `headGeometry` heads with stubble, expressive eyes/brows/moustaches/teeth, boss costumes (Bade Tau shawl, Chappal Chaudhary bandolier, Dhol Daku drum), rebuilt Raju bike (`buildRajuBike` in `villageThugs.ts`, also used for the parked/rideable street bike in `streetStage.ts`), livelier idle (breathing, idiot shuffle, thug guard).
