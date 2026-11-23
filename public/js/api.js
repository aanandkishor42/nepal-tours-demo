/** Small fetch wrapper so the rest of the app never repeats boilerplate. */
export async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    /* Non-JSON response — handled as a generic error below. */
  }

  if (!response.ok) {
    const message = data.error || (Array.isArray(data.errors) ? data.errors.join(' ') : null);
    const error = new Error(message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  getConfig: () => request('/api/config'),
  getVehicles: (filters = {}) => {
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value && value !== 'all' && value !== 0),
    );
    return request(`/api/vehicles${query.toString() ? `?${query}` : ''}`);
  },
  getRoutes: () => request('/api/routes'),
  getQuote: (payload, options) => request('/api/quote', { method: 'POST', body: payload, ...options }),
  createBooking: (payload) => request('/api/bookings', { method: 'POST', body: payload }),
};
