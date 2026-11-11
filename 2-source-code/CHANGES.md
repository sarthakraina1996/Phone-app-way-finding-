# Version 6 – what changed (26–29 Sept 2026)

## Wayezy 1.0 (3 Oct): the product, in the BrainADZ Live look
- A copy of the Ireo Boulevard app (Round 12 below) as **Wayezy**: every feature kept; the app is named Wayezy
  everywhere it names itself (logo, title, install name, "the Wayezy app"); the venue's name is a setting
  (Admin → Settings → Mall name, Ireo Boulevard in the demo).
- The BrainADZ Live look: navy for Ireo's green, red for its gold, white and light grey paper, Poppins; white
  header bars with the colour logo and a red rule; red buttons and accents; the 3D map's signs, pin and highlights
  in the same colours. The CSS variable names are unchanged, so every rule follows the new palette.
- The Wayezy logo in four versions (colour or white, with or without FIND EXPLORE ENJOY) and a new app icon.
- Port 8766, its own admin password and no members carried over.
- The Wayezy promo film (80 s): the Ireo film's story re-recorded from this app; the story, bars and titles are in
  `blender/launch_story.json`; titles set in Poppins by `launch_record.js titles`; white first and last cards with
  the colour logo; navy setting for the mall, a near-white studio with red rings for the devices (the booklet's
  kiosk pages); `launch.py` caps textures at 2048 px so the demo laptop's shared GPU memory lasts. Work files in
  `D:\wayezy_launch`.
- The film gains the D-type floor kiosk (BrainADZ Live's 43-inch tilted touch screen on a white column and curved
  base, from the client's photo): standing in the 3D mall at the kiosk spot (G 374,699) with the boulevard behind it,
  a visitor's view of Dining → Bellagio → the route card, and the phone scanning its QR code (in place of the floor
  kiosk's scan). `launch_devices.py dkiosk_wide | dkiosk_find | dkiosk_qr` opens the mall model for these; the
  screens are the new takes `kiosk_dhome`, `kiosk_dfind` and the existing `kiosk_qr`. The music gains a cycle
  (`CYCLES = 7`, 36 bars, 90 s) and the story is 36 bars.
- The phone fits its screen: no scrollbars in the phone frame, the car card's buttons on two rows, Account's avatar
  without the pill behind it (the same fix went into the Ireo app).

## Round 12 (3 Oct): QR codes on the kiosk, a longer film
- **Take the route on your phone.** Every route card on the kiosk now carries a QR code ("Take this route on your
  phone"): the phone's camera opens the app at that kiosk, in the kiosk's language, with the route already drawn
  ("Starting from: The kiosk I scanned"). The kiosk's home panel has one too ("The map on your phone"), for directions
  anywhere in the mall from where the visitor stands. The codes are made on the kiosk itself (`js/qr.js`, no library,
  checked by `tests/qr.test.js` with an independent decoder). Admin → Settings → "Public link to the phone app" sets
  the address they point to (the hosted app); empty, they use the page's own address.
- **The launch film, 80 s.** The flicker in the mall shots is gone: the site's backdrop sat a few centimetres under the
  paving and lawn, and from a few hundred metres up whole frames lost the lawn, paving and roads; it now sits half a
  metre lower and the camera's depth range is tight. New: the kiosk switching to Hindi on a route, a phone scanning the
  kiosk's QR code and opening the route, and a member scanning the code on a basement pillar before Find my car walks
  them back. The film ends on the logo (the entrance at night is out).

## Round 11 (1 Oct): the launch film
- A 70 s product film for the client, made in Blender with an original instrumental score: a title card, the mall from
  the air at golden hour, the three floors lifting apart, then the wayfinding as a visitor uses it on the kiosk: a search
  typed on the on-screen keyboard, Bellagio tapped, the route and its steps; the route drawing itself through the mall
  up two escalators with the pin dropping on Bellagio's roof; "Take me here" and the guided walk floor by floor to the
  door. Then the phone app in use (home and offers scrolled, the member card, Find my car), the entrance after dark, and
  an end card. Cuts land on the music's bars; titles in Inter.
- The screens are recordings of the real app (`launch_record.js`, on a virtual clock so every frame is smooth), not stills.
- Scripts: `blender/launch_music.py`, `launch_record.js`, `launch.py`, `launch_devices.py`, `launch_edit.py` (README).

## Round 10 (1 Oct): the pin on the shop, Find my car, a finer member app
- **The destination pin stands on the shop.** It sits on the destination's roof (on its sign) instead of hovering at
  the door, and it appears as soon as the walk starts: before, starting "Take me here" before the route had finished
  drawing meant the pin never appeared. Same in the 2D map. The gold ring on the ground still marks the door.
- **Find my car (members only).** A member saves where they parked: the basement level and the pillar or bay, by hand
  (Account, or "My car" on Home) or by scanning a QR code on the pillar (`?view=app&park=B1-P23`; anyone not signed in
  is asked to sign in first). Home then shows "Your car · B1 · P-23"; "Find my car" walks them to the nearest lift that
  goes down to parking and ends "Take Lift E down to B1. Your car is at P-23." (in Hindi too). "Car collected" clears it.
  The basement levels and parking lifts are set in Admin -> Settings -> Parking (sample values until the mall sets
  them). The basement itself is not on the map yet: there are no basement drawings in the project. With the basement
  plans (pillar numbers included), the last stretch to the pillar can be drawn on the map too.
- **A finer member app.** The Account tab opens with a greeting and the member card at a real card's proportions
  (gold hairline, member number, points); a tap shows it full size with the barcode, for the counter. Show card,
  Find my car and Saved stores sit under it; Home greets the member and keeps their car one tap away.

## Round 9 (30 Sept): the phone app becomes the members' app
- **Members.** People join or sign in on the phone with their mobile number and a one-time code (the Account tab).
  A member gets a member card (name, member number, barcode, points), members-only offers, their saved stores, and
  their language and step-free choice remembered on any phone they sign in on.
- **Members-only offers.** A store (or the mall) ticks "Members only" when adding an offer. Members see and use it;
  everyone else, and the kiosks, see it locked with an invitation to sign in. The Offers tab has a "For members" view.
- **Saved stores.** A heart on the store card; saved stores sit in a row on Home and on the Account tab.
- **Points.** The mall's team adds or takes points in the admin hub (Members); the member's phone shows the new
  balance and what it was for within a few seconds. How points are earned is the mall's programme to decide.
- **Admin hub -> Members:** who has joined, their points, search, add or take points, remove a member.
- **A finished app.** Five tabs with a filled capsule on the one you are on: Home, Map, Offers, Events, Account. Each
  tab is its own page with a title; search and categories stay on Home and Map. Home greets the member by name and
  puts Toilets, Lifts, Exit and Help one tap away; the switches (language, step-free, spoken directions, evening
  map) moved to Account. Offer cards without a photo show the store's name instead of an empty block.
- **Private by design.** Members are kept apart from the mall's data (`data/members.json`, never sent to screens,
  never in the repository); sign-in tokens and codes are stored only as hashes; codes expire in 5 minutes, and
  sign-in attempts are rate-limited. `node tests/server.test.js` checks all of it against a real server.
- **Demo mode, until an SMS service is connected:** the sign-in code is shown on screen instead of being texted.
  That is right for a demonstration and wrong for real members (see DEPLOY.md).
- Parked, not finished: live position from Bluetooth beacons (`locate.js`, `livepos.js`, `beacons.js`, the beacon
  plan in `docs/`). It is switched off unless the page is opened with `?sim=1`.

## Round 8 (29 Sept): हिन्दी, and back to the ads after 15 seconds
- **English or हिन्दी.** The kiosk's start screen (and its idle screen) offers both; a touch on either starts in that
  language, and a button beside "Need help?" switches at any time. The phone never asks: a pill in its header switches, the
  choice is remembered, and after the kiosk it keeps the language chosen there. Everything a visitor sees is in Hindi except brand names: menus, store
  cards, wait times, offers and events shipped as samples, the map's labels, the floor names, clock and dates
  ("शाम 5:45", "मंगल, 29 सित॰"), toasts and help.
- **Hindi directions** are written by the engine itself, not translated word by word: "Da Milano के पास दाएँ मुड़िए,
  फिर लगभग 10 मीटर चलिए।", "एस्केलेटर से ऊपर पहली मंज़िल पर जाइए", "Starbucks आपकी दाईं ओर है". They use the polite
  आप form throughout, never assume the visitor's gender ("आपकी मंज़िल आ गई है"), and use the words people use
  (लिफ्ट, एस्केलेटर, मीटर). Tested for every store: same steps as English, Devanagari apart from shop names, whole
  sentences.
- **Hindi voice:** Chrome's "Google हिन्दी", Edge's Swara/Madhur, Windows' Kalpana or iOS's Lekha when the device has
  one; where it has none the screen stays in Hindi and the voice speaks English (the visitor is told).
- **Hindi search:** कॉफ़ी / कॉफी, सिनेमा, शौचालय, महिला शौचालय, लिफ्ट, निकास and more find the right stores and services.
- **Font:** Hind (Indian Type Foundry, OFL, made for screens) for Devanagari next to Inter.
- **Idle:** 15 seconds without a touch sends the kiosk back to the ads (full screen, then the film, then the ads
  again); a route that is still being walked or spoken is not cut off. The next visitor starts in English again
  (`?lang=hi` makes Hindi the kiosk's default). The admin setting still allows a longer wait.
- The admin hub stays in English for now.

## Round 7 (29 Sept): online, and a finishing pass on the map
- **Online.** `start-live.cmd` puts the app on a public link from this laptop (Cloudflare quick tunnel); `render.yaml`
  and `DEPLOY.md` put it on Render for good. The admin hub now needs the admin password; kiosks and phones do not.
  Screens fall back to long polling where a proxy holds the live stream back, and text files are sent compressed.
- **Destination pin:** a proper map pin (a teardrop in the app's green with a gold collar) carrying a round badge with
  the store's logo or initials, and the store's name riding on top of it.
- **Rooftop plaques fit their roofs:** each is placed at the roomiest point of the roof and sized to it, so L-shaped
  and narrow units (VegNonVeg) no longer have a plaque hanging over the edge.
- **Escalators:** the plans draw each escalator on both floors; the map and the film used to build every drawing, so
  "escalators" rose out of the floor on 1F and 2F where the real ones arrive, and every escalator stopped about a metre
  short of the floor above. Now each is built once (`engine.escalatorRuns`, tested), on the floor it leaves, rising the
  full storey towards where it arrives, with a truss, skirts and glass sides; one drawn too short takes its full length
  from both drawings.
- **Entrance gate:** its opening was wider than the boulevard, so the pylons stood in front of the shopfronts. Now each
  pylon stands on a building line of the boulevard (in the Blender kit, the web map and the film).
- **Cinépolis' entrance:** most of its long front is behind other units; the glass, door and sign now go on the part
  that is open to the walkway, with the door where the plan draws it (`engine.openSpan`), and routes end at that door.
  The same rule applies to every shop, in the map and the film.
- **Featured stores** on the phone slide by themselves, can be swiped (or dragged with a mouse), pause while touched,
  and show where they are with dots; the offers row can be swiped and dragged too.

## Round 6 (28 Sept): one live system, Blender trees and water, a finished map
- **The admin hub, kiosks and phones are one system.** `node server.js` serves the app and keeps the live data
  (`data/live-db.json`); every change made in the admin hub (wait times, offers, specials, logos, events, new stores,
  kiosks, ads, settings) reaches every open kiosk and phone within a second, on any device that can reach the server
  (`--lan` for phones on the same Wi-Fi). Screens reconnect by themselves; the admin hub shows whether it is live.
- **Trees rendered in Blender.** The leaves, flowers and palm fronds are real 3D foliage (folded, drooping leaves on
  twigs, flame-tree flowers with the pale petal, bougainvillea bracts) rendered in Cycles (`blender/render_textures.py`).
  New species: gulmohar (flame tree) in bloom, ashoka columns, bougainvillea. Every plant has the open sky's light baked
  into it in Cycles, so crowns are darker inside and underneath in the live map too. Lighter skeletons with
  fuller crowns: about 1,400 triangles a tree instead of 2,000.
- **Water from Blender.** The pools use a tiling normal map rendered from Blender's FFT ocean and the caustics that
  surface throws on the pool floor (traced from the same normals, `blender/bake_water.py`): two layers of ripples drift
  apart and a moving net of light plays on the floor.
- **A neighbourhood, not a board.** Ring roads with ashoka avenues and street lamps, the street grid carrying on into
  the city, blocks drawn as a white architectural model (lit windows in the evening), parks - all fading into the page
  colour at the edge of the world, so the map blends into the app. Image-based light in the app's colours gives
  glass, water and metal soft reflections.
- **Shops.** Every store's logo on its roof: the one uploaded in the admin hub, or its name until then, on a plaque
  with a gold edge that stays square to the buildings and turns to read upright as the map turns (the chosen store's
  plaque lifts and grows). Parapets, rooftop plant on the larger roofs, a quieter roof membrane with a hint of the
  category colour. Floating name labels step aside where the rooftop plaque is readable.
- **Smooth floor changes.** Floors cross-fade with a dither that moves every frame instead of turning see-through
  (no more walls showing through walls), every floor is compiled and uploaded to the graphics card while the map
  loads (the first change to a floor stalled for 0.3-0.4 s), the haze under upper floors fades with them, labels fade
  in, and shadows are redrawn only when something moves. Draw calls per frame roughly halved.
- **Spoken directions with a proper flow.** The route is introduced ("Directions to Bellagio, on the second floor.
  About 2 minutes away."), then each step is said as the walker reaches it, a few metres early; if the next step
  comes before a sentence is finished, the walker waits at the corner, so nothing is ever cut off. Whole sentences
  ("Turn right at Da Milano, then walk about 10 metres."), little jogs folded into one corner, a shop never named twice
  in a row ("turn left again"), the escalator announced before the walker gets to it, then "Bellagio is just ahead, on
  your right" and "You have arrived at Bellagio." The best available voice is chosen (Indian English, then natural
  voices). A mall setting decides whether kiosks speak; on a kiosk a visitor's on/off lasts for their route only.
- Fixed: two stray control characters in `engine.js` meant the spoken version of every step said "walk ... then walk";
  the first step of a route was never spoken; the kiosk's idle reset could end a route that was still playing; on the
  2D map a walk paused at the moment it reached the destination never finished. The asset kit now links the leaf
  colour to the Mix node's colour sockets explicitly (they share their names with the float sockets) and runs on
  Blender 4.2 to 5.2.

## Round 5 (27 Sept): fountains, trees, road and entrance from Blender
- **Fountains.** Every pool in the central water channel now has arcing jets crossing from both sides and a geyser in the middle with a falling crown. In the live map the jets are glassy streams with water running along them, spray droplets burst where they land, the geyser throws spray, and ripples spread across the pool (brighter, as if lit from below, in evening mode). In the film the jets, foam and pool ripples are animated and loop seamlessly.
- **One asset kit, modelled in Blender, used by both the film and the live map** (`blender/assets.py`): broad canopy trees with leaf cards, palms with ringed trunks and arching fronds, bushes, street lamps, bollards, and a new entrance gate (stone pylons with bronze fins, a canopy beam lit from below, and the real Ireo Boulevard logo on both faces). The live map loads it as a GLB and falls back to its built-in trees and gate if it cannot.
- **Road and entrance:** lane edge lines, a dashed centre line, a zebra crossing at the gate, street lamps along the road and bollards across the plaza — the same in the film and the map.

## Round 4 (27 Sept): floors aligned to the PDFs, Inter in the film
- **Ground and Second floors now match the floor-plan PDFs exactly.** The earlier data had warped both floors in blocks (by up to about 4 m) so their shops lined up with the First floor's; the PDFs share one drawing frame, so every floor is now used exactly as traced. The ground-floor boulevard is its real width (about 15 m, with the upper floors overhanging it) and the Second floor's bridges and terraces are where its PDF draws them. `renders/accuracy-check-*.png` draw the live map over each PDF. The kiosk position, entrance gate, sample kiosks, 3D model, baked shading, glass balustrades and the film's route were all regenerated from the new geometry; routing, search and all tests pass unchanged.
- **Inter in the Blender film and model** (shop signs, gate lettering, "You are here" and destination labels), downloaded from Google Fonts with its licence.
- The web page now fetches fresh copies of its files after an update (versioned links), so a kiosk can never mix new code with old data.

## Round 3 (27 Sept): guidance, live store info, kiosk ads
- **Take me here → route mode.** On the kiosk the side panel folds away and the map fills the screen; on the phone the map goes full screen by itself. A large step card shows the current instruction (with the floor), a "Then…" line shows the next one, the destination bar shows its live wait time and offer, and there are Back / Pause / Next / Voice / End controls. The step list follows the walker as it moves; tapping a step jumps there and holds.
- **Spoken directions and cues for deaf visitors.** Each step is read aloud (Indian English voice when the device has one; on by default on phones, off on the kiosk, one tap to change). Every step change also flashes the step card and, on phones, vibrates (a longer pattern for lifts and escalators), so nothing depends on hearing.
- **Automatic return.** On arrival an "You have arrived" card shows the store's live wait time, offers and specials, then the screen goes back to search on its own after 9 seconds (or straight away with Done). Picking a store now shows the whole route; the walk starts only with Take me here.
- **Store cards show what is on now:** a "Live now" block with the current wait time (and how fresh it is), today's specials and running offers — on the kiosk, the phone, the route bar and the arrival card. Stores edit their specials in the admin hub.
- **Menus no longer repeat.** The kiosk header shows today at a glance (opening hours, restaurants with no wait, offers live) instead of repeating the bottom tabs; the bottom tabs are Map, Directory (A–Z), Offers, Events, Services. On the phone the top chips are categories and the bottom tabs are Home, Map, Offers, Events, Services.
- **The map blends into the app:** the scene sits on the app's own cream (or night green) with the lawn cut to the site, so there is no hard frame round the map. The phone's floor chip now follows the floor on show.
- **Upper floors with depth.** Viewing 1F or 2F now shows the floors below at their real height through the open voids, under a light haze so the floor on show stays crisp. Glass balustrades run along every walkway and terrace edge that looks down into a void — never across a walking route (tested against every path). Taps pick shops on the floor on show only. The same balustrades are in the Blender film.
- **Kiosk ads (master admin → Ads & slots):** give each store airtime per kiosk — time windows (e.g. 9 AM–12 PM and 2–5 PM), seconds in each rotation and days — plus how many ads are free (e.g. 3), the most allowed, the price of each extra ad and whether ads need approval. A timeline per kiosk shows how much of each half hour is already sold; "Find slots" suggests the best free windows (busiest hours with room, and the one with the most spare time). Overbooked windows are refused.
- **Kiosks (master admin):** list, add and edit kiosks, their rotation length, and their own link (`?kiosk=K2&at=…&lock=1`); shows what is playing on each right now.
- **The ads play themselves.** Each kiosk works out its line-up from the rules: when a store's window closes its ads drop out and the next window's ads come in at that exact minute. Ads show as a sponsored card in the kiosk panel and full screen on the idle screen between plays of the film. Plays are counted per ad and per kiosk.
- **Store portal.** A store manager signs in to their own portal: a dashboard (directions today, wait time, ads played, quick updates, what visitors see now), My store, My kiosk ads (their airtime, free ads left, uploading an ad from a picture or their store photo, choosing windows, a preview, and a clear "this one is paid" confirmation once the free ads are used), Wait time (restaurants) and Offers.
- **Add a store.** The master admin can add a new shop in any empty unit (only empty units are offered), with its kiosk airtime and ad allowance set in the same step, including the best-slot finder. It appears on the 3D and 2D maps, in search and in routing straight away, and can be removed again.
- Fixed: in the first v6 build, shop opening hours and "Open now" never showed (a broken time check introduced when the code was split into modules); the data connection waited on timers that a busy kiosk could delay.

## Design pass (27 Sept)
- **Smooth 3D edges:** the map now draws at up to 1.5× screen resolution on top of multisampling, so roof and slab edges no longer stair-step. It drops the extra resolution a notch at a time if a kiosk's frame rate falls below ~30 fps, and restores it when there is headroom (`?quality=high` keeps it at full).
- **No gradients:** every gradient in the interface and in the 3D textures is now a flat colour. Buttons and selected states are solid gold, headers and promotion cards solid green, and text over photos sits on a flat tint.
- **Font:** Inter throughout (interface, 3D shop signs, 2D map), with the type scale reworked for it. It replaces Cormorant Garamond (hard to read at small sizes) and Jost.
- **Logos:** ireoboulevard.com has no individual store logos, only the Ireo Boulevard logo and store photos. The app's logo was checked pixel for pixel and is the same file; that logo now also sits on the 3D entrance gate instead of typed text. The site's Cinépolis photo was added (38 stores now have photos). Stores without a photo or uploaded logo show a flat name tile; store logos can be uploaded in Admin → Stores.
- **Phone app:** phones open straight into the app (no demo frame, drawn notch or view switcher), with iPhone safe-area spacing, larger touch targets, no zoom-on-tap in the search field, a taller map and an installable home-screen app (`manifest.webmanifest` + icons). The route line is now a flat brand red that reads the same in day and evening mode.

## Errors and crashes fixed
| Problem in v5 | What happens now |
|---|---|
| If three.js failed to load (CDN blocked, offline kiosk) or the screen had no WebGL, the whole page broke – even the store list. | A flat 2D floor plan takes over with the same routes, highlights and walk-through. The store directory never depends on the 3D map. |
| Store lists were built from the 3D scene, so they were empty until the 3D map finished loading. | Lists come straight from the mall data (`engine.js`). |
| A GPU driver reset (common on 24/7 kiosks) froze the map for good. | The kiosk shows "Refreshing the map…" and reloads itself. |
| One bad frame could repeat an error 60 times a second. | Errors are caught and logged; after repeated failures the 2D map takes over. |
| No record of what went wrong on a screen. | Admin → Settings → "Problems on this screen". Locked kiosks (`&lock=1`) reload after a burst of errors and refresh nightly at 4 AM. |
| Outside claude.ai there was no data: no offers, wait times or events, and nothing in the admin hub could be saved. | A local store takes over: saves on the device, keeps kiosk/app/admin tabs in sync, seeded with the same sample set as the published demo. |
| A failed save left the screen showing a value that was never stored. | The change is rolled back and the manager is told. |
| "Remove all sample data" used a browser pop-up that claude.ai blocks, so it silently did nothing; and it deleted whole store records, including anything a manager had added. | In-app confirmation; removes only items marked sample. |
| Opening `?view=admin` directly showed the map on top of the admin hub. | Fixed. |
| Database text (ad and event store keys, logo URLs) went into the page unescaped. | Escaped and validated. |
| Kiosks leaked GPU memory with every route (materials never freed) and every logo change. | Freed. |
| "All floors" view made the current floor's trees see-through. | Each floor has its own materials. |
| Dates used UTC: in India, offers ending "today" and today's direction counts rolled over at 5:30 AM. | Local dates. |
| The kiosk list jumped back to the top every minute when live data refreshed. | Scroll position kept. |
| For visitors with "reduce motion" switched on, "Get Directions" did nothing. | Shows the route without animation. |
| Turning on "Step-free" did not change the route already on screen. | Re-plans immediately (lifts only). |
| The "Toilets" button always went to the women's toilets. | Goes to the nearest toilets, with Women's / Men's buttons. |
| On the phone, routes started from the kiosk's position. | The phone asks where you are starting from (main entrance by default, or the kiosk whose QR code you scanned, or any store). |
| No message when a route could not be found. | Says so and points to the concierge desk; "You are already here" when you are. |
| After the idle reset, the help pop-up and search keyboard stayed open. | Everything resets. |
| The guided walk crawled on slow hardware. | Keeps real speed whatever the frame rate. |
| Labels were re-laid-out every frame even with a still map. | Only when something moves (less CPU on kiosk PCs). |
| Duplicate functions and dead code. | Removed; `app.js` (1.7 MB, one file) split into modules. |

## Better logic
- **Routing** (`engine.js`): Dijkstra with a binary heap and a cached tree per starting point; edges weighted in **seconds** (walking at 1.2 m/s, escalator 34 s a floor, lift 55 s + 8 s a floor), so the app picks the genuinely quicker of escalators and lifts. Routes never cut through a shop, toilet or entrance.
- **Directions**: the path is simplified first (no "turn left, turn right" jitter), turns are graded (bear / turn / turn around), each turn names a landmark ("Turn left at Good Earth"), the first step uses the way the kiosk faces, floor changes say lift or escalator, up or down, which floor, and the last step says which side the shop is on. Distances round to 5 m.
- **Search**: typo-tolerant ("starbuks", "nicobr"), prefix-as-you-type, accents ignored, synonyms ("coffee", "salon", "movie", "jewellery", "sari"), unit numbers ("15-A"), store tags from the admin hub, and service words ("toilets", "lift", "way out") put the matching service button first. Enter picks the top result, Escape clears.
- **Deep links**: `?to=<store>` opens straight to that store's route (QR codes on posters, shared links).
- **Admin**: kiosk idle time and wait-time staleness are now settings.
- 24 automated tests (`node tests/engine.test.js`) cover routing to every store, step-free, directions wording and search.

## Map animation
- Camera moves arc around the target and ease out slightly on long moves instead of cutting straight through; the map sweeps in on load.
- Changing floor slides the floors and cross-fades them.
- A route draws itself in, then direction chevrons flow along it; the destination pin drops with a bounce and a ring pulses under it; the shop's roof glows.
- The guided walk rides the escalator or lift: the floors slide past the walker to the next level.
- Idle kiosk: plays the Blender attract film (or slowly orbits the live map if the film is missing).

## Blender
- **Attract film** (`blender/attract.py` → `encode_video.py` → `web/media/attract.mp4`): a seamless 32 s, 1080p Cycles loop for idle kiosks.
- **Baked shading** (`blender/bake_shade.py` → `make_shade_js.py` → `web/js/shade.js`): per-floor sky-occlusion renders laid over the live map for soft contact shadows under walls, planters and trees.

## Pre-release test pass (8 Oct)
- New `tests/ui_audit.js` (every screen at 13 sizes, layout and script-error checks, 257 steps) and `tests/ui_flows.js`
  (14 cross-screen checks). Both pass.
- Fixed: list rows squeezed names to a word a line (the wait column now stays narrow and wraps, the offer tag has its
  own line); the steps' "Show 1F" buttons squeezed in Hindi; a portrait kiosk went blank during a route; the 2D map's
  camera animation could crash (`requestAnimationFrame` with a stale reference) and fight a newer move; the route
  controls crashed when tapped as route mode closed; a phone that lost its 3D context reloaded and lost the visitor's
  place (it now switches to the 2D map in place; kiosks still reload); the admin members table pushed out of its panel.

## Intro film, smoother selections, the admin logo (9 Oct)
- **Intro**: the Wayezy logo film (3.4 s, from the user) plays like a streaming app's opening when the kiosk or the
  phone app opens and when someone signs in to the admin hub: landscape on wide screens, portrait on phones and
  portrait kiosks; a touch or key skips it (on the kiosk it leaves the idle screen running). The page builds behind it.
- **Motion**: the selection in every tab bar (phone chips and tabs, kiosk categories and tabs, floor buttons, segmented
  controls, the admin menu, the view switcher) now slides to the new choice; colours, shadows and presses ease;
  mouse hovers lift cards and tint buttons; a new tab's content eases in.
- **Admin menu**: the colour Wayezy logo, as in the app and the intro (was the white one).

## Speed and polish (10 Oct)
Measured on the demo laptop (real GPU) and as a mid-range phone on 4G:
| | before | after |
|---|---|---|
| Kiosk, first start: map shown / longest freeze | 13.7 s / 11.7 s | 9.6 s / 1.3 s |
| Kiosk, later starts: map shown / longest freeze | 4.6 s / 2.8-3.8 s | 3.4 s / 1.4 s |
| Phone first visit: first content / map / longest freeze | 2.6 s / 23.4 s / 15.2 s | 0.8 s / 16.8 s / 2.2 s |
| Phone: map drawing on the Offers, Events and Account tabs or scrolled away | ~46,000 draws/s | none |
- The map's start-up warm-up compiled every shader twice (screen and render-target variants): now once (77 -> 46
  programs), and a slice per frame so the page keeps answering while the map builds.
- The map stops drawing when it is not on screen and drops to 30 fps when the camera is still (phone batteries).
- Store photos are separate files, loaded when a card shows them (they were 1.2 MB inside a stylesheet that held up
  the first paint).
- Visitors no longer see "Wait time not updated": a stale wait time is simply not shown (staff still see it).
- The kiosk no longer shows text-selection highlights, long-press or right-click menus, dragged images or page zoom.
- The 3D decor's textures are WebP (`blender/webp_decor.py`): `decor.js` 2.9 MB -> 1.2 MB, the trees look the same.
- Offline: the app installs an offline copy (`sw.js`); with no connection, or with the server down, the second visit
  opens at once with the last live data and reconnects by itself (never falls back to the sample data).
- Kiosk text on full-HD screens is larger for reading at arm's length (labels 12.5 px, details 15 px, was 10-13 px).
- Empty lists (no events, no offers) are designed states: an icon, what is missing, why, and somewhere to go instead
  ("See today's offers"). The phone's floor buttons are 44 px (were 40 x 38).

## A sharp, smooth intro (10 Oct)
- The intro is drawn by the app from the logo artwork instead of playing the supplied film, which was soft with
  speckled edges (an upscaled ~1.8 Mbit/s video): same timing, glow, light streaks, tagline, dive and white-out, sharp
  on any screen, and 0.06 MB instead of 1.5 MB (the film's sound is kept, copied out losslessly).
- It no longer stutters: the 3D map's start-up (shaders on the graphics chip) and the kiosk's idle film now wait for
  the intro to end instead of running underneath it.

## The app tour film (6 Nov)
- A 50 s product-walkthrough film of the real kiosk at night (`blender/tour_edit.py`, takes `tour_intro`, `tour_app`,
  `tour_end` in `launch_record.js`): the app's intro, the floors lifting apart (Blender), the kiosk in one take
  (Dining with live wait times, Bellagio's route over the floors, the guided walk up the escalators, the arrival), the
  route across the lifted floors (Blender) and an end card. `launch_music.py` takes the number of cycles (3: 50 s).

## Demo membership without a server (12 Nov)
- On a copy with no server (GitHub Pages, the one-file build, a Claude page) membership now works as a demo on the
  phone itself (`DemoMembers` in member.js): sign in with any mobile number, the code is shown on screen, then the
  member card, saved stores, members-only offers and Find my car, kept in that browser only. With the server nothing
  changes.

## Rounded solid icons (12 Nov)
- The phone's category chips and tab bar use a new set of filled icons (`ICS` in assets.js): a shop front for All,
  a hanger for Fashion, fork and knife, sofa, lotus; a house, a map with a pin, a ticket with %, a calendar and a
  person. Chip icons red (white when selected), tab icons slate (pale pink on the selected pill).
