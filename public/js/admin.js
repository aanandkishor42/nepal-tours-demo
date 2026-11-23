/** Admin panel: login, booking inbox and inline vehicle price editing. */
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
);

function toast(message, isError = false) {
  const element = $('#adminToast');
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3600);
}

async function apiCall(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function showDashboard() {
  $('#loginView').hidden = true;
  $('#dashboardView').hidden = false;
  $('#logoutBtn').hidden = false;
  loadDashboard();
}

const CHANNEL_LABELS = {
  whatsappCloud: 'WhatsApp · Meta Cloud',
  callmebot: 'WhatsApp · CallMeBot',
  webhook: 'Webhook / Make / Zapier',
  email: 'Email · SMTP',
};

function paintNotificationStatus(status) {
  $('#notifyBadges').innerHTML = Object.entries(CHANNEL_LABELS).map(([key, label]) =>
    `<span class="notify-badge ${status[key] ? 'on' : 'off'}">${status[key] ? '●' : '○'} ${label} ${status[key] ? 'ON' : 'OFF'}</span>`,
  ).join('');
}

async function loadNotificationStatus() {
  try {
    paintNotificationStatus(await apiCall('/api/admin/notification-status'));
  } catch (error) {
    $('#notifyBadges').innerHTML = `<span class="notify-badge off">${escapeHtml(error.message)}</span>`;
  }
}

async function loadDashboard() {
  loadNotificationStatus();
  try {
    const [bookingData, vehicleData] = await Promise.all([
      apiCall('/api/admin/bookings'), apiCall('/api/admin/vehicles'),
    ]);
    const bookings = bookingData.bookings;
    const vehicles = vehicleData.vehicles;

    $('#statBookings').textContent = bookings.length;
    $('#statVehicles').textContent = vehicles.length;
    $('#statNew').textContent = bookings.filter((b) => b.status === 'new').length;
    $('#statLowest').textContent = vehicles.length
      ? `NPR ${Math.min(...vehicles.map((v) => v.pricePerDay)).toLocaleString('en-IN')}`
      : '—';
    $('#bookingCount').textContent = `${bookings.length} request${bookings.length === 1 ? '' : 's'}`;

    $('#bookingRows').innerHTML = bookings.length
      ? bookings.map((booking) => `
          <tr>
            <td><strong>${escapeHtml(booking.id)}</strong>
              <span class="muted">${new Date(booking.createdAt).toLocaleString()}</span></td>
            <td><strong>${escapeHtml(booking.name)}</strong>
              <a class="muted" href="https://wa.me/${String(booking.phone).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(booking.phone)}</a>
              ${booking.email ? `<span class="muted">${escapeHtml(booking.email)}</span>` : ''}</td>
            <td>${escapeHtml(booking.vehicleName || booking.vehicleId)}<span class="muted">${booking.passengers ? booking.passengers + ' passenger(s)' : ''}</span></td>
            <td>${escapeHtml(booking.from || '—')} → ${escapeHtml(booking.to || '—')}</td>
            <td>${escapeHtml(booking.date || 'Flexible')}</td>
            <td>${escapeHtml(booking.message || '—')}</td>
            <td><div class="actions">
              <a class="btn btn-outline btn-sm" href="https://wa.me/${String(booking.phone).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <button class="btn btn-danger btn-sm" type="button" data-delete-booking="${escapeHtml(booking.id)}">Delete</button>
            </div></td>
          </tr>`).join('')
      : '<tr><td colspan="7" class="empty">No booking requests yet. They will appear here automatically.</td></tr>';

    $('#vehicleRows').innerHTML = vehicles.map((vehicle) => `
      <tr>
        <td><strong>${escapeHtml(vehicle.name)}</strong><span class="muted">${escapeHtml(vehicle.model)}</span></td>
        <td>${escapeHtml(vehicle.typeLabel)}</td>
        <td><input class="price-input" type="number" min="0" step="100" value="${vehicle.pricePerDay}" data-day-price="${escapeHtml(vehicle.id)}" aria-label="Day price for ${escapeHtml(vehicle.name)}" /></td>
        <td><input class="price-input" type="number" min="0" step="1" value="${vehicle.pricePerKm}" data-km-price="${escapeHtml(vehicle.id)}" aria-label="Kilometre price for ${escapeHtml(vehicle.name)}" /></td>
        <td><button class="btn btn-primary btn-sm" type="button" data-save-price="${escapeHtml(vehicle.id)}">Save</button></td>
      </tr>`).join('');
  } catch (error) {
    toast(error.message, true);
  }
}

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('button[type="submit"]', event.currentTarget);
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    await apiCall('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: $('#adminPassword').value }),
    });
    showDashboard();
    toast('Namaste! Welcome to the dashboard.');
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Log in';
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await apiCall('/api/admin/logout', { method: 'POST' });
  $('#dashboardView').hidden = true;
  $('#loginView').hidden = false;
  $('#logoutBtn').hidden = true;
  $('#adminPassword').value = '';
});

$('#refreshBtn').addEventListener('click', loadDashboard);

$('#testNotifyBtn').addEventListener('click', async () => {
  const button = $('#testNotifyBtn');
  button.disabled = true;
  button.textContent = 'Sending…';
  $('#notifyResult').textContent = '';
  try {
    const result = await apiCall('/api/admin/test-notification', { method: 'POST' });
    const summary = Object.entries(result.results)
      .map(([key, value]) => `${CHANNEL_LABELS[key]}: ${value.status}${value.status === 'failed' ? ` (${value.message})` : ''}`)
      .join(' · ');
    $('#notifyResult').textContent = summary;
    const delivered = Object.values(result.results).some((r) => r.status === 'sent');
    toast(delivered ? 'Test notification sent. Check your WhatsApp / inbox.' : 'No channel is configured yet — add credentials to .env and restart the server.', !delivered);
    paintNotificationStatus(result.status);
  } catch (error) {
    $('#notifyResult').textContent = error.message;
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Send test notification';
  }
});

$('#vehicleRows').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-save-price]');
  if (!button) return;
  const id = button.dataset.savePrice;
  const pricePerDay = Number($(`[data-day-price="${id}"]`).value);
  const pricePerKm = Number($(`[data-km-price="${id}"]`).value);
  button.disabled = true;
  try {
    await apiCall(`/api/admin/vehicles/${id}/prices`, {
      method: 'PATCH',
      body: JSON.stringify({ pricePerDay, pricePerKm }),
    });
    toast('Prices updated — the website now shows the new rates.');
    loadDashboard();
  } catch (error) {
    toast(error.message, true);
    button.disabled = false;
  }
});

$('#bookingRows').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-booking]');
  if (!button) return;
  if (!confirm('Delete this booking request permanently?')) return;
  try {
    await apiCall(`/api/admin/bookings/${encodeURIComponent(button.dataset.deleteBooking)}`, { method: 'DELETE' });
    toast('Booking deleted.');
    loadDashboard();
  } catch (error) {
    toast(error.message, true);
  }
});

// Restore an existing session on page load.
apiCall('/api/admin/session')
  .then((data) => { if (data.authenticated) showDashboard(); })
  .catch(() => {});
