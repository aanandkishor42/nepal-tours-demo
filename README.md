# Namaste Nepal Travels — premium Nepal tours & fleet website

A complete, production-friendly travel website: a warm, responsive front end and a
Node.js/Express API with vehicle, route, quote, booking and admin endpoints. All prices
are stored and calculated server-side in **NPR (Nepali Rupees)**; the USD toggle is a
presentation-layer conversion using `USD_RATE` from `.env`.

---

## 1. Quick start

```bash
cd nepal-tours
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# edit .env (at minimum ADMIN_PASSWORD and SESSION_SECRET)
npm start
```

Open **http://localhost:3000** for the website and **http://localhost:3000/admin**
for the admin panel. For auto-reload while developing: `npm run dev`.

Node 18+ is required (Node 20/22 recommended). No build step, no bundler, no database
setup — bookings are saved to `data/bookings.json`.

---

## 2. Folder structure

```
nepal-tours/
├── package.json
├── .env.example                 # Copy to .env — all settings live here
├── .gitignore
├── README.md                    # This file
├── scripts/
│   └── generate-placeholders.js # Creates local SVG placeholder images
├── server/
│   ├── index.js                 # Express app bootstrap + static files
│   ├── config.js                # Reads/validates environment variables
│   ├── data/
│   │   ├── vehicles.json        # Fleet data (edit prices here or in admin)
│   │   └── routes.json          # Popular routes/packages
│   ├── lib/
│   │   ├── pricing.js           # Quote calculation + NPR/USD conversion
│   │   ├── storage.js           # Atomic JSON-file bookings store
│   │   └── notify.js            # Optional WhatsApp / email notifications
│   ├── middleware/
│   │   └── auth.js              # Signed-cookie admin authentication
│   └── routes/
│       ├── api.js               # /api/vehicles, /api/routes, /api/quote, /api/bookings...
│       └── admin.js             # /api/admin/* (login, bookings, price editing)
├── data/
│   └── bookings.json            # Created automatically at runtime (git-ignored)
└── public/
    ├── index.html               # The main single-page website
    ├── admin.html               # Password-protected admin page
    ├── css/
    │   ├── styles.css           # Design system, layout, animations, responsive rules
    │   └── admin.css
    ├── js/
    │   ├── api.js               # Tiny fetch wrapper
    │   ├── i18n.js              # English/Nepali UI dictionary + toggle logic
    │   ├── app.js               # Rendering, filters, calculator, forms, gallery
    │   └── admin.js             # Admin panel behaviour
    └── images/
        ├── hero.svg             # Local Himalayan hero fallback
        ├── vehicles/*.svg       # Replace with your own photos
        ├── routes/*.svg
        └── gallery/*.svg
```

---

## 3. API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/config` | Branding, contact details, USD rate |
| GET | `/api/vehicles` | All vehicles. Optional filters: `?type=suv&seats=6&maxPrice=20000` |
| GET | `/api/vehicles/:id` | One vehicle |
| GET | `/api/routes` | All routes/packages |
| POST | `/api/quote` | `{ vehicleId, days, km }` → itemised NPR/USD estimate |
| POST | `/api/bookings` | Validated booking request; saved to JSON file |
| POST | `/api/admin/login` | `{ password }` → sets signed httpOnly cookie |
| POST | `/api/admin/logout` | Clears the cookie |
| GET | `/api/admin/session` | Check login state |
| GET | `/api/admin/bookings` | All booking requests (newest first) |
| DELETE | `/api/admin/bookings/:id` | Remove a booking |
| GET | `/api/admin/vehicles` | Fleet for editing |
| PATCH | `/api/admin/vehicles/:id/prices` | `{ pricePerDay, pricePerKm }` |

Example quote request:

```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"suv","days":3,"km":600}'
```

Quote logic: `(pricePerDay × days) + (pricePerKm × km)`, plus a driver allowance when
`driverIncluded` is false, minus a small multi-day discount (3+ days: 5%, 7+ days: 10%).
Tolls, parking, night halt and VAT are deliberately *excluded* and shown as a note.

---

## 4. Customising

**Brand & contact:** edit `.env` (company name, phone, WhatsApp, email, address, map).
**Fleet & prices:** edit `server/data/vehicles.json` or use the admin page.
**Routes:** edit `server/data/routes.json`.
**Text & translations:** `public/js/i18n.js` holds the English/Nepali dictionary.
**Colours/fonts:** CSS variables at the top of `public/css/styles.css`.

### Replacing the photos

Real photos are bundled locally in `public/images/` as JPGs, so the site looks complete
even offline. Sources and licences are listed in `public/images/PHOTO-CREDITS.md` — please
check the licences before commercial use, and swap in your own shots when you can.

Vehicle/route objects have an `image` field pointing at those JPGs. Replace the file
(keep the filename) or change the path in `server/data/*.json`. If a JPG ever fails to
load, the browser automatically falls back to the matching SVG illustration in the same
folder. Regenerate the SVG fallback set with `npm run generate:images` (it will not
overwrite your JPGs).

---

## 5. Real WhatsApp & email notifications

Every booking is saved to `data/bookings.json` first. Notifications are then sent through
**all channels you configure** (you can use several at once). After changing `.env`,
**restart the server** and use **Admin → Notifications → Send test notification** to
confirm real delivery. Per-channel results appear instantly, and every attempt is logged
to `data/notifications.log`.

### WhatsApp — easiest: CallMeBot (free, personal number)

1. Save this number in your contacts: **+34 644 19 44 39** (or **+1 469 344 0666**).
2. WhatsApp them: `I allow callmebot to send me messages`.
3. They'll reply with an API key. Put it in `.env`:
   ```
   WHATSAPP_CALLMEBOT_KEY=your-key-here
   COMPANY_WHATSAPP=97798XXXXXXXX   # owner's number, digits only, with country code
   ```
4. Restart, then press **Send test notification**. You should receive a real WhatsApp message.

### WhatsApp — business: Meta Cloud API

Set `WHATSAPP_CLOUD_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` from Meta for Developers.
Messages go to `COMPANY_WHATSAPP`.

### Email — Gmail example

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=your-16-character-app-password
OWNER_EMAIL=yourname@gmail.com
```

Enable 2-step verification, then create a Gmail **App Password** (Google Account →
Security → App passwords) and paste it as `SMTP_PASS`.

> Deploying on **Render's free plan**? It blocks outbound ports 587/465, so Gmail
> SMTP won't work there. Use CallMeBot or a webhook instead (both use HTTPS), or
> upgrade to a paid plan. See [DEPLOY.md](DEPLOY.md).

### Webhook (Make / Zapier / n8n / Slack)

Set `NOTIFICATION_WEBHOOK_URL=https://…`. We POST JSON containing
`{ type, text, booking, company }`, which you can forward anywhere.

Notification failures are logged but never block a booking from being saved.

---

## 6. Deployment notes

**For a ready-to-send client demo on Render (free), follow [DEPLOY.md](DEPLOY.md).**
It includes the GitHub push commands, `render.yaml` blueprint, secret generation,
and how to hide the admin panel behind a private path.

- Set `NODE_ENV=production`, a long random `SESSION_SECRET` and a strong `ADMIN_PASSWORD`.
  The app intentionally refuses to boot in production with the example values.
- Set `ADMIN_PATH=/manage-<random>` and `DEMO_MODE=true` to hide `/admin` from clients.
- Put the app behind HTTPS (nginx/Caddy/Cloudflare) — the admin cookie uses `secure: true`
  when `NODE_ENV=production`, so HTTPS is required for admin login in production.
- For concurrent writers or high booking volume, swap `lib/storage.js` for MongoDB/Prisma;
  the rest of the code does not need to change.
- Update `USD_RATE` periodically (or connect it to an FX API).

Namaste and dhanyabad — may your journeys be smooth.
