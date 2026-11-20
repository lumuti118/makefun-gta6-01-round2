// City builder: 400x400 grid city, 9x9 roads, buildings, palms, lamps,
// park + fountain, beach + animated water, yacht, landmarks, colliders.
import { CFG, clamp } from './config.js';
import { rngRange, rngPick } from './rng.js';

function windowTexture(rng, base) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng() < 0.45;
      g.fillStyle = lit ? (rng() < 0.7 ? '#ffd98a' : '#9ad7ff') : '#20242e';
      g.fillRect(x, y, 8, 7);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function neonTexture(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0a14'; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 16; g.fillStyle = color;
  g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, rng) {
  const city = {
    colliders: [], // {x,z,hx,hz}
    buildings: [],
    water: null, fountain: null, beacon: null,
    roadXs: CFG.roads, roadZs: CFG.roads,
  };
  const addCollider = (x, z, hx, hz) => city.colliders.push({ x, z, hx, hz });

  // Ground: asphalt base, grass park block, sand beach strip, water beyond.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    new THREE.MeshLambertMaterial({ color: 0x2e3138 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(10, 0, 0); scene.add(ground);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(88, 88), new THREE.MeshLambertMaterial({ color: 0x2f7a3d }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(-67, 0.02, 67); scene.add(grass);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(30, 400), new THREE.MeshLambertMaterial({ color: 0xd9c28a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(192, 0.02, 0); scene.add(sand);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x1c6f9e, transparent: true, opacity: 0.9 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 420), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(238, 0.05, 0); scene.add(water);
  city.water = water;

  // Road markings: light strips along each road.
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x555a63 });
  for (const r of CFG.roads) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(400, 8), roadMat);
    a.rotation.x = -Math.PI / 2; a.position.set(0, 0.03, r); scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 400), roadMat);
    b.rotation.x = -Math.PI / 2; b.position.set(r, 0.03, 0); scene.add(b);
  }

  // Buildings: one or two per block between roads.
  const palette = ['#5a6b84', '#7a6a8a', '#6a7a5a', '#8a6a5a', '#4a5a6a', '#847a5a', '#5a5a7a'];
  const textures = palette.map((p) => windowTexture(rng, p));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  let bi = 0;
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 8; iz++) {
      const cx = CFG.roads[ix] + 22.5, cz = CFG.roads[iz] + 22.5;
      // park block
      if (Math.abs(cx + 67) < 5 && Math.abs(cz - 67) < 5) continue;
      // bank plaza block (keep low, landmark placed there)
      const isBank = Math.abs(cx + 22.5) < 5 && Math.abs(cz + 22.5) < 5;
      const n = isBank ? 1 : (rng() < 0.7 ? 2 : 1);
      for (let k = 0; k < n; k++) {
        const w = rngRange(rng, 12, 16), d = rngRange(rng, 12, 16), h = rngRange(rng, 12, isBank ? 22 : 58);
        const ox = k === 0 ? -8 : 8, oz = k === 0 ? -8 : 8;
        const x = cx + (n === 2 ? ox : 0), z = cz + (n === 2 ? oz : 0);
        const mat = new THREE.MeshLambertMaterial({ map: textures[bi % textures.length] });
        const m = new THREE.Mesh(boxGeo, mat);
        m.scale.set(w, h, d); m.position.set(x, h / 2, z);
        scene.add(m); city.buildings.push(m);
        addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
        // roof edge light
        const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
          new THREE.MeshBasicMaterial({ color: rngPick(rng, [0xff2e88, 0x22d3ee, 0xffc21c, 0x7c3aed]) }));
        rim.position.set(x, h + 0.2, z); scene.add(rim);
        bi++;
      }
    }
  }

  // Neon landmark signs.
  const sign = (text, color, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5),
      new THREE.MeshBasicMaterial({ map: neonTexture(text, color), transparent: true }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  };
  sign('CORAL CLUB', '#ff2e88', -112, 14, -100, 0);
  sign('HARBOR BANK', '#22d3ee', -20, 12, -8, 0);
  sign('SAFEHOUSE', '#7c3aed', -160, 8, -148, 0);
  sign('GARAGE', '#ffc21c', 112, 8, 100, 0);
  sign('THE DOCKS', '#ff7722', 150, 10, 28, 0);

  // Landmark blocks: low structures + colliders.
  const landmarkBox = (x, z, w, h, d, color) => {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    m.scale.set(w, h, d); m.position.set(x, h / 2, z); scene.add(m);
    addCollider(x, z, w / 2 + 0.5, d / 2 + 0.5);
    return m;
  };
  landmarkBox(-112, -112, 26, 10, 20, 0x8a2a5a); // Coral Club
  landmarkBox(-20, -20, 24, 14, 18, 0x2a5a7a); // Harbor Bank
  landmarkBox(-160, -160, 16, 7, 14, 0x5a3a7a); // Safehouse
  landmarkBox(112, 112, 24, 8, 18, 0x7a6a2a); // Garage
  landmarkBox(150, 40, 30, 6, 20, 0x6a4a3a); // Docks warehouse

  // Park: trees + fountain.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8a3d });
  const palm = (x, z) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6, 7.4, Math.sin(a) * 1.6);
      leaf.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      g.add(leaf);
    }
    g.position.set(x, 0, z); scene.add(g);
    return g;
  };
  for (let i = 0; i < 12; i++) palm(rngRange(rng, -100, -35), rngRange(rng, 35, 100));
  for (let i = 0; i < 10; i++) palm(rngRange(rng, 150, 185), rngRange(rng, -180, 180));
  for (let i = 0; i < 8; i++) palm(rngRange(rng, -180, 180), rngRange(rng, 150, 185));
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x9aa5b8 }));
  fountain.position.set(-67, 0.6, 67); scene.add(fountain); city.fountain = fountain;
  const fwater = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x3aa5d9 }));
  fwater.position.set(-67, 1.2, 67); scene.add(fwater);
  addCollider(-67, 67, 7, 7);

  // Street lamps along roads.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333844 });
  for (const r of CFG.roads) {
    for (let t = -180; t <= 180; t += 90) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(r + 6, 3, t); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      bulb.position.set(r + 6, 6.2, t); scene.add(bulb);
    }
  }

  // Yacht at the marina + docks pier.
  const yacht = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 5),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  hull.position.y = 1.2; yacht.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 4),
    new THREE.MeshLambertMaterial({ color: 0xdde8f2 }));
  cabin.position.set(-1, 3.4, 0); yacht.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 6), poleMat);
  mast.position.set(2, 7, 0); yacht.add(mast);
  yacht.position.set(212, 0, 60); yacht.rotation.y = Math.PI / 2; scene.add(yacht);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 24), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
  pier.position.set(200, 0.3, 60); scene.add(pier);

  // Pink mission beacon: tall beam + ring, moved by missions.js.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  beam.position.y = 30; beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xff2e88 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; beacon.add(ring);
  beacon.visible = false; scene.add(beacon);
  city.beacon = beacon;

  // Collision helper: circle vs AABB push-out.
  city.collide = (p, radius) => {
    for (const c of city.colliders) {
      const nx = clamp(p.x, c.x - c.hx, c.x + c.hx);
      const nz = clamp(p.z, c.z - c.hz, c.z + c.hz);
      const dx = p.x - nx, dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = nx + (dx / d) * radius; p.z = nz + (dz / d) * radius;
        } else {
          p.x += radius; // inside: push out along +x
        }
        return c;
      }
    }
    return null;
  };
  city.inBounds = (x, z) => x > -198 && x < 208 && z > -198 && z < 198;
  return city;
}
