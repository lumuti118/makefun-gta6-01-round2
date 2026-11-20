# Palmera Bay — Open-World Crime (gta6-01, repo4 rebuild)

Round-2 rebuild of the same game, written fresh in one recorded session
(including this file and README.md, which are part of the build commit).
Same design as the earlier build: three.js r158 vendored under
game/vendor/three.min.js; original names only (Palmera Bay, Leo Marlin,
Mara Voss, Harbor Kings, Bay PD).

Systems: 400x400 grid city (9x9 roads, ~64 buildings, palms, lamps, park
+ fountain, beach + animated water, yacht, neon landmarks); on-foot +
driving (6 vehicle types, 14 traffic cars, 26 pedestrians); car theft
with wanted level; 0-5 star wanted + PD interceptors and foot cops;
6 story missions with pink beacon, minimap waypoint and $300-$5,200
rewards, win screen "Debt Paid" at $10,000; pistol/punch combat;
HUD (money, debt, health, ammo, stars, clock, mission bar, live canvas
minimap, speed); title/pause/busted/wasted/win screens; localStorage
save + autosave; synthesized WebAudio (engine, sirens, shots, jingles,
synthwave bassline, starts after first gesture).

Files: game/index.html, game/src/{config,rng,input,audio,city,vehicles,
pedestrians,player,missions,wanted,police,effects,hud,save,game,shots,
main}.js, main.ts, serve.ts, shots.json, screenshots/ (4 JPGs),
vendor/makefun-game.ts (kit copy), README.md, LICENSE.

Testing: headless Chromium (Playwright, swiftshader) — all 4 ?shot=
scenes render with zero console/page errors; screenshots inspected
visually. Live play test: start, steal parked car (wanted 1, PD
responds), drive, exit, shoot, mission 1 progresses, save written.
Dossier built with MAKEFUN_OUTPUT_DIR; kit `makefun check` passes.
