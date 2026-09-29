let recordsCache = [];

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function formatCurrency(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function statusClass(status) { return `status-${status.toLowerCase()}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character])); }

function showPageError(message) {
  let banner = document.querySelector('#page-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'page-error';
    banner.className = 'page-error';
    document.querySelector('.main-content').prepend(banner);
  }
  banner.textContent = message;
}

function renderDashboard(records) {
  document.querySelector('#total-count').textContent = records.length;
  document.querySelector('#attention-count').textContent = records.filter(record => record.status === 'Maintenance' || record.status === 'Archived').length;
  document.querySelector('#total-value').textContent = formatCurrency(records.reduce((total, record) => total + Number(record.value), 0));
  const recent = document.querySelector('#recent-records');
  recent.innerHTML = records.slice(0, 4).map(record => `<div class="record-row"><div><div class="record-name">${escapeHtml(record.name)}</div><div class="record-meta">${escapeHtml(record.location)} · ${escapeHtml(record.category)}</div></div><span class="status ${statusClass(record.status)}">${escapeHtml(record.status)}</span><span class="record-value">${formatCurrency(record.value)}</span></div>`).join('');
  const counts = records.reduce((result, record) => { result[record.category] = (result[record.category] || 0) + 1; return result; }, {});
  const max = Math.max(...Object.values(counts), 1);
  document.querySelector('#category-bars').innerHTML = Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([category, count]) => `<div><div class="bar-label"><span>${escapeHtml(category)}</span><strong>${count}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div></div>`).join('');
}

function renderRecords() {
  const body = document.querySelector('#records-body');
  const search = document.querySelector('#record-search').value.toLowerCase().trim();
  const filter = document.querySelector('#status-filter').value;
  const records = recordsCache.filter(record => {
    const searchable = `${record.name} ${record.category} ${record.location} ${record.owner}`.toLowerCase();
    return searchable.includes(search) && (filter === 'all' || record.status === filter);
  });
  document.querySelector('#record-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
  document.querySelector('#empty-state').hidden = records.length !== 0;
  body.innerHTML = records.map(record => `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.category)}</td><td>${escapeHtml(record.location)}</td><td>${escapeHtml(record.owner)}</td><td><span class="status ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td><td>${formatCurrency(record.value)}</td><td><div class="action-links"><a href="form.html?id=${encodeURIComponent(record.id)}">Edit</a><button class="delete-button" data-delete-id="${escapeHtml(record.id)}" type="button">Delete</button></div></td></tr>`).join('');
  body.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', () => deleteRecord(button.dataset.deleteId)));
}

async function deleteRecord(id) {
  const record = recordsCache.find(item => String(item.id) === String(id));
  if (!record || !window.confirm(`Delete ${record.name}?`)) return;
  try {
    await apiRequest(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
    recordsCache = recordsCache.filter(item => String(item.id) !== String(id));
    renderRecords();
  } catch (error) {
    showPageError(error.message);
  }
}

async function setupForm() {
  const form = document.querySelector('#record-form');
  const message = document.querySelector('#form-message');
  const submit = form.querySelector('[type="submit"]');
  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    try {
      const existing = await apiRequest(`/api/records/${encodeURIComponent(id)}`);
      document.querySelector('#form-title').textContent = 'Edit record';
      document.querySelector('#submit-label').textContent = 'Update record';
      Object.entries(existing).forEach(([key, value]) => {
        const field = document.querySelector(`#${key}`);
        if (field) field.value = value ?? '';
      });
    } catch (error) {
      message.textContent = error.message;
      submit.disabled = true;
      return;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.value = Number(data.value);
    submit.disabled = true;
    message.textContent = 'Saving...';
    try {
      await apiRequest(id ? `/api/records/${encodeURIComponent(id)}` : '/api/records', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
      message.textContent = id ? 'Record updated. Redirecting...' : 'Record saved. Redirecting...';
      window.setTimeout(() => { window.location.href = 'records.html'; }, 500);
    } catch (error) {
      message.textContent = error.message;
      submit.disabled = false;
    }
  });
}

async function loadRecords() {
  recordsCache = await apiRequest('/api/records');
  return recordsCache;
}

if (document.body.dataset.page === 'dashboard') {
  loadRecords().then(renderDashboard).catch(error => showPageError(error.message));
}
if (document.body.dataset.page === 'records') {
  loadRecords().then(renderRecords).catch(error => showPageError(error.message));
  document.querySelector('#record-search').addEventListener('input', renderRecords);
  document.querySelector('#status-filter').addEventListener('change', renderRecords);
}
if (document.body.dataset.page === 'form') setupForm();
