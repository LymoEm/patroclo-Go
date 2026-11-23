globalThis.PatrocloMap = (() => {
const THREE = globalThis.THREE;

const basement = -9;
const origin = [297, 186];
const routes = {
  canchas: { name: 'Canchas principales', points: [[336,193],[336,245],[266,245],[266,299]], detail: 'Avanza hacia el costado sur de la plaza, gira hacia las canchas y entra por su lado norte.' },
  gimnasio: { name: 'Gimnasio Calle 100', descent: 1, points: [[301,139],[299,104,-4],[266,82,basement]], detail: 'Dirígete al edificio al norte de la plaza y baja al sótano debajo del Aula Máxima.' },
  artes: { name: 'Zona de artes', points: [[342,185],[348,222],[407,214],[423,296],[598,309],[602,247]], detail: 'Bordea el edificio central por el sur y sigue el corredor hacia la Zona de artes.' },
  musica: { name: 'Sala de música', descent: 3, points: [[349,183],[387,177],[435,175,-4],[468,181,basement],[510,175,basement],[528,157,basement]], detail: 'Cruza al Bloque C y baja al sótano para llegar a la Sala de música.' },
  audiovisuales: { name: 'Lab de audiovisuales', descent: 6, points: [[328,194],[321,223],[399,220],[396,268],[411,266],[410,319,-4],[404,356,basement],[447,357,basement]], detail: 'Sigue el corredor hacia el sur hasta el Bloque A y baja al sótano para llegar al laboratorio.' }
};
const coordinate = ([px, py, y = 0.7]) => [(px - 465) * .22, y, (py - 225) * .245];
const places = {
  plaza: { name: 'Plaza Cervantes', detail: 'Punto de partida de todos los recorridos.', point: coordinate(origin) },
  ...Object.fromEntries(Object.entries(routes).map(([id, route]) => [id, {
    ...route, point: coordinate(route.points.at(-1)), floor: route.descent ? 'Sótano' : 'Primer piso'
  }]))
};

function mountMap(host, select) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const colors = {
    water: '#a2ddff', ground: '#ffd4bd', brick: '#e18350', dark: '#a36a4c',
    brown: '#513b2e', roof: '#6e6e6e', white: '#e2f1f5', blue: '#109ad9',
    sky: '#e2f8ff', yellow: '#ffc300', gray: '#d9d9d9', navy: '#0b5da5'
  };
  const materials = Object.fromEntries(Object.entries(colors).map(([key, color]) => [
    key, new THREE.MeshBasicMaterial({ color })
  ]));
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const buildings = new THREE.Group();
  scene.add(buildings);
  function box(x, z, w, d, h, color, base = 0, sides) {
    const face = materials[color];
    const mesh = new THREE.Mesh(unit, sides ? [materials.dark, face, materials.roof, face, face, materials.dark] : face);
    mesh.position.set(x, base + h / 2, z);
    mesh.scale.set(w, h, d);
    scene.add(mesh);
    return mesh;
  }
  function building(x, z, w, d, h) {
    const first = scene.children.length;
    box(x, z, w, d, h, 'brick', 0, true);
    box(x, z, w + .7, d + .7, .8, 'roof', h);
    for (let offset = -w / 2 + 2; offset < w / 2 - 1; offset += 3) {
      box(x + offset, z + d / 2 + .12, .85, .2, .75, 'brown', h * .68);
    }
    for (let offset = -d / 2 + 1; offset < d / 2; offset += 1.6) {
      box(x, z + offset, w - 1, .12, .1, 'gray', h + .8);
    }
    buildings.add(...scene.children.slice(first));
  }

  // Aerial reference, from the avenue on the west to the pedestrian strip on the east.
  const base = box(0, 0, 154, 113, 2, 'navy', -2.6);
  const surface = box(0, 0, 151, 110, 1, 'ground', -1);
  const lower = box(0, 0, 151, 110, 1, 'sky', basement - 1.5);
  lower.visible = false;
  box(-68, 0, 8, 110, .12, 'roof');
  box(65, 0, 7, 110, .12, 'gray');
  box(-6, -48, 132, 6, .1, 'roof');
  box(-4, 48, 127, 4, .1, 'roof');
  for (let z = -49; z < 52; z += 7) box(-68, z, .22, 3.5, .15, 'white');
  box(-41, -12, 36, 23, .15, 'white');
  for (let x = -57; x < -23; x += 5) box(x, -12, .17, 22, .17, 'dark');
  building(-44, -35, 25, 22, 14);
  building(-50, -8, 13, 13, 5);
  building(5, -36, 27, 12, 17);
  building(5, -14, 27, 13, 17);
  building(5, 9, 27, 12, 17);
  building(-12, -16, 6, 52, 14);
  building(25, -22, 13, 46, 18);
  building(44, -35, 17, 20, 13);
  building(29, 13, 10, 12, 9);
  building(-7, 34, 22, 13, 9);
  building(47, -8, 8, 8, 5);
  building(56, 9, 6, 26, 6);
  for (const x of [-45, -28]) {
    box(x, 15, 15, 24, .24, 'blue');
    for (const side of [-1, 1]) {
      box(x + side * 6.8, 15, .15, 22, .28, 'white');
      box(x, 15 + side * 10.9, 13.5, .15, .28, 'white');
      box(x, 15 + side * 8, 5, .15, .28, 'white');
    }
    box(x, 15, 13.5, .15, .28, 'white');
    const circle = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.9, 24), materials.white);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(x, .29, 15);
    scene.add(circle);
  }
  box(34, 32, 49, 23, .08, 'gray');
  for (let x = 15; x <= 53; x += 9) {
    for (let z = 23; z <= 42; z += 4) box(x, z, 4.3, 1.8, .65, z % 3 ? 'white' : 'navy');
  }
  const foliage = new THREE.IcosahedronGeometry(1, 1);
  for (const [x, z] of [[-56,34],[-49,39],[-40,36],[-32,37],[-24,39],[-18,42],[-18,-39],[-19,-27],[-17,18],[34,1],[49,5],[48,16],[57,38],[57,45],[1,44],[9,44]]) {
    box(x, z, .5, .5, 2.5, 'brown');
    const crown = new THREE.Mesh(foliage, materials.navy);
    crown.scale.set(2.8, 2.7, 2.8);
    crown.position.set(x, 3.7, z);
    scene.add(crown);
  }

  const pins = Object.entries(places).map(([id, place]) => {
    const pin = document.createElement('button');
    pin.className = 'pin';
    pin.type = 'button';
    pin.textContent = place.name;
    pin.addEventListener('click', () => select(id));
    host.append(pin);
    return [pin, new THREE.Vector3(...place.point), id];
  });
  const routeLayer = new THREE.Group();
  scene.add(routeLayer);
  const routeGeometry = new THREE.CylinderGeometry(0.85, 0.85, 1, 10);
  const routeJoint = new THREE.SphereGeometry(0.93, 10, 8);
  const undergroundSurface = new THREE.MeshBasicMaterial({
    color: colors.ground, transparent: true, opacity: .30, depthWrite: false
  });
  const undergroundRoute = new THREE.MeshBasicMaterial({
    color: colors.navy, transparent: true, depthTest: false, depthWrite: false
  });
  let active = 'plaza';
  function showRoute(id) {
    active = id;
    routeLayer.clear();
    const route = routes[id];
    const underground = Boolean(route?.descent);
    base.visible = !underground;
    lower.visible = underground;
    surface.material = underground ? undergroundSurface : materials.ground;
    buildings.scale.y = route ? .018 : 1;
    if (route) {
      const points = [origin, ...route.points].map(point => new THREE.Vector3(...coordinate(point)));
      for (const [index, point] of points.entries()) {
        const material = point.y < 0 ? undergroundRoute : materials.yellow;
        const joint = new THREE.Mesh(routeJoint, material);
        joint.position.copy(point);
        joint.renderOrder = 2;
        routeLayer.add(joint);
        if (!index) continue;
        const previous = points[index - 1];
        const direction = point.clone().sub(previous);
        const segment = new THREE.Mesh(routeGeometry, material);
        segment.position.copy(previous).lerp(point, .5);
        segment.renderOrder = 2;
        segment.scale.y = direction.length();
        segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        routeLayer.add(segment);
      }
      elevation = underground ? .63 : .92;
      angle = underground ? -.24 : .17;
      zoom = 1;
    }
    render();
  }
  let angle = .17;
  let elevation = .92;
  let zoom = 1;
  let drag;
  function render() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    const aspect = width / height;
    const span = Math.max(115, 176 / aspect) / zoom;
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.near = 1;
    camera.far = 600;
    camera.position.set(210 * Math.sin(angle) * Math.cos(elevation), 210 * Math.sin(elevation), 210 * Math.cos(angle) * Math.cos(elevation));
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    for (const [pin, point, id] of pins) {
      pin.hidden = active !== 'plaza' && id !== 'plaza' && id !== active;
      const p = point.clone();
      if (active === 'plaza') p.y = id === 'plaza' ? 1 : Math.max(1, p.y);
      p.project(camera);
      pin.style.left = (p.x + 1) * width / 2 + 'px';
      pin.style.top = (1 - p.y) * height / 2 + 'px';
    }
  }
  const observer = new ResizeObserver(render);
  observer.observe(host);
  const canvas = renderer.domElement;
  canvas.onpointerdown = event => {
    drag = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => {
    if (!drag) return;
    angle -= (event.clientX - drag[0]) * .009;
    elevation = Math.max(.28, Math.min(1.56, elevation + (event.clientY - drag[1]) * .009));
    drag = [event.clientX, event.clientY];
    render();
  };
  canvas.onlostpointercapture = () => { drag = null; };

  return {
    showRoute,
    zoom(delta) { zoom = Math.max(.75, Math.min(2.4, zoom + delta)); render(); },
    rotate(delta) { angle += delta; render(); },
    top() { elevation = 1.56; angle = 0; render(); },
    reset() { elevation = .92; angle = .17; zoom = 1; render(); },
    dispose() {
      observer.disconnect();
      const geometries = new Set(scene.children.map(mesh => mesh.geometry));
      geometries.forEach(geometry => geometry.dispose());
      unit.dispose();
      routeGeometry.dispose();
      routeJoint.dispose();
      undergroundSurface.dispose();
      undergroundRoute.dispose();
      Object.values(materials).forEach(material => material.dispose());
      renderer.dispose();
    }
  };
}

return { places, mountMap };
})();
