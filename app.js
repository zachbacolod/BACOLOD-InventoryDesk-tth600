const STORAGE_KEY = 'inventory-desk-records';

const seedRecords = [
  { id: 'asset-1001', name: 'MacBook Pro 14-inch', category: 'Technology', location: 'Studio 2B', owner: 'Maya Chen', value: 2199, status: 'Active', notes: 'Primary design workstation.' },
  { id: 'asset-1002', name: 'Herman Miller Aeron', category: 'Furniture', location: 'Studio 2B', owner: 'Jon Bell', value: 1280, status: 'Active', notes: 'Size B, graphite finish.' },
  { id: 'asset-1003', name: 'Sony A7 IV Camera', category: 'Technology', location: 'Media Lab', owner: 'Nora Singh', value: 2498, status: 'Maintenance', notes: 'Sensor cleaning scheduled.' },
  { id: 'asset-1004', name: 'Cargo e-bike', category: 'Vehicles', location: 'Loading bay', owner: 'Facilities', value: 3400, status: 'Active', notes: 'Shared delivery vehicle.' },
  { id: 'asset-1005', name: 'Meeting table, oak', category: 'Furniture', location: 'Room 104', owner: 'Operations', value: 890, status: 'Archived', notes: 'Held for refurbishment.' }
];

function getRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRecords));
    return [...seedRecords];
  }
  try { return JSON.parse(saved); } catch { return [...seedRecords]; }
}

function saveRecords(records) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function formatCurrency(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function statusClass(status) { return `status-${status.toLowerCase()}`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character])); }

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
  const records = getRecords().filter(record => {
    const searchable = `${record.name} ${record.category} ${record.location} ${record.owner}`.toLowerCase();
    return searchable.includes(search) && (filter === 'all' || record.status === filter);
  });
  document.querySelector('#record-count').textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
  document.querySelector('#empty-state').hidden = records.length !== 0;
  body.innerHTML = records.map(record => `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.category)}</td><td>${escapeHtml(record.location)}</td><td>${escapeHtml(record.owner)}</td><td><span class="status ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td><td>${formatCurrency(record.value)}</td><td><div class="action-links"><a href="form.html?id=${encodeURIComponent(record.id)}">Edit</a><button class="delete-button" data-delete-id="${escapeHtml(record.id)}" type="button">Delete</button></div></td></tr>`).join('');
  body.querySelectorAll('[data-delete-id]').forEach(button => button.addEventListener('click', () => deleteRecord(button.dataset.deleteId)));
}

function deleteRecord(id) {
  const record = getRecords().find(item => item.id === id);
  if (!record || !window.confirm(`Delete ${record.name}?`)) return;
  saveRecords(getRecords().filter(item => item.id !== id));
  renderRecords();
}

function setupForm() {
  const form = document.querySelector('#record-form');
  const params = new URLSearchParams(window.location.search);
  const existing = getRecords().find(record => record.id === params.get('id'));
  if (existing) {
    document.querySelector('#form-title').textContent = 'Edit record';
    document.querySelector('#submit-label').textContent = 'Update record';
    Object.entries(existing).forEach(([key, value]) => { const field = document.querySelector(`#${key}`); if (field) field.value = value; });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const records = getRecords();
    const record = { ...data, id: data.id || `asset-${Date.now()}`, value: Number(data.value) };
    const index = records.findIndex(item => item.id === record.id);
    if (index === -1) records.unshift(record); else records[index] = record;
    saveRecords(records);
    document.querySelector('#form-message').textContent = index === -1 ? 'Record saved. Redirecting...' : 'Record updated. Redirecting...';
    window.setTimeout(() => { window.location.href = 'records.html'; }, 500);
  });
}

const records = getRecords();
if (document.body.dataset.page === 'dashboard') renderDashboard(records);
if (document.body.dataset.page === 'records') {
  renderRecords();
  document.querySelector('#record-search').addEventListener('input', renderRecords);
  document.querySelector('#status-filter').addEventListener('change', renderRecords);
}
if (document.body.dataset.page === 'form') setupForm();
