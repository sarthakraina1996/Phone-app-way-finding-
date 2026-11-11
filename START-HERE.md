# Wayezy mobile app: handover pack

Wayezy is BrainADZ Live's 3D wayfinding app for malls and venues. This pack holds everything for the **phone app**:
a ready-to-host website, the full source code, the design files and the QR codes. It is a web app (it opens in
the phone's browser from a link or a QR code, nothing to install), and it can be added to the home screen like an app.

**Live now:** https://sarthakraina1996.github.io/wayezy/?view=app
(The demo venue is Ireo Boulevard. Everything shown is sample data.)

---

## What is in this folder

| Folder | What it is | Who needs it |
|---|---|---|
| `qr/` | QR codes for the live phone app: `wayezy-app` (the app's home) and `wayezy-app-to-bellagio` (opens straight on a store's route). `.svg` for print at any size, `.jpg` 1200 px for slides and chat. | Design, marketing |
| `1-ready-to-host/` | The finished phone app as a plain website. Upload this whole folder to any web host and it works (HTTPS needed for the offline copy and "Add to Home Screen"). This is exactly what is live on GitHub Pages. | Whoever hosts it |
| `1-ready-to-host-single-file/` | The same app as one HTML page (`ireo-boulevard.html`) plus its `media/` folder, for an offline demo laptop. | Demos |
| `2-source-code/` | Everything the app is made from: `web/` (the app: `index.html`, `styles.css`, `css/`, `js/`, `media/`), `server.js` (the live server: live data, admin password, member sign-in), tests, docs. `README.md` inside explains every file. | Developers |
| `3-design/` | `all-screens.jpg` (every phone screen on one sheet), `screens/` (each screen at phone size, 390 x 844), `logo/` (the Wayezy logo in colour and white, the wordmark, the app icons, the original artwork). | Design, marketing |

---

## Linking the app to a QR code

The QR codes in `qr/` already point to the live app. To make new ones, use any QR generator with one of these links:

| The QR code opens | Link |
|---|---|
| The phone app | `https://sarthakraina1996.github.io/wayezy/?view=app` |
| A store, with its route ready | `https://sarthakraina1996.github.io/wayezy/?view=app&to=bellagio` (any store key, e.g. `starbucks`, `nicobar`, `goodearth`) |
| The app in Hindi | add `&lang=hi` |
| A route starting from a given spot (posters, kiosks) | add `&at=G,374,699` (floor `G`, `F` or `S`, then the map position) |

Tips for printed codes: at least 2.5 cm wide, dark on a light background, keep the white margin around it, and test
the printed code with two phones before printing in quantity. If the app moves to its own domain (for example
`app.wayezy.com`), regenerate the codes with that address. Codes that point to the old address stop working when it goes.

---

## Hosting it on your own domain

1. Upload the contents of `1-ready-to-host/` to the web host (Netlify, Vercel, cPanel, an S3 bucket, GitHub Pages).
   No build step and no server are needed.
2. Point the domain at it and turn on HTTPS.
3. Open `https://YOUR-DOMAIN/?view=app` on a phone, then make the QR codes from that address.

**This hosted copy is a demo:** every visitor sees the sample data, and changes made in its admin hub stay in that
person's browser. Membership works as a demo too: sign in with any mobile number, the code is shown on screen, and the
membership is kept on that phone. For the live version (one shared set of offers, wait times and events updated from the admin hub,
member sign-in, an admin password), run `server.js` from `2-source-code/`. See `DEPLOY.md` there; `render.yaml`
deploys it on Render in a few clicks.

## Changing the app

- Edit the files in `2-source-code/web/`. After any change, raise the `?v=` number on the script and style links in
  `index.html` so phones fetch the new files instead of cached ones.
- Run `python web/build_static_site.py OUT_FOLDER` to make a new ready-to-host copy.
- Brand colours: navy `#1E2551`, red `#E8413B`, light grey `#F4F5F8`, white. Font: Poppins (Hind for Hindi).
- The store list, floors and map shapes come from `web/js/data.js` (generated from the mall's floor plans).

## Not included, on purpose

The admin password, the live database and the members file (`data/admin-password.txt`, `data/live-db.json`,
`data/members.json`) stay on the server. A new server makes its own password on first start.
