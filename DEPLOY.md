# Deploy the client demo to Render (free)

This folder is a plain Node/Express app — no build step. The included `render.yaml`
sets everything up automatically except a few secrets you must provide.

---

## 1. Push just this folder to a new GitHub repo

Open PowerShell in this folder and generate three secrets first (copy the output
somewhere safe — you'll paste them into Render in step 2):

```powershell
"ADMIN_PASSWORD=$([guid]::NewGuid().ToString('N'))"
"SESSION_SECRET=$([guid]::NewGuid().ToString('N'))$([guid]::NewGuid().ToString('N'))"
"ADMIN_PATH=/manage-$([guid]::NewGuid().ToString('N').Substring(0,10))"
```

> `ADMIN_PATH` is the secret URL for the admin panel. The public site has no link to it.

Now create an **empty** repository on GitHub (e.g. `nepal-tours-demo`, no README).
Then, in this folder:

```powershell
git init
git add .
git commit -m "Client demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nepal-tours-demo.git
git push -u origin main
```

`.env`, `node_modules/`, `data/bookings.json` and `*.log` are git-ignored, so no
secrets or test bookings are uploaded.

*(Alternatively, push the whole parent repo and set Render's **Root Directory** to
`nepal-tours` — but a dedicated repo is cleaner.)*

---

## 2. Create the Render service

1. Go to <https://dashboard.render.com> → **New + → Web Service**.
2. Connect the GitHub repo you just created.
3. Render detects `render.yaml` and offers **Use existing blueprint** — accept it.
4. Fill in the three secrets when prompted:

| Key | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the first generated string |
| `SESSION_SECRET` | the second generated string |
| `ADMIN_PATH` | the third generated string (`/manage-…`) |

5. Click **Apply**. Render runs `npm ci` then `npm start`.

Your public link will be something like:
`https://nepal-tours-demo.onrender.com`

---

## 3. Verify the demo

| Check | URL / action |
| --- | --- |
| Website loads | your `.onrender.com` URL |
| Health check | `/api/health` → `{"ok":true,...}` |
| Admin is hidden | `/admin` → 404 (not found) |
| Admin works for you only | your secret `/manage-…` path + the admin password |
| Test booking | submit the booking form → appears in the private admin panel |

---

## 4. Optional: make WhatsApp/email really send

> ⚠️ **Render's free tier blocks outbound SMTP ports 587 and 465.** Gmail SMTP will
> fail on the free plan. Use a webhook (any HTTPS automation tool) or CallMeBot
> instead — both work fine. Email via Gmail needs a paid Render plan, or an SMTP
> provider that offers port 2525.

Add these in the Render dashboard under **Environment → Add Environment Variable**,
then **Manual Deploy → Deploy latest commit** (or restart):

```text
# WhatsApp — works on free (see README.md to get the key)
WHATSAPP_CALLMEBOT_KEY=...

# Email/webhook alternative that works on free: create a free Make.com scenario
# with a "Webhook" trigger → "Send email" Gmail module, then paste its URL:
NOTIFICATION_WEBHOOK_URL=https://hook.make.com/xxxxxxxx
```

(If you upgrade to a paid Render plan, Gmail SMTP works normally:
`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=…`, `SMTP_PASS=…`, `OWNER_EMAIL=…`.
Some SMTP providers also support port `2525`, which is allowed on free.)

Then open your private admin path → **Notifications → Send test notification**.

---

## 5. Good to know for a free demo

- **Cold starts:** after 15 minutes idle, the service spins down; the next click
  shows Render's loading page for about a minute while it wakes up. Tell the
  client, or upgrade to a paid plan to remove this (recommended if the client
  will click around a lot).
- **Free hours:** Render includes 750 free instance hours/month per workspace.
- **Bookings reset on redeploy:** the free plan has an ephemeral disk. Demo bookings
  are saved to `data/bookings.json` and disappear after a restart/redeploy. For a
  real launch, attach a persistent disk (paid plan) or switch to a database.
- **Phone/WhatsApp numbers are placeholders** in `render.yaml`. Replace
  `COMPANY_WHATSAPP`, `COMPANY_PHONE` and `COMPANY_EMAIL` with the client's real
  details in the Render dashboard before showing it.
- **To take it down:** Render dashboard → Delete service. Nothing on your PC is affected.
