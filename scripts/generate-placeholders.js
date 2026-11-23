/**
 * Generates attractive local SVG placeholders so the site never looks broken
 * offline. Replace these files with your own JPG/WebP photos whenever ready.
 * Run with: npm run generate:images
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageRoot = path.join(root, 'public', 'images');

const esc = (value) => String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Simple flat vehicle silhouettes, centred near the bottom of the artwork. */
function vehicleIcon(type) {
  const body = (x, y, w, h, fill = '#f4f7fb') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 3}" fill="${fill}"/>`;
  const wheel = (x, y, r = 24) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#0b2545"/><circle cx="${x}" cy="${y}" r="${r / 2}" fill="#7f97b2"/>`;

  switch (type) {
    case 'sedan':
      return `<g>${body(410, 470, 380, 95)}<path d="M480 470l45-70h150l45 70z" fill="#dce7f3"/>${wheel(490, 570)}${wheel(710, 570)}</g>`;
    case 'suv':
      return `<g>${body(390, 440, 420, 120)}<path d="M450 440l40-85h260l40 85z" fill="#dce7f3"/>${wheel(485, 565)}${wheel(715, 565)}</g>`;
    case 'jeep':
      return `<g>${body(385, 430, 430, 130)}<path d="M445 430l35-80h275l35 80z" fill="#dce7f3"/><rect x="395" y="470" width="410" height="14" fill="#0b2545" opacity=".35"/>${wheel(480, 570, 28)}${wheel(720, 570, 28)}</g>`;
    case 'van':
    case 'tempo':
      return `<g>${body(350, 400, 500, 170)}<path d="M370 420h180v90H370zM580 420h80v90h-80z" fill="#cfe0f0"/><rect x="690" y="430" width="140" height="80" rx="14" fill="#cfe0f0"/>${wheel(470, 575)}${wheel(730, 575)}</g>`;
    case 'bus':
      return `<g>${body(280, 370, 640, 195)}<path d="M310 400h560v105H310z" fill="#cfe0f0"/>${[380, 500, 620, 740].map((x) => `<rect x="${x}" y="410" width="90" height="80" rx="8" fill="#b9d2e8"/>`).join('')}${wheel(420, 575)}${wheel(770, 575)}</g>`;
    case 'bike':
      return `<g>${wheel(430, 560, 62)}${wheel(770, 560, 62)}<path d="M430 560l120-120h130l90 120M550 440l-40-60h85M680 440l60-55" fill="none" stroke="#f4f7fb" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    case 'helicopter':
      return `<g><ellipse cx="600" cy="480" rx="200" ry="85" fill="#f4f7fb"/><path d="M760 445h130v50H760z" fill="#dce7f3"/><path d="M380 375h440v18H380z" fill="#f4f7fb"/><path d="M600 375v-70" stroke="#f4f7fb" stroke-width="16"/><circle cx="600" cy="480" r="55" fill="#b9d2e8"/>${wheel(490, 560, 18)}${wheel(710, 560, 18)}</g>`;
    default:
      return '';
  }
}

function artwork({ label, sublabel = '', tone = '#1d5b8f', icon = '', flag = false }) {
  const flags = flag
    ? `<g opacity=".95">${['#4b83c4', '#f7f5ef', '#c9473b', '#4a9c70', '#e8b348']
        .map((color, i) => `<path d="M${120 + i * 42} 155l42 0 0 70z" fill="${color}" opacity=".85"/>`).join('')}</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="Placeholder illustration for ${esc(label || sublabel)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b2545"/><stop offset="55%" stop-color="${tone}"/><stop offset="100%" stop-color="#f2a93b" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14375c"/><stop offset="100%" stop-color="#081d35"/></linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <circle cx="920" cy="205" r="76" fill="#ffe1a8" opacity=".72"/>
  ${flags}
  <g opacity=".55"><circle cx="220" cy="180" r="120" fill="none" stroke="#fff" stroke-width="2"/><circle cx="220" cy="180" r="88" fill="none" stroke="#fff" stroke-width="1"/><circle cx="220" cy="180" r="42" fill="none" stroke="#fff" stroke-width="1"/></g>
  <polygon points="-40,620 250,255 520,620" fill="#2c5781" opacity=".85"/>
  <polygon points="250,255 330,360 210,355" fill="#f4f8fd"/>
  <polygon points="360,640 700,210 1030,640" fill="#214b74"/>
  <polygon points="700,210 790,330 665,320 745,290" fill="#fff"/>
  <polygon points="820,630 1060,350 1260,630" fill="#2c5781" opacity=".8"/>
  <polygon points="1060,350 1110,420 1015,415" fill="#fff" opacity=".9"/>
  <path d="M0 655Q300 600 600 655T1200 640V800H0Z" fill="url(#hill)"/>
  ${vehicleIcon(icon)}
  <g font-family="Georgia, serif" fill="#fff">
    <text x="60" y="705" font-size="46" font-weight="700">${esc(label || 'Nepal')}</text>
    ${sublabel ? `<text x="62" y="750" font-size="22" font-family="Arial, sans-serif" fill="#ffd693" letter-spacing="2">${esc(sublabel)}</text>` : ''}
  </g>
  <text x="1140" y="755" text-anchor="end" font-size="18" font-family="Arial, sans-serif" fill="#fff" opacity=".45">PLACEHOLDER</text>
</svg>`;
}

const files = {
  'hero.svg': artwork({ label: 'The Himalayas', sublabel: 'NEPAL · PLACE YOUR PHOTO HERE', tone: '#123a63', flag: true }),
  'vehicles/sedan.svg': artwork({ label: 'Comfort Sedan', sublabel: 'TOYOTA AXIO / COROLLA', icon: 'sedan' }),
  'vehicles/suv.svg': artwork({ label: 'Premium SUV', sublabel: 'FORTUNER / SCORPIO', icon: 'suv', tone: '#1a4f78' }),
  'vehicles/jeep.svg': artwork({ label: '4x4 Jeep', sublabel: 'BUILT FOR THE MOUNTAINS', icon: 'jeep', tone: '#17466e' }),
  'vehicles/hiace.svg': artwork({ label: 'Hiace Van', sublabel: '10–14 SEATER', icon: 'van' }),
  'vehicles/tempo.svg': artwork({ label: 'Tempo Traveller', sublabel: '14 SEATER', icon: 'tempo', tone: '#1a5079' }),
  'vehicles/coach.svg': artwork({ label: 'Tourist Coach', sublabel: '30–45 SEATER', icon: 'bus' }),
  'vehicles/bike.svg': artwork({ label: 'Royal Enfield', sublabel: 'SELF-RIDE ADVENTURE', icon: 'bike', tone: '#2b4f72' }),
  'vehicles/helicopter.svg': artwork({ label: 'Helicopter Charter', sublabel: 'EVEREST / ANNAPURNA', icon: 'helicopter', tone: '#123a63', flag: true }),
  'routes/kathmandu-pokhara.svg': artwork({ label: 'Kathmandu → Pokhara', sublabel: '200 KM · 6–7 HOURS', flag: true }),
  'routes/chitwan.svg': artwork({ label: 'Chitwan Safari', sublabel: 'WILDLIFE & CULTURE', tone: '#1d5b6f' }),
  'routes/lumbini.svg': artwork({ label: 'Lumbini', sublabel: 'BIRTHPLACE OF LORD BUDDHA', tone: '#8a6330' }),
  'routes/nagarkot.svg': artwork({ label: 'Nagarkot Sunrise', sublabel: 'HIMALAYAN PANORAMA', tone: '#a55f3c' }),
  'routes/upper-mustang.svg': artwork({ label: 'Upper Mustang', sublabel: '4x4 JEEP SAFARI', tone: '#7a4b34' }),
  'routes/everest.svg': artwork({ label: 'Everest Region', sublabel: 'TRANSFERS & CHARTERS', tone: '#123a63' }),
  'gallery/annapurna.svg': artwork({ label: 'Annapurna Range', sublabel: 'SUNRISE OVER THE HIMALAYAS', tone: '#1d5b8f' }),
  'gallery/phewa.svg': artwork({ label: 'Phewa Lake', sublabel: 'POKHARA · NEPAL', tone: '#28708c' }),
  'gallery/jeep.svg': artwork({ label: 'Our 4x4 Fleet', sublabel: 'READY FOR MUSTANG', icon: 'jeep' }),
  'gallery/flags.svg': artwork({ label: 'Prayer Flags', sublabel: 'PEACE & COMPASSION', tone: '#2b5f85', flag: true }),
  'gallery/temple.svg': artwork({ label: 'Kathmandu Temples', sublabel: 'HERITAGE OF THE VALLEY', tone: '#8a4b38' }),
  'gallery/van.svg': artwork({ label: 'Group Transfers', sublabel: 'HIACE / TEMPO TRAVELLER', icon: 'van' }),
  'gallery/road.svg': artwork({ label: 'The Mountain Road', sublabel: 'EVERY TURN HAS A STORY', tone: '#17466e' }),
};

await Promise.all(
  Object.entries(files).map(async ([name, svg]) => {
    const file = path.join(imageRoot, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, svg, 'utf8');
  }),
);

console.log(`Generated ${Object.keys(files).length} placeholder images in public/images/`);
