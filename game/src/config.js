// Palmera Bay — shared constants: city layout, districts, vehicles, missions.
export const CFG = {
  citySize: 400,
  half: 200,
  roadGap: 45,
  roadWidth: 10,
  roads: [-180, -135, -90, -45, 0, 45, 90, 135, 180],
  debt: 10000,
  startMoney: 150,
  startHealth: 100,
  pistolMag: 12,
  pistolReserve: 48,
  districts: [
    { name: 'Downtown', x0: -200, z0: -200, x1: 0, z1: -20, color: '#3a6ea5' },
    { name: 'Old Town', x0: -200, z0: -20, x1: 0, z1: 200, color: '#a58a3a' },
    { name: 'Palm Heights', x0: 0, z0: -200, x1: 185, z1: -20, color: '#3aa56a' },
    { name: 'The Docks', x0: 0, z0: -20, x1: 185, z1: 110, color: '#a55a3a' },
    { name: 'Beachfront', x0: 0, z0: 110, x1: 185, z1: 200, color: '#3aa5a5' },
    { name: 'Marina', x0: 185, z0: -200, x1: 200, z1: 200, color: '#4a7aa5' },
  ],
  vehicles: [
    { id: 'sedan', name: 'Vesper Sedan', color: 0x8fa3b8, top: 27, accel: 15, grip: 2.4, len: 4.4 },
    { id: 'sunset', name: 'Sunset GT', color: 0xff5a3c, top: 38, accel: 21, grip: 2.9, len: 4.6 },
    { id: 'taxi', name: 'Bay Cab', color: 0xffc21c, top: 25, accel: 13, grip: 2.3, len: 4.4 },
    { id: 'van', name: 'Cargo Van', color: 0x9aa0a8, top: 21, accel: 10, grip: 1.9, len: 5.2 },
    { id: 'pickup', name: 'Dune Pickup', color: 0x3c8a5a, top: 29, accel: 16, grip: 2.5, len: 4.8 },
    { id: 'police', name: 'Bay PD Interceptor', color: 0x1c2a44, top: 36, accel: 20, grip: 3.0, len: 4.6 },
  ],
  // Six story missions for Mara Voss. target: {x,z,label}
  missions: [
    { id: 1, name: 'First Errand', reward: 300, kind: 'goto',
      brief: 'Mara Voss needs you at the Coral Club. Drive there and check in.',
      target: { x: -112, z: -112, label: 'Coral Club' } },
    { id: 2, name: 'Borrowed Sunset', reward: 900, kind: 'steal',
      brief: 'Steal the Sunset GT parked by the marina and deliver it to the garage.',
      target: { x: 165, z: -135, label: 'Sunset GT' },
      deliver: { x: 112, z: 112, label: 'Garage' } },
    { id: 3, name: 'Three Drops', reward: 1200, kind: 'drops',
      brief: 'Make three cash drops across town. Follow the pink beacon.',
      drops: [ { x: -160, z: 60, label: 'Drop 1' }, { x: 60, z: -160, label: 'Drop 2' }, { x: 160, z: 160, label: 'Drop 3' } ] },
    { id: 4, name: 'Dockside Heat', reward: 1500, kind: 'shootout',
      brief: 'The Harbor Kings are waiting at the docks. Clear them out.',
      target: { x: 150, z: 40, label: 'The Docks' } },
    { id: 5, name: 'Cooling Off', reward: 800, kind: 'evade',
      brief: 'Bay PD is all over you. Lose the 3-star heat, then lay low at the safehouse.',
      target: { x: -160, z: -160, label: 'Safehouse' } },
    { id: 6, name: 'The Big Score', reward: 5200, kind: 'heist',
      brief: 'Hit the Harbor Bank van, grab the cash, and get to the yacht. Then the debt is paid.',
      target: { x: -20, z: -20, label: 'Harbor Bank' },
      deliver: { x: 205, z: 60, label: 'Yacht' } },
  ],
  landmarks: {
    club: { x: -112, z: -112, label: 'Coral Club' },
    bank: { x: -20, z: -20, label: 'Harbor Bank' },
    safehouse: { x: -160, z: -160, label: 'Safehouse' },
    garage: { x: 112, z: 112, label: 'Garage' },
    docks: { x: 150, z: 40, label: 'The Docks' },
    yacht: { x: 208, z: 60, label: 'Yacht' },
  },
};

export function districtAt(x, z) {
  for (const d of CFG.districts) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return CFG.districts[0];
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
