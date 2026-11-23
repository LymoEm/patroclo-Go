(() => {
'use strict';
const { mountMap, places } = globalThis.PatrocloMap;

const app = document.querySelector('#app');
const loginMarkup = app.innerHTML;
const categories = ['Arte y cultura', 'Deportes y recreación', 'Salud integral', 'Desarrollo humano'];
const fields = { name: 'Nombre', description: 'Descripción', schedule: 'Horarios', location: 'Ubicación', join: 'Cómo unirse' };
let groups = [];
let map;
let selectedGroup;
let studentCode;

function el(tag, content, css = '') {
  const node = document.createElement(tag);
  node.className = css;
  node.textContent = content;
  return node;
}
async function api(path, data) {
  if (useLocal) return globalThis.PatrocloLocal(path, data);
  const response = await fetch('/api/' + path, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  return payload;
}
function button(content, action, css = '') {
  const node = el('button', content, css);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function status(node, message) {
  node.textContent = message;
}
const logo = '<img src="public/patroclo.png" alt="" class="brand-logo"><span>Patroclo <strong>Go</strong><small>UMNG · Calle 100</small></span>';

function login() {
  map?.dispose();
  map = undefined;
  app.innerHTML = loginMarkup;
  const choices = [...app.querySelectorAll('.switch button')];
  const form = app.querySelector('form');
  const user = form.elements.user;
  choices.forEach((choice, index) => choice.addEventListener('click', () => {
    choices.forEach((item, i) => item.setAttribute('aria-pressed', i === index));
    app.querySelector('#user-label').textContent = index ? 'Usuario' : 'Código estudiantil';
    user.inputMode = index ? 'text' : 'numeric';
    if (index) user.removeAttribute('pattern');
    else user.pattern = '[0-9]+';
    form.reset();
    status(form.querySelector('.notice'), '');
  }));
  form.onsubmit = async event => {
    event.preventDefault();
    const submit = form.querySelector('[type=submit]');
    const payload = Object.fromEntries(new FormData(form));
    submit.disabled = true;
    choices.forEach(choice => { choice.disabled = true; });
    try {
      await dashboard(await api('login', payload));
    } catch (error) {
      status(form.querySelector('.notice'), error.message);
    } finally {
      submit.disabled = false;
      choices.forEach(choice => { choice.disabled = false; });
    }
  };
}

async function dashboard({ role, studentCode: code }) {
  studentCode = code;
  groups = await api('groups');
  app.innerHTML = `
    <header class="topbar"><div class="wrap">
      <div class="brand">${logo}</div>
      <button id="logout" class="light" type="button">Cerrar sesión</button>
    </div></header>
    <main class="wrap dashboard" id="main"></main>`;
  app.querySelector('#logout').onclick = async () => {
    try { await api('logout', {}); login(); }
    catch (error) { alert(error.message); }
  };
  if (role === 'admin') admin();
  else student();
}
function results(host, list, empty = 'No encontramos coincidencias. Prueba con una actividad o un servicio.') {
  host.replaceChildren();
  if (!list.length) host.append(el('p', empty));
  for (const group of list) {
    const item = button(group.name, () => showGroup(group), 'result');
    const arrow = el('span', '→');
    arrow.setAttribute('aria-hidden', 'true');
    item.append(arrow);
    host.append(item);
  }
}
function showPlace(id) {
  const place = places[id];
  map?.showRoute(id);
  const host = app.querySelector('#map-info');
  host.replaceChildren(el('h3', place.name), el('p', place.detail));
  if (place.floor) {
    host.prepend(el('p', 'Desde Plaza Cervantes · ' + place.floor, 'overline'));
    if (place.descent) host.append(el('p', 'Amarillo: primer piso. Azul: descenso y sótano.', 'route-note'));
  }
  for (const control of app.querySelectorAll('#place-list button')) {
    control.setAttribute('aria-pressed', control.dataset.place === id);
  }
  const nearby = groups.filter(group => group.places?.includes(id));
  if (nearby.length) {
    const list = el('details', '', 'nearby');
    const entries = el('div', '', 'route-groups');
    list.append(el('summary', 'Ver actividades en este lugar (' + nearby.length + ')'), entries);
    results(entries, nearby);
    host.append(list);
  }
}
function showGroup(group) {
  const dialog = app.querySelector('#group-dialog');
  const body = dialog.querySelector('.group-body');
  body.replaceChildren(el('p', group.category, 'overline'), el('h2', group.name), el('p', group.description));
  const details = el('dl', '');
  const labels = { ...fields, area: 'Área', contact: 'Contacto', requirements: 'Requisitos', benefits: 'Beneficios', dates: 'Convocatorias', audience: 'A quién se dirige' };
  for (const key of ['area', 'location', 'schedule', 'contact', 'audience', 'requirements', 'join', 'benefits', 'dates']) {
    if (group[key]) details.append(el('dt', labels[key]), el('dd', group[key]));
  }
  body.append(details);
  for (const id of group.places || []) body.append(button('Ruta a ' + places[id].name, () => {
    dialog.close();
    showPlace(id);
    app.querySelector('#campus-title').scrollIntoView({ block: 'start' });
  }, 'primary route-button'));
  dialog.showModal();
}
function missionDay(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', dateStyle: 'short' }).format(date);
}
function renderMissions() {
  const container = app.querySelector('#missions');
  const key = 'patroclo-missions-v1:' + (studentCode || 'estudiante');
  const progress = JSON.parse(localStorage.getItem(key)) || { visits: [], completed: 0 };
  const today = missionDay();
  const monday = new Date(today + 'T00:00:00Z');
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const week = monday.toISOString().slice(0, 10);
  const visits = progress.visits.filter(date => date >= week && date <= today);
  const missions = [
    { name: 'Visita el gimnasio 3 veces esta semana', text: 'Registra una visita por día entre lunes y domingo.', place: 'gimnasio' },
    { name: 'Inscríbete en un grupo', text: 'Consulta la ficha del grupo y confirma aquí cuando hayas completado la inscripción.' },
    { name: 'Conoce la Zona de artes', text: 'Sigue la ruta desde Plaza Cervantes y registra tu visita.', place: 'artes' },
    { name: 'Explora los servicios de Bienestar y COASE', text: 'Consulta una ficha de Salud integral o Desarrollo humano y confirma cuando termines.' }
  ];
  function save() {
    localStorage.setItem(key, JSON.stringify(progress));
    renderMissions();
  }
  container.replaceChildren();
  missions.forEach((mission, index) => {
    const done = index < progress.completed;
    const locked = index > progress.completed;
    const item = el('article', '', 'mission');
    const heading = el('div', '', 'mission-heading');
    const count = index === 0 ? (done ? ' · 3/3' : ' · ' + visits.length + '/3') : '';
    heading.append(el('h3', mission.name), el('span', (done ? 'Completado' : locked ? 'Bloqueada' : 'En curso') + count, 'mission-state'));
    item.append(heading, el('p', mission.text));
    if (locked || done) {
      container.append(item);
      return;
    }
    const actions = el('div', '', 'mission-actions');
    if (mission.place) actions.append(button('Ver ruta', () => {
      showPlace(mission.place);
      app.querySelector('#campus-title').scrollIntoView({ block: 'start' });
    }, 'light'));
    const form = el('form', '', 'mission-form');
    const notice = el('p', '', 'notice');
    notice.setAttribute('role', 'status');
    const submit = el('button', index === 0 ? 'Registrar visita' : 'Marcar como completada', 'primary');
    let input;
    if (index === 0) {
      const label = el('label', 'Fecha de la visita');
      input = el('input', '');
      input.type = 'date';
      input.min = week;
      input.max = today;
      input.value = today;
      input.required = true;
      label.append(input);
      form.append(label);
    } else if (index === 1 || index === 3) {
      const label = el('label', index === 1 ? 'Grupo en el que te inscribiste' : 'Servicio consultado');
      input = el('select', '');
      input.required = true;
      input.append(new Option('Selecciona una ficha', ''));
      const categories = index === 1 ? ['Arte y cultura', 'Deportes y recreación'] : ['Salud integral', 'Desarrollo humano'];
      for (const group of groups.filter(group => categories.includes(group.category))) {
        input.append(new Option(group.name, group.id));
      }
      const browse = button('Consultar ficha', () => {
        const group = groups.find(group => group.id === input.value);
        if (group) showGroup(group);
      }, 'light');
      browse.disabled = true;
      input.addEventListener('change', () => { browse.disabled = !input.value; });
      label.append(input);
      form.append(label, browse);
    }
    form.append(submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (index === 0) {
        if (visits.includes(input.value)) {
          status(notice, 'Ya registraste una visita en esa fecha.');
          return;
        }
        progress.visits = [...visits, input.value];
        if (progress.visits.length === 3) progress.completed = 1;
      } else {
        progress.completed = index + 1;
      }
      save();
      if (progress.completed === index + 1 && matchMedia('(max-width: 780px)').matches) {
        const dialog = app.querySelector('#mission-dialog');
        dialog.querySelector('p').textContent = 'Completaste la misión «' + mission.name + '».';
        dialog.showModal();
      }
    });
    item.append(actions, form, notice);
    container.append(item);
  });
}
function student() {
  app.querySelector('#main').innerHTML = `
    <nav class="jump" aria-label="Secciones"><a href="#campus-title">Mapa</a><a href="#assistant-title">Asistente</a><a href="#missions-title">Misiones</a></nav>
    <div class="head"><p class="overline">SEDE CALLE 100</p><h1>Descubre tu C100</h1></div>
    <div class="student-grid">
      <section class="card campus" aria-labelledby="campus-title">
        <div class="card-head"><div><h2 id="campus-title">Mapa del campus</h2><p>Elige un destino desde Plaza Cervantes.</p></div></div>
        <div id="map-area">
          <div class="map-tools" aria-label="Controles del mapa"></div>
        </div>
        <div id="place-list" aria-label="Lugares del campus"></div>
        <div id="map-info" aria-live="polite"></div>
      </section>
      <section class="card assistant" aria-labelledby="assistant-title">
        <div class="assistant-head"><img src="public/patroclo.png" alt=""><div><p class="overline">ASISTENTE PATROCLO</p><h2 id="assistant-title">¿Qué necesitas?</h2></div></div>
        <form id="search-form" role="search">
          <label for="search">Busca actividades o servicios</label>
          <div class="search-row"><input id="search" name="query" placeholder="Ej. porras o salud" required maxlength="200">
          <button class="primary" type="submit">Buscar</button></div>
        </form>
        <div class="categories" aria-label="Categorías"></div>
        <div id="results" aria-live="polite"></div>
      </section>
    </div>
    <section class="card missions" aria-labelledby="missions-title"><h2 id="missions-title">Misiones</h2><p>Completa cada misión para desbloquear la siguiente.</p><div id="missions"></div></section>
    <dialog id="group-dialog" aria-label="Información del grupo"><form method="dialog"><button class="light" aria-label="Cerrar ficha">×</button></form><div class="group-body"></div></dialog>
    <dialog id="mission-dialog" aria-labelledby="mission-dialog-title" aria-describedby="mission-dialog-message">
      <h2 id="mission-dialog-title">Misión completada</h2>
      <p id="mission-dialog-message"></p>
      <form method="dialog"><button class="primary" autofocus>Continuar</button></form>
    </dialog>`;

  const list = app.querySelector('#results');
  const choices = app.querySelector('.categories');
  for (const category of categories) {
    const choice = button(category, () => {
      [...choices.children].forEach(node => node.setAttribute('aria-pressed', node === choice));
      results(list, groups.filter(group => group.category === category));
    }, 'category');
    choice.setAttribute('aria-pressed', 'false');
    choices.append(choice);
  }
  let searchId = 0;
  choices.addEventListener('click', () => { searchId += 1; });
  app.querySelector('#search-form').onsubmit = async event => {
    event.preventDefault();
    const id = ++searchId;
    [...choices.children].forEach(node => node.setAttribute('aria-pressed', 'false'));
    try {
      const matches = await api('ask', Object.fromEntries(new FormData(event.target)));
      if (id === searchId) results(list, matches);
    } catch (error) {
      if (id === searchId) status(list, error.message);
    }
  };
  for (const [id, place] of Object.entries(places)) {
    const control = button(place.name, () => showPlace(id), 'place');
    control.dataset.place = id;
    app.querySelector('#place-list').append(control);
  }
  showPlace('plaza');
  try {
    map = mountMap(app.querySelector('#map-area'), showPlace);
    const tools = app.querySelector('.map-tools');
    for (const [label, action] of [
      ['Acercar', () => map.zoom(.2)], ['Alejar', () => map.zoom(-.2)],
      ['Girar', () => map.rotate(Math.PI / 6)], ['Vista superior', () => map.top()],
      ['Restablecer', () => map.reset()]
    ]) tools.append(button(label, action, 'light'));
  } catch {
    app.querySelector('#map-area').replaceChildren(el('p', 'El mapa 3D requiere WebGL. Puedes seleccionar un lugar en la lista.', 'map-error'));
  }
  renderMissions();
}

function admin() {
  app.querySelector('#main').innerHTML = `
    <div class="head"><p class="overline">ADMINISTRACIÓN · CALLE 100</p><h1>Gestión de grupos</h1></div>
    <div class="admin-grid"><section class="card admin-list"><h2>Grupos y servicios</h2><div id="groups"></div></section>
    <section class="card editor"><h2 id="editor-title">Editar información</h2><form id="editor-form"></form></section></div>`;
  const list = app.querySelector('#groups');
  function paintList() {
    list.replaceChildren(...groups.map(group => {
      const item = button(group.name, () => edit(group.id), 'result');
      item.setAttribute('aria-pressed', String(selectedGroup === group.id));
      return item;
    }));
  }
  function edit(id, message = '') {
    selectedGroup = id;
    paintList();
    const group = groups.find(item => item.id === id);
    const form = app.querySelector('#editor-form');
    app.querySelector('#editor-title').textContent = group.name;
    form.replaceChildren();
    for (const [key, title] of Object.entries(fields)) {
      const label = el('label', title);
      const input = document.createElement(key === 'description' || key === 'join' ? 'textarea' : 'input');
      input.name = key;
      input.value = group[key];
      input.required = key === 'name' || key === 'description';
      input.maxLength = 1500;
      label.append(input);
      form.append(label);
    }
    const actions = el('div', '', 'editor-actions');
    const save = el('button', 'Guardar cambios', 'primary');
    save.type = 'submit';
    const notice = el('p', message, 'notice');
    notice.setAttribute('role', 'status');
    const restore = button('Restaurar versión anterior', () => {
      if (confirm('¿Restaurar la versión anterior de este grupo?')) update(true);
    }, 'light');
    actions.append(save, restore);
    form.append(actions, notice);
    async function update(revert) {
      save.disabled = restore.disabled = true;
      try {
        const next = await api('groups/' + id + (revert ? '/restore' : ''), revert ? {} : Object.fromEntries(new FormData(form)));
        groups = groups.map(item => item.id === id ? next : item);
        if (selectedGroup === id) edit(id, revert ? 'Versión restaurada.' : 'Cambios guardados.');
        else paintList();
      } catch (error) {
        status(notice, error.message);
      } finally {
        save.disabled = restore.disabled = false;
      }
    }
    form.onsubmit = event => { event.preventDefault(); update(false); };
  }
  edit(groups[0].id);
}
let useLocal = location.protocol === 'file:';
login();
void (async () => {
  if (!useLocal) {
    try {
      const response = await fetch('/api/session');
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) useLocal = true;
    } catch {
      useLocal = true;
    }
  }
  try {
    const session = await api('session');
    if (session.role && document.activeElement === document.body) await dashboard(session);
  } catch (error) {
    const notice = app.querySelector('.notice');
    if (notice) status(notice, error.message);
  }
})();

})();
