# Putting Ireo Boulevard online

Two ways, for two jobs:

| | Quick link from this laptop | Permanent hosting on Render |
|---|---|---|
| Good for | Showing the client today | A fixed link the client can use any time |
| Link | New every start, e.g. `https://some-words.trycloudflare.com` | Fixed, e.g. `https://ireo-boulevard.onrender.com` (or your own domain) |
| Works while | This laptop is on, online and the window is open | Always |
| Cost / accounts | Free, no account | GitHub (free) + Render (Starter, about US$7 a month plus US$0.25 for the 1 GB data disk) |

Either way the admin hub needs the **admin password**; kiosks and phones do not.

---

## 1. Quick link from this laptop

1. Double-click **`start-live.cmd`** in `D:\ireo-wayfinding`.
2. After a few seconds the window shows the links (the kiosk link is also copied to the clipboard):
   - Kiosk: `https://….trycloudflare.com/?view=kiosk`
   - Phone app: `https://….trycloudflare.com/?view=app`
   - Admin hub: `https://….trycloudflare.com/?view=admin`
3. Send the kiosk or phone link to the client. **Keep the window open**; closing it takes the link down.

The admin password is in `data\admin-password.txt` (made on first start; delete the file and restart to get a new one).
Changes made in the admin hub reach everyone who has the link within a second or two.

Behind the scenes: `node server.js` plus Cloudflare's free quick tunnel (`tools\cloudflared.exe`, the official
signed download from github.com/cloudflare/cloudflared). Quick tunnels are meant for demos: no uptime promise,
and the link changes every time.

---

## 2. Permanent hosting on Render

### a. Put the project on GitHub (once)
1. Create a free account at https://github.com and a **new private repository** called `ireo-boulevard`
   (leave "Add a README" unticked).
2. Open a terminal in `D:\ireo-wayfinding` and run (with your own name and email):
   ```
   git config user.name "Your Name"
   git config user.email "you@example.com"
   git add -A
   git commit -m "Ireo Boulevard wayfinding"
   git remote add origin https://github.com/YOUR-GITHUB-NAME/ireo-boulevard.git
   git push -u origin main
   ```
   The first push opens a browser window to sign in to GitHub.
   `.gitignore` keeps the admin password, the live data and the tunnel program off GitHub.

### b. Deploy on Render (once)
1. Sign up at https://render.com with your GitHub account.
2. **New > Blueprint**, pick the `ireo-boulevard` repository, **Apply**. `render.yaml` sets everything up: an
   always-on Node web service, a 1 GB disk for the live data, and a random admin password.
3. When the deploy is green, the service page shows the link, e.g. `https://ireo-boulevard.onrender.com`.
   Add `?view=kiosk`, `?view=app` or `?view=admin`.
4. The admin password: the service's **Environment** tab, `ADMIN_KEY` (click to reveal). Change it there any time.
5. Optional: **Settings > Custom Domains** to use your own address (e.g. `wayfinding.yourcompany.com`).

### c. Updating
Commit and push (`git add -A`, `git commit -m "…"`, `git push`); Render redeploys by itself in a minute or two.
The live data (offers, wait times, logos…) stays on Render's disk across deploys. It starts from the sample data;
the laptop's own data is not copied.

The free Render plan also works for a quick look, but it sleeps after 15 minutes without visitors (the next visit
takes about a minute to wake) and forgets admin changes when it restarts. For that, change `plan: starter` to
`plan: free` and remove the `disk:` block in `render.yaml`.

---

## Before a real launch
- Replace the sample content: Admin hub > Settings > **Remove all sample data**, then add the real offers, wait
  times and logos (Admin hub > Stores > Import logos).
- The admin hub has one shared password. For many store managers, add real sign-in (see README, "Live data").
- The 3D map loads three.js from the jsDelivr CDN; hosted, that is fine. For offline kiosks see README.
- Kiosk screens: start Chrome with `--kiosk --autoplay-policy=no-user-gesture-required` and the kiosk link, so the
  Wayezy intro plays with its sound when the kiosk starts (browsers only allow sound without a touch with that
  setting; without it the intro plays silently). Phones always open it silently for the same reason; the admin sign-in has sound.

## Members: before real people join
The phone app's sign-in sends a one-time code to the member's mobile. No SMS service is connected yet, so the server
runs in **demo mode**: it hands the code back to the app, which shows it on screen. That is fine for showing the app
and wrong for real members, because anyone could then sign in as any number.

To go live:
1. Open an account with an SMS provider that can send one-time codes in India (for example MSG91 or Twilio). In India
   this also means registering the sender and the message template on the DLT platform; the provider walks you through it.
2. In `server.js`, fill in `sendSms(phone, text)` with the provider's API call and set `SMS_LIVE = true`. Keep the
   provider's key in an environment variable, not in the file.
3. Members are stored in `DATA_DIR/members.json`. On a host, `DATA_DIR` must be on a disk that survives restarts, and
   it should be backed up. It holds mobile numbers: treat it as personal data.

