# Wayezy – 3D wayfinding (kiosk, mobile app, admin hub)

**Wayezy** is BrainADZ Live's wayfinding product, the demo on the website for clients. It is a copy of the Ireo Boulevard
app (`D:\ireo-wayfinding`, kept as it was) with every feature, in the BrainADZ Live look: navy, red and white,
Poppins, the Wayezy logo (`data/brand/`, made usable by `blender/make_logo.py`; the icon is `data/brand/icon.html`).
The demo venue is Ireo Boulevard, whose floor plans the map is built from; its name comes from Admin → Settings →
Mall name. It runs on port **8766** (`node server.js`), so it and the Ireo app (8765) can run side by side.

One web page with three views that share one data layer:
**Kiosk** (in-mall screen), **Mobile app** (phone UI), **Admin hub** (mall team, store and restaurant managers).
Version 6 (Sept 2026): rebuilt routing and search, crash-proof map, new map animations, and two
Blender pipelines (a cinematic attract film for idle kiosks, and baked shading for the live map).
Round 3 adds hands-free route mode (full-screen guidance, spoken steps, vibration, auto-return), live store
info on every card, kiosk ad airtime with a master-admin console and a store portal, and upper floors that
look down into the voids through glass balustrades.
Round 6 (28 Sept): a demo server that keeps the admin hub, kiosks and phones in step on any device; new Blender
trees (rendered leaves, sky light baked in Cycles) and Blender water (FFT ocean normals and caustics); the mall
set in a neighbourhood that fades into the page; rooftop logo plaques; smooth floor changes; spoken directions
that never cut themselves off. See `CHANGES.md` for everything that was fixed.

## Folders
| Folder | What is in it |
|---|---|
| `assets/` | Every 3D asset ready to use elsewhere (made by `blender/package_assets.py`): `models/*.glb` (one per tree, palm, shrub, lamp, bollard, gate, plus the all-in-one kit), `blender/ireo_asset_kit.blend` (all of them laid out, editable, textures packed, fountain pool that runs), `textures/` (the Blender-rendered leaf, flower and frond cards), `water/` (normal map and caustics), `previews/` and `renders/`. See `assets/README.md`. |
| `server.js` | The demo server (Node 18+, no packages): serves `web/` and holds the live data in `data/live-db.json`, pushing every change to every open screen. |
| `web/` | The product. `index.html`, `styles.css`, `css/photos.css` (store photo rules; the photos are `media/photos/*.jpg`), `js/*.js` (modules below), `media/` (attract film + poster, intro films, store photos). `build_single_file.py` builds `dist/ireo-boulevard.html` (everything inlined) + `dist/media/`. |
| `data/` | `mall_plan_coordinates.json` – every unit, core, toilet, walkway and routing segment traced from the PDFs (PDF point coordinates). The three PDFs share one drawing frame (the lift shafts line up), so `align_to_pdfs.py` uses every floor exactly as traced and writes `mall_registered.json` (the product's data) and `web/js/data.js`. `mall_registered_warped_v5.json` is the older version whose Ground and Second floors were warped to line up with the First floor. `store_photos.json` – store photos from ireoboulevard.com. |
| `blender/` | `render_textures.py` renders the leaf, flower and palm-frond cards in Cycles (`blender/tex/`); `bake_water.py` + `make_water_js.py` make the pool water (`web/js/water.js`); `package_assets.py` fills `assets/`. `assets.py` is the asset kit (canopy trees, palms, bushes, street lamps, bollards, the entrance gate with the real logo, fountains with animated water) shared by the film and the web map; `export_decor.py` + `make_decor_js.py` put it in the web app (`web/js/decor.js`); `make_textures.py` draws the leaf and frond textures (`blender/tex/`). `build_model.py` builds the scene; `attract.py` renders the kiosk attract film; `encode_video.py` makes the MP4; `bake_shade.py` + `make_shade_js.py` bake the live map's shading; `render.py` renders stills; `export_glb.py` exports the GLB. Blender 4.2 LTS. |
| `tests/` | `engine.test.js` – routing, directions, search and balustrade tests against the real mall data; `adsched.test.js` – the ad scheduler; `qr.test.js` – the kiosk's QR codes, read back by an independent decoder; `server.test.js` – the server's member API; `export_rails.js` and `export_attract_route.js` write `blender/rails.json` and `blender/attract_route.json` for the film; `accuracy_overlay.py` draws the map over each PDF (`renders/accuracy-check-*.png`). |
| `floor-plans/` | The source PDFs. |
| `renders/` | Finished renders and the accuracy-check overlays (the live map drawn over each floor-plan PDF). |

## Running
- **Online for a client:** double-click `start-live.cmd` for a public link from this laptop, or deploy to Render for a permanent one. Step by step in `DEPLOY.md`. The admin hub asks for the admin password (`data/admin-password.txt`, or `ADMIN_KEY` on a host); kiosks and phones need none.
- **Demo (recommended):** `node server.js` and open `http://localhost:8765/` (kiosk `?view=kiosk`, phone `?view=app`, admin `?view=admin`). Anything saved in the admin hub appears on every open kiosk and phone within a second.
- **Phones and other screens on the same Wi-Fi:** `node server.js --lan` prints this computer's address (e.g. `http://192.168.1.20:8765/`). Windows may ask once whether Node may accept connections on the network. The admin hub has no sign-in in this demo, so use `--lan` only on a trusted network.
- **Without the server:** `python -m http.server 8765 --directory web`, or open `web/dist/ireo-boulevard.html` from disk. It all works, but live data then stays on this browser (kiosk, app and admin tabs in the same browser still sync).
- **URL options:** `?view=kiosk|app|admin` · `&lock=1` hides the demo view switcher (and turns on kiosk self-recovery) · `&at=G,374,699` kiosk position · `&heading=90` kiosk facing · `&to=bellagio` open straight to a store's route (QR codes on posters, and the kiosk's own QR code: `?view=app&at=…&to=…&lang=…` opens the route on the phone from that kiosk) · `&quality=low` weak hardware · `&map=2d` flat floor plan · `&mode=evening` · `&idle=120` seconds before the kiosk resets and plays the film · `&attract=0` no film · `&kiosk=K2` which kiosk this screen is, for its ad line-up (Admin → Kiosks gives each kiosk its full link).
- **Tests:** `node tests/engine.test.js`, `node tests/adsched.test.js`, `node tests/qr.test.js` and `node tests/server.test.js`.
- **After editing files in `web/`:** bump the `?v=` number on the script and style links in `index.html`, so kiosks and browsers fetch the new files instead of cached ones (the one-file build ignores it).
- **Phones:** opening the page on a phone goes straight to the app view. It can be installed to the home screen (`manifest.webmanifest`); the installed app opens with `?view=app&lock=1`.
- **Offline kiosks:** three.js r147 is loaded from the jsDelivr CDN. To run with no internet, put `three.min.js`, `OrbitControls.js` (r147, `examples/js/controls/`) and `GLTFLoader.js` (r147, `examples/js/loaders/`) in `web/vendor/` – they are picked up automatically and inlined by the build script. Without either, the kiosk still works with the 2D map.

## How the web code is organised (`web/js/`, loaded in this order)
| File | Job |
|---|---|
| `errors.js` | Catches every error, keeps a log (shown in Admin → Settings), self-recovers locked kiosks. |
| `intro.js` | The Wayezy intro (3.4 s) over the page from the first paint: drawn by the page from the logo artwork (sharp on any screen), with the intro film's sound (`media/intro.aac`). When the kiosk or the phone app opens and when the admin hub is entered (after the sign-in). Loaded at the top of `<body>`, right after `#intro`. A touch, click or key skips it; `?intro=0` turns it off (tests, the film recorder). |
| `data.js`, `assets.js` | Mall geometry, brands, logos, icons, photo index (generated). |
| `motion.js` | Selections glide: one `.glider` per tab bar (chips, tabs, floors, segmented controls, the admin menu) slides to the selected button; `patchHTML()` redraws a bar in place so colours ease; `afterPaint()` lets a tap's quick answer show before its heavier work; `swapIn()` eases a new tab's content in. |
| `engine.js` | Pure logic, no DOM: units, walk graph, Dijkstra routing (edge weights in seconds), turn-by-turn directions with landmarks in English or Hindi (`directions(r,{lang:'hi'})`), typo-tolerant search with synonyms (English and Hindi words). Runs in Node for the tests. |
| `i18n.js` | English / हिन्दी: the Hindi for every visitor-facing word (`T()` interface, `tr()` plan names, `tc()` sample content), Hindi clock and dates, `setLang()`. Brand names are never translated. |
| `qr.js` | QR codes (ISO/IEC 18004: byte mode, level M, versions 1-10, best mask), pure logic: `qrMatrix()`, `qrSVG()`. The kiosk shows one on its home panel (the map on your phone, from this kiosk) and on every route card (this route on your phone). The link is Admin → Settings → App link, or the page's own address. |
| `datastore.js` | Live data (offers, wait times, events, users, kiosks, ad airtime…). claude.ai database when published there, otherwise a local store that syncs kiosk/app/admin tabs in one browser. |
| `adsched.js` | Pure ad scheduler: which ads play on a kiosk now, when the line-up next changes, how much airtime is free, the best free slot, free/paid ad allowance. Runs in Node for the tests. |
| `shade.js` | Baked shading images from Blender (generated). |
| `water.js` | The pool water from Blender: a tiling normal map of the FFT ocean and the caustics it casts (generated by `blender/make_water_js.py`). |
| `decor.js` | The Blender asset kit as a GLB (trees, palms, bushes, lamps, bollards, gate) plus the fountain layout (generated by `blender/make_decor_js.py`). |
| `map3d.js` | The three.js map: buildings, water and fountains (the Blender jet layout: glassy arcing jets, geysers, spray, ripples), the Blender asset kit (trees, palms, gate, lamps; built-in versions if it cannot load), route animation, guided walk; upper floors show the floors below through the voids, with glass balustrades. |
| `map2d.js` | SVG floor plan with the same API, used when WebGL is missing or fails. |
| `mapview.js` | Floor buttons, map controls, "you are here" origin; starts the 3D map or falls back to 2D. |
| `ui.js` | Kiosk panel, phone app, search, idle/attract mode (15 s without a touch: back to the ads; the next visitor starts in English again), store cards with live wait time, specials and offers, the language buttons (kiosk start screen and bar, the pill in the phone's header). |
| `member.js` | Members (phone app): sign-in with a mobile number and a one-time code, the member card, members-only offers, saved stores, points, the Account tab. Talks to `/api/member/*` on the server; members are never part of the live data. |
| `voice.js` | Spoken directions (Web Speech; Indian English or natural voices first, Hindi voices when the visitor chose हिन्दी, English speech where the device has no Hindi voice) with a sentence queue: every sentence finishes, route mode can wait for it. Vibration on phones. |
| `routemode.js` | "Take me here": kiosk panel folds away / phone map goes full screen, step card, next step, destination, controls, arrival card, back to search by itself. The walker and the voice move together: each step is announced a few metres early and the walker waits at the corner until the last sentence is finished. |
| `adplayer.js` | Plays this kiosk's ads: a sponsored card in the panel and full-screen ads on the idle screen; switches line-ups at every window edge; counts plays. |
| `admin.js` | Admin hub, store portal and permissions. |
| `adadmin.js` | Ads & slots, Kiosks, Add a store (master admin); My kiosk ads and the store dashboard (store portal). |
| `boot.js` | Starts everything; registers `sw.js` (offline copy of the app). |

## The app tour (50 s, 1080p): a product walkthrough
A screen film of the real kiosk at night, like a product demo: the app's intro, the mall's floors lifting apart, then
one take of the kiosk (a sweep in over the lit mall, Dining with live wait times, Bellagio and its route over the
floors with the phone code beside it, "Take me here" and the walk up the escalators, the arrival), the route across
the lifted floors, and an end card with the logo.
1. `blender -b --factory-startup -P blender/launch_music.py -- OUT/tour_music.wav 3` (the music at 50 s: 3 cycles).
2. With the demo server running: `node blender/launch_record.js OUT/rec http://127.0.0.1:8766 tour_intro tour_app tour_end`
   (about 5 minutes; the kiosk is recorded in its Evening mode, frame by frame on the virtual clock).
3. The Blender shots `explode` and `route` from the launch film (step 3 below), in OUT/frames.
4. `blender -b --factory-startup -P blender/tour_edit.py -- OUT/rec OUT/frames OUT/tour_music.wav OUT/wayezy-app-tour.mp4`
   (the timeline and the cuts are at the top of tour_edit.py; `... OUT/check.png 400` renders one frame to check a cut).

## The launch film (80 s, 1080p, original music)
Everything is made here, from the app itself and the Blender model; nothing is downloaded or licensed.
1. `blender -b --factory-startup -P blender/launch_music.py -- OUT/launch_music.wav` composes the music (96 BPM, D major, 32 bars of 2.5 s).
2. With the demo server running: `node blender/launch_record.js OUT/recordings` records the real app being used, frame
   by frame at 24 fps, in a headless Chrome/Edge: on the kiosk a search typed on its keyboard, Bellagio tapped, the route
   and its steps, then "Take me here" and the guided walk to the door (played at twice its speed); on the phone the home
   screen and offers scrolled, the member card, Find my car; the kiosk switching to Hindi; the phone opened from the
   kiosk's QR code (the route from that kiosk) and from a basement pillar's code (the parking spot saved); and stills:
   the pillar sign, a camera's scanning frame, the Hindi title (in Hind, the app's Hindi face). The page runs on a virtual clock (timers, animation frames,
   CSS transitions, smooth scrolling), so the recording is smooth however slow the screenshots are. Taps show as a soft
   circle. It signs in a demo member and removes it again. The takes and their timing are the `TAKES` list there;
   `--every 8` makes a quick preview.
3. `blender -b -P blender/launch.py -- SHOT OUT/frames` for SHOT = aerial, explode, route (EEVEE, ~9 s a frame here)
   and `blender -b --factory-startup -P blender/launch_devices.py -- SHOT OUT/recordings OUT/frames` for kiosk_find,
   kiosk_walk, kiosk_lang, kiosk_qr, phone_home, phone_offers, phone_member, phone_park, phone_car (~6 s a frame; the
   recording plays on the screen; in kiosk_qr and phone_park a phone is held up to the kiosk's or the pillar's QR code,
   its screen showing the camera finding the code, then the app opening).
   Add `still FRAME 50` to either to check one frame.
4. `blender -b --factory-startup -P blender/launch_edit.py -- OUT/frames OUT/launch_music.wav OUT/logo_white.png OUT/film.mp4`
   cuts it all to the music with the titles (Inter) and writes H.264 + AAC. The story and the titles are the `STORY` list
   there; a shot's length there, in launch_devices.py (`SECS`) and in launch_record.js (`secs`) must agree.
5. `blender -b --factory-startup -P blender/qr_explainer.py -- OUT/frames OUT/recordings OUT/launch_music.wav OUT/logo_white.png OUT/qr.mp4`
   makes a 23 s clip of just the kiosk's QR code, in four steps (needs the kiosk_qr shot and the kiosk_qr, kiosk_home takes).

## Blender
Blender 4.2 LTS or later, run headless (round 6 was made with Blender 5.2 LTS at `D:\blender.exe`). Renders use Cycles on the GPU (OptiX) and fall back to CPU.
1. After a plan change: `python data/align_to_pdfs.py`, `node tests/engine.test.js`, `node tests/export_rails.js`, `node tests/export_attract_route.js`, then `blender -b -P blender/build_model.py` (rebuilds `ireo_boulevard_3d.blend`), re-bake the shading (step 3) and re-render the film (step 2). Fonts: Inter (`blender/Inter-*.ttf`, SIL Open Font License, `Inter-OFL.txt`), the same as the app.
2. **Attract film** (kiosk idle screen, a seamless 32 s loop: the floors lift apart, a route draws itself from "You are here" up two escalators to Bellagio, a pin drops, everything settles):
   - `blender -b -P blender/attract.py -- OUT_DIR` renders 768 frames at 1080p (about 11 s a frame on an RTX 4060; restarts where it stopped). `-- OUT_DIR still 409 40 24` renders one test frame at 40 % size.
   - `blender -b -P blender/encode_video.py -- OUT_DIR` writes `web/media/attract.mp4` (H.264, ~11 MB).
   - `blender -b -P blender/attract.py -- save` writes `blender/ireo_attract.blend` with the whole animation set up, to open in Blender and adjust.
   - The route in the film comes from `blender/attract_route.json` (exported from the product's router), and the glass balustrades from `blender/rails.json` (`node tests/export_rails.js`), so the film matches the app.
3. **Asset kit for the web map:** `blender -b -P blender/render_textures.py` (leaf, flower and frond cards, only when you change them), then `blender -b -P blender/export_decor.py` (builds every tree, palm and shrub, bakes the sky's light into it in Cycles, exports the GLB), `blender -b --factory-startup -P blender/webp_decor.py` (its textures to WebP: the kit 2.2 MB -> 0.9 MB) and `python blender/make_decor_js.py` (after changing `assets.py` or the plan). `blender -b -P blender/package_assets.py -- render` refreshes `assets/`.
   **Pool water:** `blender -b -P blender/bake_water.py` then `python blender/make_water_js.py`. The map loads it with three.js's GLTFLoader (from `web/vendor/GLTFLoader.js` if present, otherwise the CDN); `?decor=0` switches it off.
4. **Live-map shading:** `blender -b -P blender/bake_shade.py -- SHADE_DIR` then `python blender/make_shade_js.py SHADE_DIR` (needs Pillow) writes `web/js/shade.js`.
5. Stills: `blender -b -P blender/render.py -- hero out.png 1600 1000 32`.

## Live data (important)
- **Served by `node server.js`** the page uses **ServerDB**: one copy of the data on the server (`data/live-db.json`),
  sent to every screen as it changes (Server-Sent Events; screens reconnect by themselves). This is what makes the
  admin hub, the kiosks and the phones one system in the demo. Delete `data/live-db.json` to start again from the
  sample data.
- **On claude.ai** it uses the artifact database (`window.claude.use('db')`).
- **Opened from disk / any other static server** it uses **LocalDB** (browser storage + BroadcastChannel): the admin
  hub saves, and kiosk/app tabs in the same browser update instantly, but other devices do not see the changes.
For a production rollout, give `attachDB()` in `datastore.js` a hosted backend (Firestore, Supabase…, or `server.js`
behind real sign-in) with the same tiny API: `collection(c).onSnapshot(fn)` and `doc('c/id').set(data)|delete()`. Collections:

| Collection | Doc id | Fields |
|---|---|---|
| `stores` | brand key (e.g. `goodearth`) | `desc, hours{open,close}, phone, tags[], logo (data URL), menu[], specials[], specialsAt, offers[{id,title,kicker,detail,until,status: live/pending/rejected}], wait{mins,status: open/closed,updatedAt,by}`. A store added in the admin hub also has `custom: true, name, cat, units[]` (keys of empty units, e.g. `F:21-A`). |
| `ads` | any | `brand, headline, sub, kicker, status, active` |
| `events` | any | `title, date, time, where, brand, desc` |
| `roles` | `mall_admin`, `marketing`, `store_mgr`, `rest_mgr` | `name, scoped, perms[]` |
| `users` | any | `name, role, store` |
| `settings` | `mall` | `helpDesk, hours, staleMins, idleSecs, open, close, adsEnabled, kioskVoice` |
| `stats` | brand key | `directions, today, day, lastAt` |
| `kiosks` | kiosk id (`K1`…) | `name, at ("G,374,699"), heading, loopSecs (length of one ad rotation), active` |
| `adrules` | brand key | `enabled, kiosks[] ("*" = all), freeAds, maxAds, extraPrice, autoApprove, slots[{id, from "14:00", to "17:00", secs, days[0-6]}]` – the airtime the mall gives a store |
| `adcreatives` | any | `brand, kind: card/image, title, sub, photo, media (image data URL), slots[] (slot ids; empty = all), status: pending/live/paused/rejected, chargeable, price` |
| `adstats` | ad id | `brand, total, today, day, lastAt, kiosks{K1: n}` – plays, written by each kiosk once a minute |

Items with `sample: true` are demo data (the same sample set as the published demo); Admin → Settings → "Remove all
sample data" clears them and keeps anything your team added. The admin hub's "signed in as" switcher is a demo;
production needs real sign-in and server-side permission checks.

## Known assumptions (confirm with the mall)
Water channels on the central street, entrance gate at the south end, escalator directions, shop entrance sides and floor heights (5 m) are interpretations – the PDFs do not state them. The floors are stacked in the PDFs' shared drawing frame: Lifts C and D agree across the three PDFs within about 1.3 m; Lift E differs by about 4 m and the anchor-block lifts on the Second floor (about 4 m), which the PDFs describe as an artistic impression. Walking pace 1.2 m/s; an escalator ride counts as 34 s per floor and a lift as 55 s plus 8 s per floor (waiting included). Categories for Hatsu, Ruh, Sundays, Perona, Soulfoods, Wasabi, SKO, Kaarigar are unconfirmed. Store photos come from ireoboulevard.com (37 of 54 stores); no store logos exist there – upload them in the admin hub. The "best slot" suggestions rank windows by an estimated footfall curve for an Indian high street (quiet mornings, lunch peak, strong 6–10 PM), not by measured traffic.
