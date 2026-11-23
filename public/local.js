globalThis.PatrocloLocal = (() => {
  const contentKey = 'patroclo-content-v1';
  const roleKey = 'patroclo-profile-v1';
  const editable = ['name', 'description', 'schedule', 'location', 'join'];
  const adminDigest = 'dac7ffd8567d8c4beccdca20bfb0cbdce2f29c1907329b8f1b25ff9e676cd73e';
  let role = sessionStorage.getItem(roleKey);
  let studentCode = sessionStorage.getItem(roleKey + '-student');
  const load = () => globalThis.PatrocloContent(JSON.parse(localStorage.getItem(contentKey)));

  async function login({ user, password }) {
    user = user.trim();
    let profile = null;
    if (/^\d+$/.test(user) && password.trim()) profile = 'student';
    if (user === 'adminUMNG') {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      const digest = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
      if (digest === adminDigest) profile = 'admin';
    }
    if (!profile) throw new Error('Revisa tus datos de acceso.');
    sessionStorage.setItem(roleKey, profile);
    role = profile;
    studentCode = role === 'student' ? user : null;
    if (studentCode) sessionStorage.setItem(roleKey + '-student', studentCode);
    else sessionStorage.removeItem(roleKey + '-student');
    return { role, studentCode };
  }

  return async (path, data) => {
    if (path === 'session') return { role, studentCode };
    if (path === 'login') return login(data);
    if (path === 'logout') {
      sessionStorage.removeItem(roleKey);
      role = null;
      studentCode = null;
      sessionStorage.removeItem(roleKey + '-student');
      return {};
    }
    if (!role) throw new Error('Inicia sesión para continuar.');
    const database = load();
    if (path === 'groups') return database.groups;
    if (path === 'ask') return globalThis.PatrocloSearch(database.groups, data.query);
    const match = path.match(/^groups\/([a-z0-9-]+)(\/restore)?$/);
    if (!match || role !== 'admin') throw new Error('Acceso restringido.');
    const [, id, restore] = match;
    const current = database.groups.find(group => group.id === id);
    if (!current) throw new Error('Grupo no encontrado.');
    const history = database.history[id] || [];
    if (restore && !history.length) throw new Error('Este grupo aún no tiene una versión anterior.');
    const next = restore ? history[0] : { ...current };
    if (!restore) {
      for (const field of editable) {
        if (typeof data[field] !== 'string' || data[field].length > 1500) throw new Error('Revisa los campos del grupo.');
        next[field] = data[field].trim();
      }
      if (!next.name || !next.description) throw new Error('Escribe el nombre y la descripción.');
    }
    database.groups = database.groups.map(group => group.id === id ? next : group);
    database.history[id] = restore ? history.slice(1) : [current, ...history].slice(0, 10);
    localStorage.setItem(contentKey, JSON.stringify(database));
    return next;
  };
})();
