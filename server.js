const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_desk',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

app.use(express.json({ limit: '20kb' }));

function validateRecord(body) {
  const record = {
    name: String(body.name || '').trim(),
    category: String(body.category || '').trim(),
    location: String(body.location || '').trim(),
    owner: String(body.owner || '').trim(),
    value: Number(body.value),
    status: String(body.status || '').trim(),
    notes: String(body.notes || '').trim()
  };
  const allowedStatuses = ['Active', 'Maintenance', 'Archived'];
  if (!record.name || !record.category || !record.location || !record.owner) {
    return { error: 'Name, category, location, and owner are required.' };
  }
  if (!Number.isFinite(record.value) || record.value < 0) {
    return { error: 'Value must be a valid non-negative number.' };
  }
  if (!allowedStatuses.includes(record.status)) {
    return { error: 'Choose a valid status.' };
  }
  return { record };
}

function handleDatabaseError(error, response) {
  console.error(error);
  response.status(500).json({ error: 'Database request failed. Check that XAMPP MySQL is running and the database is configured.' });
}

app.get('/api/records', async (_request, response) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, category, location, owner, value, status, notes FROM inventory_records ORDER BY created_at DESC, id DESC');
    response.json(rows);
  } catch (error) {
    handleDatabaseError(error, response);
  }
});

app.get('/api/records/:id', async (request, response) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, category, location, owner, value, status, notes FROM inventory_records WHERE id = ?', [request.params.id]);
    if (!rows.length) return response.status(404).json({ error: 'Record not found.' });
    response.json(rows[0]);
  } catch (error) {
    handleDatabaseError(error, response);
  }
});

app.post('/api/records', async (request, response) => {
  const { record, error } = validateRecord(request.body || {});
  if (error) return response.status(400).json({ error });
  try {
    const [result] = await pool.execute(
      'INSERT INTO inventory_records (name, category, location, owner, value, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [record.name, record.category, record.location, record.owner, record.value, record.status, record.notes]
    );
    response.status(201).json({ id: result.insertId, ...record });
  } catch (databaseError) {
    handleDatabaseError(databaseError, response);
  }
});

app.put('/api/records/:id', async (request, response) => {
  const { record, error } = validateRecord(request.body || {});
  if (error) return response.status(400).json({ error });
  try {
    const [result] = await pool.execute(
      'UPDATE inventory_records SET name = ?, category = ?, location = ?, owner = ?, value = ?, status = ?, notes = ? WHERE id = ?',
      [record.name, record.category, record.location, record.owner, record.value, record.status, record.notes, request.params.id]
    );
    if (!result.affectedRows) {
      const [rows] = await pool.execute('SELECT id FROM inventory_records WHERE id = ?', [request.params.id]);
      if (!rows.length) return response.status(404).json({ error: 'Record not found.' });
    }
    response.json({ id: Number(request.params.id), ...record });
  } catch (databaseError) {
    handleDatabaseError(databaseError, response);
  }
});

app.delete('/api/records/:id', async (request, response) => {
  try {
    const [result] = await pool.execute('DELETE FROM inventory_records WHERE id = ?', [request.params.id]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Record not found.' });
    response.status(204).end();
  } catch (error) {
    handleDatabaseError(error, response);
  }
});

app.use((request, response, next) => {
  if (['/server.js', '/database.sql', '/package.json', '/package-lock.json'].includes(request.path)) {
    return response.sendStatus(404);
  }
  next();
});
app.use(express.static(__dirname));
app.get('/', (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));

async function start() {
  try {
    await pool.query('SELECT 1');
    app.listen(port, () => console.log(`Inventory Desk running at http://localhost:${port}`));
  } catch (error) {
    console.error('Could not connect to MySQL. Start MySQL in XAMPP and import database.sql first.');
    console.error(error.message);
    process.exit(1);
  }
}

start();