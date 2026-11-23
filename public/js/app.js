/**
 * Front-end controller: fetches everything from the Express API, renders the
 * fleet/routes/pricing, runs the live quote calculator and handles all forms.
 */
import { api } from './api.js';
import { initI18n, t, getLanguage } from './i18n.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  config: null,
  vehicles: [],
  routes: [],
  currency: localStorage.getItem('nnt-currency') === 'USD' ? 'USD' : 'NPR',
};

/* ------------------------------ helpers --------------------------------- */

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

function formatMoney(npr) {
  const amount = Number(npr) || 0;
  if (state.currency === 'USD') {
    const rate = state.config?.usdRate || 133;
    return `$${(amount / rate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `NPR ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function updateMoneyUI(root = document) {
  $$('[data-npr]', root).forEach((element) => {
    element.textContent = formatMoney(element.dataset.npr);
  });
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4800);
}

const observeReveals = (root = document) => {
  const items = $$('.reveal:not(.in-view)', root);
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('in-view'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
  );
  items.forEach((item) => observer.observe(item));
};

/** If a local photo ever fails to load, fall back to its SVG illustration. */
function guardImages(root = document) {
  $$('img', root).forEach((image) => {
    if (image.dataset.guarded) return;
    image.dataset.guarded = '1';
    image.addEventListener('error', () => {
      if (image.dataset.fallbackUsed || !image.src.includes('/images/')) return;
      image.dataset.fallbackUsed = '1';
      image.src = image.src.replace(/\.jpg$/, '.svg');
    });
  });
}

function applyCompany(config) {
  $$('[data-dynamic]').forEach((element) => {
    const value = config.company[element.dataset.dynamic];
    if (value) element.textContent = value;
  });
  $$('[data-whatsapp-link]').forEach((link) => {
    link.href = `https://wa.me/${config.company.whatsapp}?text=${encodeURIComponent(
      `Namaste ${config.company.name}, I would like to enquire about a vehicle.`,
    )}`;
  });
  const phone = config.company.phone.replace(/[^\d+]/g, '');
  $$('a[href^="tel:"]').forEach((link) => { link.href = `tel:${phone}`; });
  $$('a[href^="mailto:"]').forEach((link) => { link.href = `mailto:${config.company.email}`; });
  $('[data-dynamic-map]')?.setAttribute('src', config.company.mapEmbed);
  document.title = getLanguage() === 'ne'
    ? 'नमस्ते नेपाल ट्रेभल्स | आरामसँग नेपाल घुमौँ'
    : `${config.company.name} | Explore Nepal in Comfort`;
}

/* ------------------------------ rendering -------------------------------- */

function vehicleName(vehicle) {
  return getLanguage() === 'ne' && vehicle.localName ? vehicle.localName : vehicle.name;
}

function vehicleUse(vehicle) {
  return getLanguage() === 'ne' && vehicle.bestUseNp ? vehicle.bestUseNp : vehicle.bestUse;
}

function filteredVehicles() {
  const { type, seats, sort } = state.filters;
  let vehicles = state.vehicles.filter(
    (vehicle) =>
      (type === 'all' || vehicle.type === type) && vehicle.seats >= Number(seats),
  );
  if (sort === 'priceLow') vehicles = [...vehicles].sort((a, b) => a.pricePerDay - b.pricePerDay);
  if (sort === 'priceHigh') vehicles = [...vehicles].sort((a, b) => b.pricePerDay - a.pricePerDay);
  if (sort === 'seats') vehicles = [...vehicles].sort((a, b) => b.seats - a.seats);
  return vehicles;
}

function renderFleet() {
  const vehicles = filteredVehicles();
  const grid = $('#fleetGrid');
  $('#fleetCount').textContent = t('fleet.count', vehicles.length);
  $('#fleetEmpty').hidden = vehicles.length > 0;

  grid.innerHTML = vehicles.map((vehicle) => {
    const perKmValue = vehicle.pricePerKm > 0
      ? `<span data-npr="${vehicle.pricePerKm}"></span>`
      : '—';
    const perKmUnit = vehicle.pricePerKm > 0
      ? t('card.perKm')
      : vehicle.type === 'bike' ? t('card.selfRide') : t('card.onRequest');
    return `
      <article class="vehicle-card reveal">
        <div class="vehicle-image">
          <img src="${escapeHtml(vehicle.image)}"
               alt="${escapeHtml(vehicle.name)} — ${escapeHtml(vehicle.model)}" loading="lazy" />
          ${vehicle.badge ? `<span class="badge">${escapeHtml(vehicle.badge)}</span>` : ''}
          <span class="ac-badge">${vehicle.ac ? 'AC' : t('card.nonAc')}</span>
        </div>
        <div class="vehicle-body">
          <div class="vehicle-title-row">
            <div>
              <h3>${escapeHtml(vehicleName(vehicle))}</h3>
              <span class="vehicle-model">${escapeHtml(vehicle.model)}</span>
            </div>
          </div>
          <div class="vehicle-specs">
            <span class="spec">👥 ${vehicle.seats} ${t('card.seats')}</span>
            <span class="spec">🧳 ${escapeHtml(vehicle.luggage)}</span>
            <span class="spec">${vehicle.driverIncluded ? '🚗 ' + t('card.driver') : '🔑 ' + t('card.selfDrive')}</span>
            ${vehicle.fuelIncluded ? `<span class="spec">⛽ ${t('card.fuel')}</span>` : ''}
          </div>
          <p class="vehicle-use"><strong>${t('card.bestFor')}:</strong> ${escapeHtml(vehicleUse(vehicle))}</p>
          <div class="price-row">
            <div class="price-main">
              <span class="amount" data-npr="${vehicle.pricePerDay}"></span>
              <span class="unit">${t('card.perDay')}</span>
            </div>
            <div class="price-km"><strong>${perKmValue}</strong><span>${perKmUnit}</span></div>
          </div>
          <div class="vehicle-actions">
            <button class="btn btn-primary" type="button" data-book="${vehicle.id}">${t('card.book')}</button>
            <button class="btn btn-outline" type="button" data-quote="${vehicle.id}">${t('card.quote')}</button>
          </div>
        </div>
      </article>`;
  }).join('');

  guardImages(grid);
  observeReveals(grid);
  updateMoneyUI(grid);
}

function renderPricingTable() {
  $('#priceTableBody').innerHTML = state.vehicles.map((vehicle) => `
    <tr>
      <td data-label="${t('table.vehicle')}">${escapeHtml(vehicleName(vehicle))}
        <small style="display:block;font-weight:400;color:var(--muted);font-size:.72rem">${escapeHtml(vehicle.typeLabel)}</small>
      </td>
      <td data-label="${t('table.seats')}">${vehicle.seats}</td>
      <td class="price-cell" data-label="${t('table.day')}" data-npr="${vehicle.pricePerDay}"></td>
      <td class="price-cell" data-label="${t('table.km')}">${vehicle.pricePerKm > 0 ? `<span data-npr="${vehicle.pricePerKm}"></span>` : '—'}</td>
      <td data-label="${t('table.driver')}"><span class="${vehicle.driverIncluded ? 'yes' : 'no'}">${vehicle.driverIncluded ? '✓ ' + t('table.driver') : '— ' + t('card.selfDrive')}</span></td>
      <td data-label="${t('table.fuel')}"><span class="${vehicle.fuelIncluded ? 'yes' : 'no'}">${vehicle.fuelIncluded ? '✓ ' + t('table.fuel') : '—'}</span></td>
    </tr>`).join('');
  updateMoneyUI($('#priceTableBody'));
}

function renderRoutes() {
  $('#routesGrid').innerHTML = state.routes.map((route) => {
    const vehicle = state.vehicles.find((v) => v.id === route.bestVehicleId);
    return `
      <article class="route-card reveal">
        <div class="route-image">
          <img src="${escapeHtml(route.image)}"
               alt="${escapeHtml(route.name)} — scenic route in Nepal" loading="lazy" />
          <span class="route-type">${escapeHtml(route.type)}</span>
        </div>
        <div class="route-body">
          <h3>${escapeHtml(getLanguage() === 'ne' && route.nameNp ? route.nameNp : route.name)}</h3>
          <p>${escapeHtml(route.description)}</p>
          <div class="route-highlights">${route.highlights.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
          <div class="route-meta">
            <div><span>${t('route.distance')}</span><strong>${route.distanceKm} km</strong></div>
            <div><span>${t('route.time')}</span><strong>${escapeHtml(route.duration)}</strong></div>
            <div><span>${t('route.best')}</span><strong>${escapeHtml(vehicle ? vehicleName(vehicle) : '—')}</strong></div>
          </div>
          <div class="route-foot">
            <div class="route-price"><span>${t('route.from')}</span><strong data-npr="${route.priceFrom}"></strong></div>
            <button class="btn btn-primary" type="button" data-route="${route.id}">${t('route.plan')}</button>
          </div>
        </div>
      </article>`;
  }).join('');
  guardImages($('#routesGrid'));
  observeReveals($('#routesGrid'));
  updateMoneyUI($('#routesGrid'));
}

function renderDynamic() {
  if (!state.vehicles.length) return;
  renderFleet();
  renderPricingTable();
  renderRoutes();
}

function populateSelects() {
  const options = state.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${escapeHtml(vehicle.name)} · ${vehicle.seats} ${t('card.seats')}</option>`)
    .join('');
  $('#qbVehicle').insertAdjacentHTML('beforeend', options);
  $('#calcVehicle').innerHTML = options;
  $('#bkVehicle').innerHTML = options;
}

/* ---------------------------- quote calculator --------------------------- */

function renderQuote(quote) {
  const result = $('#quoteResult');
  const b = quote.breakdown;
  result.innerHTML = `
    <div class="quote-total">
      <span>${t('calc.total')}</span>
      <strong data-npr="${quote.total}"></strong>
    </div>
    <div class="quote-lines">
      <div><span>${t('calc.daily')} × ${quote.days}</span><span data-npr="${b.dailyCost}"></span></div>
      <div><span>${t('calc.distance')} × ${quote.km} km</span><span data-npr="${b.distanceCost}"></span></div>
      ${b.driverCost ? `<div><span>${t('calc.driver')}</span><span data-npr="${b.driverCost}"></span></div>` : ''}
      ${b.discount ? `<div class="discount"><span>${t('calc.discount')} (${b.discountPercent}%)</span><span>−<span data-npr="${b.discount}"></span></span></div>` : ''}
      <div><span>${t('calc.total')}</span><span data-npr="${quote.total}"></span></div>
    </div>
    <p class="calc-footnote">${t('calc.excluded')}</p>`;
  updateMoneyUI(result);
  state.quote = quote;
}

async function updateQuote() {
  const vehicleId = $('#calcVehicle').value;
  if (!vehicleId) return;
  const days = Math.min(90, Math.max(1, Number($('#calcDays').value) || 1));
  const km = Math.min(10000, Math.max(0, Number($('#calcKm').value) || 0));
  $('#quoteResult').innerHTML = `<p class="quote-loading">${t('calc.calculating')}</p>`;

  updateQuote.controller?.abort();
  updateQuote.controller = new AbortController();
  try {
    const quote = await api.getQuote({ vehicleId, days, km }, { signal: updateQuote.controller.signal });
    renderQuote(quote);
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#quoteResult').innerHTML = `<p class="quote-loading">${escapeHtml(error.message)}</p>`;
  }
}

function scheduleQuote() {
  clearTimeout(scheduleQuote.timer);
  scheduleQuote.timer = setTimeout(updateQuote, 260);
}

/* ------------------------------- interactions ---------------------------- */

function suitableVehicle(passengers, preferredType) {
  if (preferredType && preferredType !== 'all') {
    const match = state.vehicles.find((v) => v.id === preferredType);
    if (match) return match;
  }
  const eligible = state.vehicles
    .filter((v) => !['bike', 'helicopter'].includes(v.type) && v.seats >= passengers)
    .sort((a, b) => a.seats - b.seats);
  return eligible[0] || state.vehicles[0];
}

function prefillBooking({ vehicleId, from, to, date, passengers, message }) {
  if (vehicleId) $('#bkVehicle').value = vehicleId;
  if (from) $('#bkFrom').value = from;
  if (to) $('#bkTo').value = to;
  if (date) $('#bkDate').value = date;
  if (passengers) $('#bkPassengers').value = passengers;
  if (message) $('#bkMessage').value = message;
  $('#contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => $('#bkName').focus({ preventScroll: true }), 600);
}

function bindStaticEvents() {
  // Mobile menu
  const navToggle = $('#navToggle');
  const nav = $('#mainNav');
  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  $$('#mainNav a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Sticky header shadow
  window.addEventListener('scroll', () => {
    $('#siteHeader').classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Currency switch
  const currencyButton = $('#currencyToggle');
  const paintCurrency = () => {
    currencyButton.textContent = state.currency;
    currencyButton.setAttribute('aria-pressed', String(state.currency === 'USD'));
    updateMoneyUI();
  };
  paintCurrency();
  currencyButton?.addEventListener('click', () => {
    state.currency = state.currency === 'NPR' ? 'USD' : 'NPR';
    localStorage.setItem('nnt-currency', state.currency);
    paintCurrency();
  });

  // Filters (collapsible on phones)
  state.filters = { type: 'all', seats: 0, sort: 'recommended' };
  const filtersPanel = $('#filtersPanel');
  const filtersToggle = $('#filtersToggle');
  filtersToggle?.addEventListener('click', () => {
    const open = filtersPanel.classList.toggle('open');
    filtersToggle.setAttribute('aria-expanded', String(open));
  });
  const paintFilterCount = () => {
    const badge = $('#filterCountBadge');
    if (!badge) return;
    const { type, seats, sort } = state.filters;
    const active = (type !== 'all' ? 1 : 0) + (Number(seats) > 0 ? 1 : 0)
      + (sort !== 'recommended' ? 1 : 0);
    badge.textContent = active ? `· ${active}` : '';
  };
  const applyFilters = () => { paintFilterCount(); renderFleet(); };
  $('#filterType').addEventListener('change', (event) => { state.filters.type = event.target.value; applyFilters(); });
  $('#filterSeats').addEventListener('change', (event) => { state.filters.seats = event.target.value; applyFilters(); });
  $('#filterSort').addEventListener('change', (event) => { state.filters.sort = event.target.value; applyFilters(); });
  $('#filterReset').addEventListener('click', () => {
    state.filters = { type: 'all', seats: 0, sort: 'recommended' };
    $('#filterType').value = 'all'; $('#filterSeats').value = '0'; $('#filterSort').value = 'recommended';
    paintFilterCount();
    renderFleet();
  });

  // Quick booking bar
  const today = new Date().toISOString().slice(0, 10);
  ['#qbDate', '#bkDate'].forEach((selector) => { $(selector).min = today; });
  $('#quickBookForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get('from') || '').trim();
    const to = String(form.get('to') || '').trim();
    const date = String(form.get('date') || '');
    const passengers = Number(form.get('passengers')) || 2;
    const vehicle = suitableVehicle(passengers, String(form.get('vehicle')));

    const days = date ? Math.max(1, Math.ceil((new Date(date) - new Date(today)) / 86400000)) : 3;
    const destination = to.toLowerCase();
    const km = destination.includes('pokhara') ? 200 : destination.includes('nagarkot') ? 32
      : destination.includes('chitwan') ? 600 : destination.includes('lumbini') ? 540 : 180;

    $('#calcVehicle').value = vehicle.id;
    $('#calcDays').value = Math.min(90, days);
    $('#calcKm').value = km;
    $$('.quick-distances button').forEach((button) => button.classList.remove('active'));
    updateQuote();

    prefillBooking({
      vehicleId: vehicle.id, from, to, date, passengers,
      message: `Hi! I'm interested in the ${vehicle.name} from ${from || 'Kathmandu'} to ${to || 'Pokhara'}${
        date ? ` on ${date}` : ''
      } for ${passengers} passenger(s). Approx. ${km} km. Please send your best quote.`,
    });
    showToast(t('quick.badge'));
  });

  // Calculator
  ['#calcVehicle', '#calcDays', '#calcKm'].forEach((selector) => {
    $(selector).addEventListener('input', scheduleQuote);
    $(selector).addEventListener('change', scheduleQuote);
  });
  $$('.quick-distances button').forEach((button) => button.addEventListener('click', () => {
    $('#calcKm').value = button.dataset.km;
    $$('.quick-distances button').forEach((other) => other.classList.toggle('active', other === button));
    updateQuote();
  }));
  $('#quoteToBooking').addEventListener('click', () => {
    const vehicle = state.vehicles.find((v) => v.id === $('#calcVehicle').value);
    const quote = state.quote;
    prefillBooking({
      vehicleId: vehicle?.id,
      from: $('#qbFrom').value,
      to: $('#qbTo').value,
      date: $('#qbDate').value,
      passengers: $('#qbPassengers').value,
      message: quote
        ? `Please confirm this estimate: ${vehicle?.name}, ${quote.days} day(s), ${quote.km} km — ${formatMoney(quote.total)}.`
        : '',
    });
  });

  // Delegated fleet / route buttons
  document.addEventListener('click', (event) => {
    const bookButton = event.target.closest('[data-book]');
    if (bookButton) {
      prefillBooking({ vehicleId: bookButton.dataset.book });
      return;
    }
    const quoteButton = event.target.closest('[data-quote]');
    if (quoteButton) {
      $('#calcVehicle').value = quoteButton.dataset.quote;
      updateQuote();
      $('#calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      const route = state.routes.find((item) => item.id === routeButton.dataset.route);
      if (!route) return;
      const [from, to] = route.name.split('→').map((part) => part.trim());
      prefillBooking({
        vehicleId: route.bestVehicleId,
        from: from || 'Kathmandu',
        to: to || route.name,
        message: `Hi! I'm interested in the ${route.name} package (${route.distanceKm} km, ${route.duration}). Please share availability and the full price.`,
      });
    }
  });

  // Booking form
  $('#bookingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      showToast('Please complete the required fields.', true);
      return;
    }
    const formData = new FormData(form);
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const result = await api.createBooking({
        name: formData.get('name'), phone: formData.get('phone'), email: formData.get('email'),
        vehicleId: formData.get('vehicleId'), from: formData.get('from'), to: formData.get('to'),
        date: formData.get('date'), passengers: formData.get('passengers'), message: formData.get('message'),
      });
      showToast(`${result.message} Ref: ${result.booking.id}`);
      form.reset();
      $('#bkVehicle').value = state.vehicles[0]?.id || '';
    } catch (error) {
      showToast(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = getLanguage() === 'ne' ? 'बुकिङ अनुरोध पठाउनुहोस्' : 'Send Booking Request';
    }
  });

  // Accordion: only one open at a time
  $$('.faq-list details').forEach((details) => details.addEventListener('toggle', () => {
    if (details.open) $$('.faq-list details').forEach((other) => { if (other !== details) other.open = false; });
  }));

  // Gallery lightbox
  const lightbox = $('#lightbox');
  $$('.gallery-item').forEach((item) => item.addEventListener('click', () => {
    const image = $('img', item);
    $('#lightboxImg').src = image.currentSrc || image.src;
    $('#lightboxImg').alt = image.alt;
    $('#lightboxCaption').textContent = item.dataset.caption || '';
    lightbox.showModal();
  }));
  $('#lightboxClose').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
}

/* -------------------------------- startup -------------------------------- */

async function init() {
  bindStaticEvents();
  initI18n();
  window.addEventListener('langchange', () => {
    renderDynamic();
    updateMoneyUI();
    const button = $('#bookingForm button[type="submit"]');
    if (button && !button.disabled) button.textContent = t('contact.submit');
  });

  $('#year').textContent = new Date().getFullYear();

  try {
    const [config, vehiclesResult, routesResult] = await Promise.all([
      api.getConfig(), api.getVehicles(), api.getRoutes(),
    ]);
    state.config = config;
    state.vehicles = vehiclesResult.vehicles;
    state.routes = routesResult.routes;
    applyCompany(config);
    guardImages(document);
    populateSelects();
    renderDynamic();
    observeReveals(document);
    updateQuote();
  } catch (error) {
    $('#fleetGrid').innerHTML = '';
    $('#fleetEmpty').hidden = false;
    $('#fleetEmpty').textContent = error.message;
    showToast(error.message, true);
  }
}

init();
