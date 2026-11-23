import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';

import './public/catalog.js';

const file = path => new URL(path, import.meta.url);
const read = path => JSON.parse(readFileSync(file(path), 'utf8').replace(/^\uFEFF/, ''));
let database = globalThis.PatrocloContent();
try { database = globalThis.PatrocloContent(read('./data/content.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const sessions = new Map();
const hash = value => createHash('sha256').update(value).digest();
const adminSecret = hash(process.env.PATROCLO_ADMIN_PASSWORD || 'adminUMNG123');
const fields = ['name', 'description', 'schedule', 'location', 'join'];
const assets = {
  '/public/app.js': ['app.js', 'text/javascript'],
  '/public/map.js': ['map.js', 'text/javascript'],
  '/public/catalog.js': ['catalog.js', 'text/javascript'],
  '/public/local.js': ['local.js', 'text/javascript'],
  '/public/style.css': ['style.css', 'text/css'],
  '/public/patroclo.png': ['patroclo.png', 'image/png'],
  '/public/three.js': ['three.js', 'text/javascript']
};
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16000) throw new Error('Solicitud demasiado larga.');
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString());
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Solicitud inválida.');
  return value;
}
function save(next) {
  mkdirSync(file('./data/'), { recursive: true });
  writeFileSync(file('./data/content.tmp'), JSON.stringify(next, null, 2));
  renameSync(file('./data/content.tmp'), file('./data/content.json'));
  database = next;
}
createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const token = req.headers.cookie?.match(/(?:^|;\s*)patroclo=([a-f0-9-]+)/)?.[1];
  const session = sessions.get(token);
  const role = session?.until > Date.now() ? session.role : null;
  const json = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(readFileSync(file('./index.html')));
    }
    if (req.method === 'GET' && Object.hasOwn(assets, path)) {
      const [name, type] = assets[path];
      let content;
      try { content = readFileSync(file('./public/' + name)); }
      catch (error) { if (error.code === 'ENOENT') return json(404, { error: 'Archivo no encontrado.' }); throw error; }
      res.writeHead(200, { 'Content-Type': type + (type.startsWith('image/') ? '' : '; charset=utf-8'), 'Cache-Control': 'no-cache' });
      return res.end(content);
    }
    if (req.method !== 'GET' && req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: 'Origen inválido.' });
    if (path === '/api/session' && req.method === 'GET') return json(200, { role, studentCode: role === 'student' ? session.studentCode : null });
    if (path === '/api/login' && req.method === 'POST') {
      const input = await body(req);
      const user = String(input.user ?? '').trim();
      const password = String(input.password ?? '');
      const nextRole = user === 'adminUMNG' && timingSafeEqual(hash(password), adminSecret)
        ? 'admin' : /^\d+$/.test(user) && password.trim() ? 'student' : null;
      if (!nextRole) return json(401, { error: 'Revisa tus datos de acceso.' });
      for (const [id, entry] of sessions) if (entry.until <= Date.now()) sessions.delete(id);
      sessions.delete(token);
      const id = randomUUID();
      const studentCode = nextRole === 'student' ? user : null;
      sessions.set(id, { role: nextRole, studentCode, until: Date.now() + 28800000 });
      res.setHeader('Set-Cookie', 'patroclo=' + id + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800');
      return json(200, { role: nextRole, studentCode });
    }
    if (path === '/api/logout' && req.method === 'POST') {
      sessions.delete(token);
      res.setHeader('Set-Cookie', 'patroclo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return json(200, {});
    }
    if (!role) return json(401, { error: 'Inicia sesión para continuar.' });
    if (path === '/api/groups' && req.method === 'GET') return json(200, database.groups);
    if (path === '/api/ask' && req.method === 'POST') {
      const { query } = await body(req);
      return json(200, globalThis.PatrocloSearch(database.groups, query));
    }
    const groupPath = path.match(/^\/api\/groups\/([a-z0-9-]+)(\/restore)?$/);
    if (groupPath && req.method === 'POST') {
      if (role !== 'admin') return json(403, { error: 'Acceso restringido.' });
      const [, id, restore] = groupPath;
      const input = restore ? {} : await body(req);
      const current = database.groups.find(group => group.id === id);
      if (!current) return json(404, { error: 'Grupo no encontrado.' });
      const versions = database.history[id] || [];
      if (restore && !versions.length) return json(409, { error: 'Este grupo aún no tiene una versión anterior.' });
      const updated = restore ? versions[0] : { ...current };
      if (!restore) {
        for (const field of fields) {
          if (typeof input[field] !== 'string' || input[field].length > 1500) return json(400, { error: 'Revisa los campos del grupo.' });
          updated[field] = input[field].trim();
        }
        if (!updated.name || !updated.description) return json(400, { error: 'Escribe el nombre y la descripción.' });
      }
      save({
        catalogVersion: 2,
        groups: database.groups.map(group => group.id === id ? updated : group),
        history: { ...database.history, [id]: restore ? versions.slice(1) : [current, ...versions].slice(0, 10) }
      });
      return json(200, updated);
    }
    return json(404, { error: 'Página no encontrada.' });
  } catch (error) {
    if (error instanceof SyntaxError || error.message.startsWith('Solicitud')) return json(400, { error: 'Solicitud inválida.' });
    console.error(error);
    return json(500, { error: 'No pudimos completar la operación.' });
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', function () {
  console.log('Patroclo Go · http://localhost:' + this.address().port);
});
