const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, 'public');
const database = new DatabaseSync(path.join(__dirname, 'departments.db'));

database.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    head TEXT NOT NULL,
    location TEXT NOT NULL,
    staff_count INTEGER NOT NULL DEFAULT 0 CHECK (staff_count >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

if (database.prepare('SELECT COUNT(*) AS count FROM departments').get().count === 0) {
  const seed = database.prepare('INSERT INTO departments (name, head, location, staff_count) VALUES (?, ?, ?, ?)');
  for (const department of [
    ['Computer Science', 'Dr. Maya Patel', 'Innovation Hall', 42],
    ['Business Administration', 'Prof. Marcus Lee', 'Commerce Building', 35],
    ['Design & Media', 'Dr. Sofia Rivera', 'Arts Quarter', 28],
    ['Environmental Studies', 'Dr. Elias Green', 'North Campus', 19]
  ]) seed.run(...department);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(data === undefined ? '' : JSON.stringify(data));
}

function getBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

function listDepartments() {
  return database.prepare(`
    SELECT id, name, head, location, staff_count AS staffCount, created_at AS createdAt
    FROM departments ORDER BY name COLLATE NOCASE
  `).all();
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function serveStatic(request, response) {
  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.normalize(path.join(publicDirectory, requestedPath));
  if (!filePath.startsWith(publicDirectory)) return sendJson(response, 403, { error: 'Forbidden.' });
  fs.readFile(filePath, (error, file) => {
    if (error) return sendJson(response, 404, { error: 'Page not found.' });
    const contentTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
    response.writeHead(200, { 'Content-Type': `${contentTypes[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    response.end(file);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  
  if (url.pathname === '/api/auth' && request.method === 'POST') {
    try {
      const body = await getBody(request);
      const action = body.action === 'register' ? 'register' : 'login';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) return sendJson(response, 400, { error: 'Email and password are required.' });

      if (action === 'register') {
        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
        if (!firstName || !lastName) return sendJson(response, 400, { error: 'First name and last name are required.' });
        if (password.length < 6) return sendJson(response, 400, { error: 'Password must be at least 6 characters.' });

        try {
          const result = database.prepare('INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)').run(firstName, lastName, email, hashPassword(password));
          return sendJson(response, 201, { message: 'Account created successfully.' });
        } catch (error) {
          if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendJson(response, 409, { error: 'An account with this email already exists.' });
          throw error;
        }
      } else {
        const user = database.prepare('SELECT id, email FROM users WHERE email = ? AND password = ?').get(email, hashPassword(password));
        if (!user) return sendJson(response, 401, { error: 'Invalid email or password.' });
        return sendJson(response, 200, { message: 'Login successful.' });
      }
    } catch (error) {
      return sendJson(response, 500, { error: 'Unable to process request.' });
    }
  }

  if (url.pathname === '/api/departments' && request.method === 'GET') return sendJson(response, 200, listDepartments());
  if (url.pathname === '/api/departments' && request.method === 'POST') {
    try {
      const body = await getBody(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const head = typeof body.head === 'string' ? body.head.trim() : '';
      const location = typeof body.location === 'string' ? body.location.trim() : '';
      const staffCount = Number(body.staffCount);
      if (!name || !head || !location || !Number.isInteger(staffCount) || staffCount < 0) return sendJson(response, 400, { error: 'Please provide valid department details.' });
      const result = database.prepare('INSERT INTO departments (name, head, location, staff_count) VALUES (?, ?, ?, ?)').run(name, head, location, staffCount);
      const department = database.prepare('SELECT id, name, head, location, staff_count AS staffCount, created_at AS createdAt FROM departments WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(response, 201, department);
    } catch (error) {
      const duplicate = error.code === 'SQLITE_CONSTRAINT_UNIQUE';
      return sendJson(response, duplicate ? 409 : 500, { error: duplicate ? 'A department with that name already exists.' : 'Unable to create department.' });
    }
  }
  const match = url.pathname.match(/^\/api\/departments\/(\d+)$/);
  if (match && request.method === 'DELETE') {
    const result = database.prepare('DELETE FROM departments WHERE id = ?').run(match[1]);
    return result.changes ? sendJson(response, 200, { message: 'Department deleted successfully.' }) : sendJson(response, 404, { error: 'Department not found.' });
  }
  if (request.method === 'GET') return serveStatic(request, response);
  sendJson(response, 404, { error: 'Route not found.' });
});

server.listen(port, () => console.log(`Department directory running at http://localhost:${port}`));
