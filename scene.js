import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTitle } from './title.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── THEMES ──────────────────────────────────────────────────
// Every colour in the scene and the overlay comes from here.
const THEMES = {
    night: {
        label: 'Night', icon: 'fa-moon',
        bg: '#1e1f22', floor: '#2b2d31', wall: '#313338', wallDark: '#25262b', slat: '#c2a892', grille: '#9aa0aa',
        platform: '#383a40', platformSide: '#2e3035', hole: '#0f1012', pedestal: '#41434a',
        laptop: '#7d8089', laptopDark: '#3a3c42', key: '#111214', trackpad: '#71747d', bezel: '#09090b', hingeCol: '#1b1c1f',
        mug: '#3d424b', coffee: '#2e1c10',
        desk: '#4a4c54', deskDark: '#3a3c42', book1: '#5865f2', book2: '#23a55a', book3: '#f0b232',
        lamp: '#dbdee1', lampGlow: '#ffe7b8', bulb: '#ffd98a',
        sky: ['#14152b', '#3b3f9e'],
        accent: '#5865f2', particles: '#aab4ff',
        hemiSky: '#c9cdfb', hemiGround: '#1e1f22', hemiInt: 0.9,
        keyInt: 1.9, rim: '#5865f2', rimInt: 28, fill: '#8ea1e1', fillInt: 6, exposure: 1.0,
        screen: { bg: ['#1e1f22', '#2b2d31'], accent: '#5865f2', text: '#f2f3f5', mid: '#b5bac1' },
        ui: {
            '--bg': '#1e1f22', '--surface': 'rgba(43, 45, 49, 0.82)', '--border': 'rgba(255, 255, 255, 0.08)',
            '--accent': '#5865f2', '--text': '#dbdee1', '--text-mid': '#b5bac1', '--text-dim': '#80848e',
            '--heading': '#f2f3f5', '--title-color': '#dbdee1', '--sub-color': '#b5bac1', '--title-font': "'Inter', sans-serif", '--title-weight': '800'
        }
    },
    day: {
        label: 'Day', icon: 'fa-sun',
        bg: '#e9cfbb', floor: '#e5c6ae', wall: '#ecd7c6', wallDark: '#ddbea6', slat: '#ffffff', grille: '#c8875a',
        platform: '#f2e3d6', platformSide: '#e4cab6', hole: '#5e4033', pedestal: '#f4e8de',
        laptop: '#d8996a', laptopDark: '#b6774c', key: '#b9784d', trackpad: '#d0905f', bezel: '#140e0b', hingeCol: '#8d5c3d',
        mug: '#c8743f', coffee: '#2e1c10',
        desk: '#d9b597', deskDark: '#c39b7b', book1: '#c8743f', book2: '#f3e5d8', book3: '#9c5e43',
        lamp: '#f7eee6', lampGlow: '#ffd9a8', bulb: '#fff0d0',
        sky: ['#ffe9d4', '#f2b48a'],
        accent: '#c8743f', particles: '#fff4e6',
        hemiSky: '#fff6ee', hemiGround: '#d8b39a', hemiInt: 1.15,
        keyInt: 1.6, rim: '#ffb37a', rimInt: 10, fill: '#ffe1c8', fillInt: 4, exposure: 0.9,
        screen: { bg: ['#3a2a22', '#5b3e2f'], accent: '#f0a36b', text: '#fbefe4', mid: '#e2c9b6' },
        ui: {
            '--bg': '#e9cfbb', '--surface': 'rgba(255, 248, 242, 0.72)', '--border': 'rgba(120, 80, 60, 0.14)',
            '--accent': '#c8743f', '--text': '#4a3a33', '--text-mid': '#7a6458', '--text-dim': '#a08b7e',
            '--heading': '#4a2f24', '--title-color': '#5a3424', '--sub-color': '#8a6a5a', '--title-font': "'Playfair Display', serif", '--title-weight': '900'
        }
    }
};

// remembered choice, otherwise follow the device's light/dark setting
let themeKey = null;
try { themeKey = localStorage.getItem('sy-theme'); } catch (e) { /* ignore */ }
themeKey = { discord: 'night', soft: 'day' }[themeKey] || themeKey;
if (!THEMES[themeKey]) themeKey = 'night';   // dark by default
let T = THEMES[themeKey];

// ── PROJECTS (shown on the laptop + side panel) ─────────────
const PROJECTS = [
    { name: 'Inkling', tags: 'React · Supabase · AI', year: '2026',
      desc: 'A journaling app that generates a phone wallpaper reflecting the mood of each entry.' },
    { name: 'Competition Manager', tags: 'JavaScript · AWS', year: '2021',
      desc: 'A web app for managing competition entries and results, hosted on AWS.' },
    { name: 'Reddit Clone', tags: 'JavaScript · SQL · Heroku', year: '2021',
      desc: 'A functional clone with posts, comments and SQL-backed persistence.' }
];
let activeProject = 0;

// ── RENDERER / SCENE / CAMERA ───────────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));   // sharp enough, much cheaper on retina screens
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color();
scene.fog = new THREE.Fog(0x000000, 14, 34);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 120);
const clock = new THREE.Clock();

// the name, as a sign floating in front of the stage (see title.js)
const titleSign = createTitle();
scene.add(titleSign.mesh);

// ── LIGHTS ──────────────────────────────────────────────────
const hemi = new THREE.HemisphereLight();
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xffffff, 2);
keyLight.position.set(5, 9, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
Object.assign(keyLight.shadow.camera, { left: -5.2, right: 5.2, top: 5.2, bottom: -5.2, near: 4, far: 22 });
keyLight.shadow.bias = -0.0006;
keyLight.shadow.normalBias = 0.035;
scene.add(keyLight);

const rim = new THREE.PointLight(0xffffff, 10, 16, 2);
rim.position.set(-4.5, 4, -2.5);
scene.add(rim);

const fill = new THREE.PointLight(0xffffff, 5, 14, 2);
fill.position.set(4, 2.5, 5);
scene.add(fill);

// ── MATERIALS (by role, so themes can recolour them) ────────
const M = {};
function m(role, roughness = 0.7, metalness = 0) {
    const key = `${role}|${roughness}|${metalness}`;
    if (!M[key]) M[key] = Object.assign(new THREE.MeshStandardMaterial({ roughness, metalness }), { userData: { role } });
    return M[key];
}
const basic = {};
function b(role, opts = {}) {
    const key = role + JSON.stringify(opts);
    if (!basic[key]) basic[key] = Object.assign(new THREE.MeshBasicMaterial(opts), { userData: { role } });
    return basic[key];
}

function shadowed(mesh, cast = true, receive = true) {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    return mesh;
}

const m4 = new THREE.Matrix4();

// wood grain, generated per pixel: light/dark growth bands warped by noise so they ripple
// like sawn timber, plus fine fibres running along the grain. Drawn in oak tones; each theme's
// slat colour tints it (white = natural oak, darker = walnut).
const woodTex = (() => {
    const W = 256, H = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);

    const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
    const noise = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi), b = hash(xi + 1, yi), c2 = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v;
    };
    const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.12;

    const early = [214, 172, 128];   // light springwood
    const late = [150, 100, 62];     // darker summerwood bands
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            // grain runs along y: stretch the noise vertically, then form bands across x
            const warp = fbm(x * 0.012, y * 0.0022) * 5.5 + fbm(x * 0.03 + 9, y * 0.006) * 0.8;
            const ring = (x * 0.02 + warp) % 1;
            const band = Math.pow(Math.sin(ring * Math.PI), 6);            // thin dark band per ring
            const fibre = (noise(x * 0.9, y * 0.012) - 0.5) * 0.14;          // fine streaks along the grain
            const tone = 0.94 + (fbm(x * 0.004, y * 0.0008) - 0.5) * 0.18;   // slow overall colour drift
            const k = band * 0.75;
            const i = (y * W + x) * 4;
            for (let ch = 0; ch < 3; ch++) {
                const col = (early[ch] + (late[ch] - early[ch]) * k) * (tone + fibre);
                img.data[i + ch] = Math.max(0, Math.min(255, col));
            }
            img.data[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.anisotropy = 8;
    return t;
})();
function woodMat(roughness) {
    const mat = m('slat', roughness);
    mat.map = woodTex;
    return mat;
}

// ── LAYOUT CONSTANTS ────────────────────────────────────────
const STAGE = { r: 3.7, h: 0.32 };
const TOP = STAGE.h;                        // stage surface height
const HOLE = { x: 0.5, z: 1.75, r: 0.68 }; // where the mug sinks
const LAPTOP_AT = new THREE.Vector3(-1.45, 0, -0.15);
const LAPTOP = { w: 2.1, d: 1.45, baseH: 0.055, lidH: 1.36, lidT: 0.026 };

// ── ROOM ────────────────────────────────────────────────────
// floor, with an opening below the mug hole
const floorShape = new THREE.Shape();
floorShape.moveTo(-40, -40); floorShape.lineTo(40, -40); floorShape.lineTo(40, 40); floorShape.lineTo(-40, 40);
const floorHole = new THREE.Path();
floorHole.absarc(HOLE.x, -HOLE.z, HOLE.r, 0, Math.PI * 2, true);
floorShape.holes.push(floorHole);
const floor = shadowed(new THREE.Mesh(new THREE.ShapeGeometry(floorShape, 64), m('floor', 0.95)), false);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// back wall with a round window
const WIN = { x: 2.3, y: 2.9, r: 1.18, z: -4.6 };
const wallShape = new THREE.Shape();
wallShape.moveTo(-30, 0); wallShape.lineTo(30, 0); wallShape.lineTo(30, 14); wallShape.lineTo(-30, 14);
const winHole = new THREE.Path();
winHole.absarc(WIN.x, WIN.y, WIN.r, 0, Math.PI * 2, true);
wallShape.holes.push(winHole);
const wall = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape, { depth: 0.35, bevelEnabled: false, curveSegments: 64 }), m('wall', 0.95)), false);
wall.position.z = WIN.z - 0.35;
scene.add(wall);

// window frame, sky, blinds and fairy lights
const frame = new THREE.Mesh(new THREE.TorusGeometry(WIN.r, 0.09, 16, 96), m('wallDark', 0.8));
frame.position.set(WIN.x, WIN.y, WIN.z + 0.02);
scene.add(frame);

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 16; skyCanvas.height = 256;
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;
const sky = new THREE.Mesh(new THREE.PlaneGeometry(WIN.r * 6, WIN.r * 6), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
sky.position.set(WIN.x, WIN.y, WIN.z - 0.75);
scene.add(sky);

function drawSky() {
    const g = skyCanvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, T.sky[0]);
    grad.addColorStop(1, T.sky[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 256);
    skyTex.needsUpdate = true;
}

const WALL_T = 0.35;   // wall thickness
const blinds = new THREE.Group();
const slatsN = 9;
const SLAT_W = 0.1, SLAT_D = 0.05;
const circleY = x => Math.sqrt(Math.max(WIN.r * WIN.r - x * x, 0));
for (let i = 0; i < slatsN; i++) {
    const cx = -WIN.r + (WIN.r * 2) * (i + 0.5) / slatsN;
    const x0 = cx - SLAT_W / 2, x1 = cx + SLAT_W / 2;
    const shape = new THREE.Shape();
    const steps = 8;
    shape.moveTo(x0, -circleY(x0));
    for (let k = 0; k <= steps; k++) { const x = x0 + (x1 - x0) * k / steps; shape.lineTo(x, -circleY(x)); }   // bottom edge on the circle
    for (let k = steps; k >= 0; k--) { const x = x0 + (x1 - x0) * k / steps; shape.lineTo(x, circleY(x)); }    // top edge on the circle
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAT_D, bevelEnabled: false });
    geo.translate(0, 0, -SLAT_D / 2);
    blinds.add(new THREE.Mesh(geo, m('grille', 0.32, 0.85)));
}
blinds.position.set(WIN.x, WIN.y, WIN.z - WALL_T * 0.6);
scene.add(blinds);

// three pendant bulbs hanging from the top of the opening on thin cords
const bulbs = [];
const cordMat = m('wallDark', 0.6);
[-0.42, 0, 0.42].forEach(dx => {
    const top = WIN.y + Math.sqrt(WIN.r * WIN.r - dx * dx);
    const by = WIN.y + 0.12 - Math.abs(dx) * 0.3;
    const z = WIN.z - WALL_T * 0.25;
    const cordLen = top - by - 0.1;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, cordLen + 0.05, 6), cordMat);
    cord.position.set(WIN.x + dx, by + 0.1 + cordLen / 2 + 0.02, z);
    scene.add(cord);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.07, 16), cordMat);
    socket.position.set(WIN.x + dx, by + 0.085, z);
    scene.add(socket);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 16), b('bulb', { toneMapped: false }));
    bulb.position.set(WIN.x + dx, by, z);
    scene.add(bulb);
    bulbs.push(bulb);
});
const windowLight = new THREE.PointLight(0xffffff, 4, 6, 2);
windowLight.position.set(WIN.x, WIN.y, WIN.z + 0.6);
scene.add(windowLight);

// curved slatted partition wrapping around the back-left of the stage, just outside its edge.
// Separate wooden slats with clear gaps, each standing on the floor.
const partition = new THREE.Group();
const arcR = STAGE.r + 0.45, arcFrom = Math.PI * 0.97, arcTo = Math.PI * 1.42, partN = 17;
for (let i = 0; i < partN; i++) {
    const a = arcFrom + (arcTo - arcFrom) * i / (partN - 1);
    const u = i / (partN - 1);
    const h = 2.7 + 1.1 * Math.sin(Math.PI * u);   // a gentle arch: 2.7 m at the ends, 3.8 m in the middle
    const slat = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.17, h, 0.17, 2, 0.025), woodMat(0.75)));
    slat.position.set(Math.cos(a) * arcR, h / 2, Math.sin(a) * arcR);
    slat.rotation.y = -a;
    partition.add(slat);
}
scene.add(partition);

// ── STAGE (with an opening hole for the mug) ────────────────
const RIM = 0.09;   // radius of the rounded top edge
const rimProfile = [];
for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * Math.PI / 2;   // quarter circle from the top surface down to the side
    rimProfile.push(new THREE.Vector2(STAGE.r - RIM + Math.sin(t) * RIM, TOP - RIM + Math.cos(t) * RIM));
}
rimProfile.push(new THREE.Vector2(STAGE.r, 0.03), new THREE.Vector2(STAGE.r - 0.03, 0));
rimProfile.reverse();   // bottom → top so the faces point outwards
const stageRim = shadowed(new THREE.Mesh(new THREE.LatheGeometry(rimProfile, 200), m('platform', 0.9)), false);
scene.add(stageRim);

const stageTopShape = new THREE.Shape();
stageTopShape.absarc(0, 0, STAGE.r - RIM, 0, Math.PI * 2, false);
const stageHole = new THREE.Path();
stageHole.absarc(HOLE.x, -HOLE.z, HOLE.r, 0, Math.PI * 2, true);
stageTopShape.holes.push(stageHole);
const stageTop = shadowed(new THREE.Mesh(new THREE.ShapeGeometry(stageTopShape, 160), m('platform', 0.9)), false);
stageTop.rotation.x = -Math.PI / 2;
stageTop.position.y = TOP;
scene.add(stageTop);

// accent line inlaid flush into the top surface, just inside the rim
const ring = new THREE.Mesh(new THREE.RingGeometry(STAGE.r - RIM - 0.2, STAGE.r - RIM - 0.17, 256), b('accent', { transparent: true, opacity: 0.85 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = TOP + 0.0015;
scene.add(ring);

// the hole: a dark tube going down, and an iris "cap" that opens and closes
const holeMat = m('hole', 1);
holeMat.side = THREE.DoubleSide;
const tube = new THREE.Mesh(new THREE.CylinderGeometry(HOLE.r, HOLE.r, 2.4, 64, 1, true), holeMat);
tube.position.set(HOLE.x, TOP - 1.2, HOLE.z);
scene.add(tube);
const tubeBottom = new THREE.Mesh(new THREE.CircleGeometry(HOLE.r, 48), holeMat);
tubeBottom.rotation.x = -Math.PI / 2;
tubeBottom.position.set(HOLE.x, TOP - 2.4, HOLE.z);
scene.add(tubeBottom);

const cap = shadowed(new THREE.Mesh(new THREE.RingGeometry(0.0001, HOLE.r, 64), m('platform', 0.9)), false, true);
cap.rotation.x = -Math.PI / 2;
cap.position.set(HOLE.x, TOP, HOLE.z);
scene.add(cap);
const holeRim = new THREE.Mesh(new THREE.TorusGeometry(HOLE.r, 0.022, 12, 96), m('platformSide', 0.8));
holeRim.rotation.x = Math.PI / 2;
holeRim.position.set(HOLE.x, TOP, HOLE.z);
scene.add(holeRim);
let capOpen = -1;
function setHole(open) {
    if (Math.abs(open - capOpen) < 0.002) return;
    capOpen = open;
    cap.geometry.dispose();
    cap.geometry = new THREE.RingGeometry(Math.max(HOLE.r * open, 0.0001), HOLE.r + 0.001, 64);
    cap.visible = open < 0.999;
    holeRim.scale.setScalar(Math.max(open, 0.001));
    holeRim.visible = open > 0.01;
}

// ── LAPTOP (MacBook-style) ──────────────────────────────────
// laptop stand: a plain cylinder with crisp edges, standing flush on the stage
const PED = { r: 1.12, h: 0.46 };
const pedestal = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(PED.r, PED.r, PED.h, 120), m('pedestal', 0.85)));
pedestal.position.set(LAPTOP_AT.x, TOP + PED.h / 2, LAPTOP_AT.z);
scene.add(pedestal);

const LAPTOP_Y = TOP + PED.h + 0.68;
const laptop = new THREE.Group();
laptop.position.set(LAPTOP_AT.x, LAPTOP_Y, LAPTOP_AT.z);
const LAPTOP_YAW = 0.38;
laptop.rotation.y = LAPTOP_YAW;
scene.add(laptop);

function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

// a thin slab with rounded corners and softly bevelled edges, centred, extruded along z
function slab(w, h, thick, r, bevel) {
    const depth = Math.max(thick - bevel * 2, 0.001);
    const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, r), {
        depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 20
    });
    g.translate(0, 0, -depth / 2);
    return g;
}

const bodyMat = m('laptop', 0.32, 0.55);
const topY = LAPTOP.baseH / 2;

// base
const base = shadowed(new THREE.Mesh(slab(LAPTOP.w, LAPTOP.d, LAPTOP.baseH, 0.11, 0.014), bodyMat));
base.rotation.x = -Math.PI / 2;
laptop.add(base);

// keyboard well
const KB = { w: LAPTOP.w * 0.76, d: LAPTOP.d * 0.4, z: -LAPTOP.d * 0.165 };
const well = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(KB.w + 0.035, KB.d + 0.035, 0.025), 8), m('laptopDark', 0.6));
well.rotation.x = -Math.PI / 2;
well.position.set(0, topY + 0.0008, KB.z);
laptop.add(well);

// keys in a MacBook-like layout: function row, number row, three letter rows, bottom row with a long spacebar
const ROWS = [
    { h: 0.55, u: Array(14).fill(1) },
    { h: 1, u: [...Array(13).fill(1), 1.5] },
    { h: 1, u: [1.5, ...Array(13).fill(1)] },
    { h: 1, u: [1.8, ...Array(11).fill(1), 1.8] },
    { h: 1, u: [2.3, ...Array(10).fill(1), 2.3] },
    { h: 1, u: [1, 1, 1, 1.25, 5.2, 1.25, 1, 1, 1, 1] }
];
const rowUnits = ROWS.reduce((a, r) => a + r.h, 0);
const keyCount = ROWS.reduce((a, r) => a + r.u.length, 0);
const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.18), m('key', 0.5), keyCount);
{
    const gap = 0.011;
    const unitD = KB.d / rowUnits;
    const pos = new THREE.Vector3(), scl = new THREE.Vector3(), q = new THREE.Quaternion();
    let z = KB.z - KB.d / 2, i = 0;
    for (const row of ROWS) {
        const uw = KB.w / row.u.reduce((a, b) => a + b, 0);
        let x = -KB.w / 2;
        for (const u of row.u) {
            pos.set(x + u * uw / 2, topY + 0.007, z + row.h * unitD / 2);
            scl.set(u * uw - gap, 0.012, row.h * unitD - gap);
            m4.compose(pos, q, scl);
            keys.setMatrixAt(i++, m4);
            x += u * uw;
        }
        z += row.h * unitD;
    }
}
laptop.add(keys);

// speaker grilles either side of the keyboard
const grilleTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 320;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    for (let y = 6; y < 320; y += 10) for (let x = 6; x < 64; x += 10) { g.beginPath(); g.arc(x, y, 2.4, 0, Math.PI * 2); g.fill(); }
    return new THREE.CanvasTexture(c);
})();
const grilleMat = Object.assign(new THREE.MeshBasicMaterial({ map: grilleTex, transparent: true, opacity: 0.85 }), { userData: { role: 'laptopDark' } });
basic.grille = grilleMat;
const grilleW = (LAPTOP.w - KB.w) / 2 - 0.1;
[-1, 1].forEach(side => {
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(grilleW, KB.d), grilleMat);
    grille.rotation.x = -Math.PI / 2;
    grille.position.set(side * (KB.w / 2 + 0.05 + grilleW / 2), topY + 0.0009, KB.z);
    laptop.add(grille);
});

// large trackpad
const trackpad = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(LAPTOP.w * 0.42, LAPTOP.d * 0.33, 0.035), 8), m('trackpad', 0.25, 0.4));
trackpad.rotation.x = -Math.PI / 2;
trackpad.position.set(0, topY + 0.0008, LAPTOP.d * 0.235);
laptop.add(trackpad);

// thumb notch on the front edge
const notchFront = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.018), m('laptopDark', 0.6));
notchFront.position.set(0, topY - 0.006, LAPTOP.d / 2 + 0.0015);
laptop.add(notchFront);

// hinge bar along the back edge
const hingeBar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, LAPTOP.w * 0.78, 24), m('hingeCol', 0.4, 0.3)));
hingeBar.rotation.z = Math.PI / 2;
hingeBar.position.set(0, topY, -LAPTOP.d / 2 + 0.03);
laptop.add(hingeBar);

// lid, hinged at the back edge
const hinge = new THREE.Group();
hinge.position.set(0, topY + 0.004, -LAPTOP.d / 2 + 0.03);
hinge.rotation.x = -0.24;
laptop.add(hinge);

const lid = shadowed(new THREE.Mesh(slab(LAPTOP.w, LAPTOP.lidH, LAPTOP.lidT, 0.11, 0.009), bodyMat));
lid.position.y = LAPTOP.lidH / 2;
hinge.add(lid);

// edge-to-edge black glass
const glass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(LAPTOP.w - 0.022, LAPTOP.lidH - 0.022, 0.1), 12), m('bezel', 0.15, 0.2));
glass.position.set(0, LAPTOP.lidH / 2, LAPTOP.lidT / 2 + 0.0008);
hinge.add(glass);

// display: thin bezels on the sides and top, a slightly thicker chin
const BEZ = { side: 0.045, top: 0.045, chin: 0.075 };
const SCREEN = { w: LAPTOP.w - BEZ.side * 2, h: LAPTOP.lidH - BEZ.top - BEZ.chin };
const SCREEN_Y = BEZ.chin + SCREEN.h / 2;
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 1600;
screenCanvas.height = Math.round(1600 * SCREEN.h / SCREEN.w);
const sctx = screenCanvas.getContext('2d');
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const screen = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(SCREEN.w, SCREEN.h, 0.025), 8), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
// map the shape's UVs to 0..1 so the canvas fills the screen
{
    const uv = screen.geometry.attributes.uv, p = screen.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / SCREEN.w + 0.5, p.getY(i) / SCREEN.h + 0.5);
}
screen.position.set(0, SCREEN_Y, LAPTOP.lidT / 2 + 0.0016);
hinge.add(screen);

// camera notch
const cameraNotch = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(0.2, 0.05, 0.014), 8), m('bezel', 0.15, 0.2));
cameraNotch.position.set(0, SCREEN_Y + SCREEN.h / 2 - 0.006, LAPTOP.lidT / 2 + 0.0024);
hinge.add(cameraNotch);

const screenGlow = new THREE.PointLight(0xffffff, 1.4, 2.5, 2);
screenGlow.position.set(0, 0.5, 0.35);
hinge.add(screenGlow);

function wrapText(g, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (g.measureText(test).width > maxW && line) {
            g.fillText(line, x, y);
            line = w;
            y += lineH;
        } else {
            line = test;
        }
    }
    g.fillText(line, x, y);
}

function drawScreen(t = 0) {
    const { width: W, height: H } = screenCanvas;
    const g = sctx;
    const S = T.screen;
    const p = PROJECTS[activeProject];

    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, S.bg[0]);
    grad.addColorStop(1, S.bg[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // menu bar (the notch sits over its centre)
    g.fillStyle = 'rgba(0, 0, 0, 0.28)';
    g.fillRect(0, 0, W, 50);
    g.fillStyle = S.mid;
    g.textAlign = 'left';
    g.font = '600 24px Inter, sans-serif';
    g.fillText('Portfolio', 36, 34);
    g.font = '400 24px Inter, sans-serif';
    g.fillText('Projects', 170, 34);
    g.fillText('About', 290, 34);
    g.textAlign = 'right';
    g.fillText(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), W - 36, 34);

    // window controls
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
        g.fillStyle = col;
        g.globalAlpha = 0.8;
        g.beginPath();
        g.arc(60 + i * 32, 96, 10, 0, Math.PI * 2);
        g.fill();
    });
    g.globalAlpha = 1;

    // project card
    const padX = 120;
    g.textAlign = 'left';
    g.fillStyle = S.accent;
    g.font = '700 30px Inter, sans-serif';
    g.letterSpacing = '8px';
    g.fillText(`${p.year}  ·  ${p.tags.toUpperCase()}`, padX, H * 0.36);

    g.letterSpacing = '0px';
    g.fillStyle = S.text;
    g.font = `${T.ui['--title-weight']} 120px ${T.ui['--title-font']}`;
    g.fillText(p.name, padX, H * 0.36 + 140);

    g.fillStyle = S.mid;
    g.font = '400 40px Inter, sans-serif';
    wrapText(g, p.desc, padX, H * 0.36 + 230, W - padX * 2, 58);

    screenTex.needsUpdate = true;
}

// ── MUG (sits on the stage, sinks into the hole) ────────────
const MUG_SCALE = 1.6;
const mug = new THREE.Group();
mug.position.set(HOLE.x, TOP, HOLE.z);
mug.rotation.y = -0.6;
mug.scale.setScalar(MUG_SCALE);
scene.add(mug);

// stoneware mug: straight sides with a slight taper, one smooth glaze all over,
// a chunky rounded handle, and plain coffee with a little crema
const glazeMat = m('mug', 0.45);
const clayMat = glazeMat;

const R_BOT = 0.205, R_TOP = 0.225, MUG_H = 0.46, BAND = 0.1, WALL = 0.022;
const rAt = y => R_BOT + (R_TOP - R_BOT) * (y / MUG_H);
// foot
const clayProfile = [[0, 0], [R_BOT - 0.015, 0], [R_BOT, 0.012], [rAt(BAND), BAND]].map(([x, y]) => new THREE.Vector2(x, y));
mug.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry(clayProfile, 72), clayMat)));
// body, rolled rim and the inside
const glazeProfile = [
    [rAt(BAND) + 0.002, BAND], [rAt(MUG_H - 0.015), MUG_H - 0.015], [R_TOP - 0.004, MUG_H], [R_TOP - WALL + 0.004, MUG_H],
    [R_TOP - WALL, MUG_H - 0.015], [R_BOT - WALL, 0.06], [0, 0.06]
].map(([x, y]) => new THREE.Vector2(x, y));
mug.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry(glazeProfile, 72), glazeMat)));

// chunky handle: a rounded D shape
const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(rAt(0.38) - 0.01, 0.38, 0),
    new THREE.Vector3(0.31, 0.37, 0),
    new THREE.Vector3(0.335, 0.26, 0),
    new THREE.Vector3(0.31, 0.15, 0),
    new THREE.Vector3(rAt(0.14) - 0.01, 0.14, 0)
]);
const handle = shadowed(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 40, 0.032, 14, false), glazeMat));
mug.add(handle);

// coffee: plain, with a slightly lighter crema towards the middle
const cremaTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, '#5a3720');
    grd.addColorStop(0.7, '#3a2414');
    grd.addColorStop(1, '#24150b');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
})();
const coffee = new THREE.Mesh(new THREE.CircleGeometry(R_TOP - WALL + 0.002, 64), new THREE.MeshStandardMaterial({ map: cremaTex, roughness: 0.3 }));
coffee.rotation.x = -Math.PI / 2;
coffee.position.y = MUG_H - 0.05;
mug.add(coffee);

const softSprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,0.6)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
})();
const steam = [];
const STEAM_N = 8, STEAM_R = 0.17;   // wisps, and the radius of the coffee surface they rise from
function newSteamSpot(s) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * STEAM_R;   // even spread over the disc
    s.userData.x = Math.cos(a) * r;
    s.userData.z = Math.sin(a) * r;
    s.userData.sway = Math.random() * 6.28;
}
for (let i = 0; i < STEAM_N; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData.offset = i / STEAM_N + Math.random() * 0.05;
    s.userData.life = 0;
    newSteamSpot(s);
    mug.add(s);
    steam.push(s);
}

// ── STUDY DESK ──────────────────────────────────────────────
const DESK = { w: 2.5, d: 1.05, h: 1.35, t: 0.07 };
const desk = new THREE.Group();
desk.position.set(1.75, TOP, -1.75);
desk.rotation.y = Math.atan2(-desk.position.x, -desk.position.z);   // front faces the middle of the stage
scene.add(desk);

const deskTop = shadowed(new THREE.Mesh(new RoundedBoxGeometry(DESK.w, DESK.t, DESK.d, 3, 0.02), m('desk', 0.6)));
deskTop.position.y = DESK.h;
desk.add(deskTop);

// drawer unit on the right, two legs on the left, modesty panel at the back
const drawerUnit = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.7, DESK.h - DESK.t / 2, DESK.d * 0.92, 3, 0.02), m('deskDark', 0.65)));
drawerUnit.position.set(DESK.w / 2 - 0.4, (DESK.h - DESK.t / 2) / 2, 0);
desk.add(drawerUnit);
for (let i = 0; i < 3; i++) {
    const front = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.34, 0.02, 2, 0.01), m('desk', 0.6));
    front.position.set(DESK.w / 2 - 0.4, 0.25 + i * 0.4, DESK.d * 0.46 + 0.012);
    desk.add(front);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.025), m('laptopDark', 0.4, 0.5));
    knob.position.set(DESK.w / 2 - 0.4, 0.3 + i * 0.4, DESK.d * 0.46 + 0.035);
    desk.add(knob);
}
[[-DESK.w / 2 + 0.07, DESK.d / 2 - 0.07], [-DESK.w / 2 + 0.07, -DESK.d / 2 + 0.07]].forEach(([x, z]) => {
    const leg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.08, DESK.h, 0.08), m('deskDark', 0.65)));
    leg.position.set(x, DESK.h / 2, z);
    desk.add(leg);
});
const backPanel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(DESK.w - 0.8, 0.45, 0.03), m('deskDark', 0.65)));
backPanel.position.set(-0.4, DESK.h - 0.3, -DESK.d / 2 + 0.06);
desk.add(backPanel);

const onDesk = DESK.h + DESK.t / 2;

// books
[['book1', 0.09, 0.62], ['book2', 0.07, 0.58], ['book3', 0.08, 0.66]].forEach(([role, h, w], i) => {
    const book = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.45, 2, 0.01), m(role, 0.7)));
    book.position.set(-0.75, onDesk + h / 2 + i * 0.085, -0.1);
    book.rotation.y = (i - 1) * 0.12;
    desk.add(book);
});

// pencil cup
const pencilCupMat = m('laptopDark', 0.5);
const pencilCup = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 24), pencilCupMat));
pencilCup.position.set(-0.2, onDesk + 0.12, -0.25);
desk.add(pencilCup);
const CUP = { x: -0.2, z: -0.25, r: 0.08 };
const PENCIL_LEN = 0.36;
[[0.035, 0.0, 0.18, 0.05], [-0.03, 0.02, -0.14, 0.1], [0.0, -0.03, 0.05, -0.16]].forEach(([bx, bz, lx, lz], i) => {
    const base = new THREE.Vector3(CUP.x + bx, onDesk + 0.03, CUP.z + bz);           // inside the cup, near the bottom
    const dir = new THREE.Vector3(lx, 1, lz).normalize();                             // lean
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, PENCIL_LEN, 6), m(['book3', 'book1', 'book2'][i], 0.6));
    pencil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    pencil.position.copy(base).addScaledVector(dir, PENCIL_LEN / 2);
    desk.add(pencil);
});

// desk lamp
const lamp = new THREE.Group();
lamp.position.set(0.55, onDesk, -0.25);
desk.add(lamp);
const lampBase = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 32), m('lamp', 0.5)));
lampBase.position.y = 0.02;
lamp.add(lampBase);
const arm1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 12), m('lamp', 0.5)));
arm1.position.set(-0.08, 0.35, 0);
arm1.rotation.z = 0.25;
lamp.add(arm1);
const arm2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 12), m('lamp', 0.5)));
arm2.position.set(-0.05, 0.78, 0);
arm2.rotation.z = -1.1;
lamp.add(arm2);
const shadeMat = m('lamp', 0.5).clone();
shadeMat.side = THREE.DoubleSide;
shadeMat.userData = { role: 'lamp' };
M['lampShade'] = shadeMat;
const shade = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 32, 1, true), shadeMat));
shade.position.set(0.22, 0.86, 0);
shade.rotation.z = 0.9;
lamp.add(shade);
const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), b('lampGlow', { toneMapped: false }));
lampBulb.position.set(0.27, 0.8, 0);
lamp.add(lampBulb);
const lampLight = new THREE.PointLight(0xffffff, 3, 3, 2);
lampLight.position.set(0.3, 0.7, 0);
lamp.add(lampLight);

// small plant
const pot = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 24), m('book2', 0.8)));
pot.position.set(1.0, onDesk + 0.1, 0.2);
desk.add(pot);
const leafMat = new THREE.MeshStandardMaterial({ color: 0x6f9a6b, roughness: 0.8 });
for (let i = 0; i < 6; i++) {
    const leaf = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), leafMat));
    leaf.scale.set(0.6, 1.4, 0.6);
    const a = i / 6 * Math.PI * 2;
    leaf.position.set(1.0 + Math.cos(a) * 0.06, onDesk + 0.3 + (i % 2) * 0.06, 0.2 + Math.sin(a) * 0.06);
    leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    desk.add(leaf);
}

// ── FLOATING PARTICLES ──────────────────────────────────────
const P = 240;
const pPos = new Float32Array(P * 3);
const pSpeed = new Float32Array(P);
for (let i = 0; i < P; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 14;
    pPos[i * 3 + 1] = Math.random() * 7;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 9;
    pSpeed[i] = 0.05 + Math.random() * 0.12;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.05, map: softSprite, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
}));
scene.add(particles);

// ── APPLY THEME ─────────────────────────────────────────────
let fontsReady = false;
const _ca = new THREE.Color(), _cb = new THREE.Color();
function mixInto(color, a, b, k) {
    color.copy(_ca.set(a)).lerp(_cb.set(b), k);
}
const lerp = (a, b, k) => a + (b - a) * k;

// blend every scene colour and light from theme A to theme B (k = 0..1)
function applyColors(A, B, k) {
    mixInto(scene.background, A.bg, B.bg, k);
    scene.fog.color.copy(scene.background);
    renderer.toneMappingExposure = lerp(A.exposure, B.exposure, k);

    Object.values(M).forEach(mat => mixInto(mat.color, A[mat.userData.role], B[mat.userData.role], k));
    Object.values(basic).forEach(mat => mixInto(mat.color, A[mat.userData.role], B[mat.userData.role], k));
    mixInto(particles.material.color, A.particles, B.particles, k);

    mixInto(hemi.color, A.hemiSky, B.hemiSky, k);
    mixInto(hemi.groundColor, A.hemiGround, B.hemiGround, k);
    hemi.intensity = lerp(A.hemiInt, B.hemiInt, k);
    keyLight.intensity = lerp(A.keyInt, B.keyInt, k);
    mixInto(rim.color, A.rim, B.rim, k);
    rim.intensity = lerp(A.rimInt, B.rimInt, k);
    mixInto(fill.color, A.fill, B.fill, k);
    fill.intensity = lerp(A.fillInt, B.fillInt, k);
    mixInto(screenGlow.color, A.screen.accent, B.screen.accent, k);
    mixInto(windowLight.color, A.bulb, B.bulb, k);
    mixInto(lampLight.color, A.lampGlow, B.lampGlow, k);
}

function applyUI() {
    const root = document.documentElement;
    Object.entries(T.ui).forEach(([k, v]) => root.style.setProperty(k, v));
    const toggle = document.getElementById('theme-btn');
    toggle.setAttribute('aria-checked', String(themeKey === 'night'));
    toggle.setAttribute('aria-label', themeKey === 'night' ? 'Night mode' : 'Day mode');
    drawSky();
    drawScreen(clock.elapsedTime);
    if (fontsReady) titleSign.draw();   // redraw the name in the new colours
}

function applyTheme() {
    applyColors(T, T, 1);
    applyUI();
}

let fade = null;   // { from, start } while a day/night switch is animating

// ── SCROLL → CAMERA ─────────────────────────────────────────
// The scroll path. Each section sits at a whole number along it:
// 0 room, 1-3 one stop per project (laptop), 4 about me (window), 5 education (books),
// 6 skills (lamp), 7 experience (drawers)
const PROJECT_FIRST = 1;
const PROJECT_LAST = PROJECT_FIRST + PROJECTS.length - 1;
const ABOUT_STOP = PROJECT_LAST + 1;
const LAST_STOP = ABOUT_STOP + 3;
let progress = 0;
let targetProgress = 0;
const clamp01 = v => Math.min(1, Math.max(0, v));
const clampP = v => Math.min(LAST_STOP, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ── SCROLL INPUT ────────────────────────────────────────────
// Fluid: the wheel moves along the path and stops wherever the visitor stops.
// The only exception: scrolling with the cursor over a long panel scrolls that panel's text.
const WHEEL_SPEED = 0.0011;
const TOUCH_SPEED = 0.004;
const MAX_SPEED = 0.85;      // fastest the camera moves along the path, in sections per second
const MAX_LEAD = 0.25;       // scrolling can only queue up this far ahead of the camera
const NAV_SPEED = 3;         // nav links and arrow keys glide faster
let navigating = false;

// scrolling adds to the target, but never more than MAX_LEAD beyond the camera
function scrollBy(delta) {
    navigating = false;
    const lo = Math.max(0, progress - MAX_LEAD), hi = Math.min(LAST_STOP, progress + MAX_LEAD);
    targetProgress = Math.min(hi, Math.max(lo, targetProgress + delta));
}
function goTo(stop) {
    navigating = true;
    targetProgress = clampP(stop);
}

// with the cursor (or finger) over an info card, scrolling belongs to the card, never the scene
function overInfoCard(target) {
    return target instanceof Element && !!target.closest('.info-panel.show');
}

window.addEventListener('wheel', e => {
    if (overInfoCard(e.target)) return;
    // pixel-mode trackpads and line-mode mice report different units; normalise to pixels,
    // then cap each event so a hard flick counts the same as a normal scroll
    const raw = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    const dy = Math.sign(raw) * Math.min(Math.abs(raw), 60);
    scrollBy(dy * WHEEL_SPEED);
}, { passive: true });

let touchY = null;
window.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', e => {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    if (!overInfoCard(e.target)) scrollBy(Math.sign(touchY - y) * Math.min(Math.abs(touchY - y), 24) * TOUCH_SPEED);
    touchY = y;
}, { passive: true });
window.addEventListener('touchend', () => { touchY = null; });

// arrow / page keys jump to the next or previous section
window.addEventListener('keydown', e => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) goTo(Math.floor(targetProgress + 0.001) + 1);
    if (['ArrowUp', 'PageUp'].includes(e.key)) goTo(Math.ceil(targetProgress - 0.001) - 1);
});

document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    goTo(Number(a.dataset.go));
}));

const mouse = new THREE.Vector2();
window.addEventListener('pointermove', e => {
    mouse.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
});

// opening shot (pulls back on narrow screens) and closing shot (laptop on the left)
let START, END, STOPS;
function computeViews() {
    const back = THREE.MathUtils.clamp(1.65 / camera.aspect, 1, 3.2);
    const dist = 8.2 * back * (camera.aspect > 1 ? 1.14 : 1);   // a little further back on wide screens to fit the name
    scene.fog.near = dist + 4;
    scene.fog.far = dist + 22;
    START = {
        pos: new THREE.Vector3(0, 2.7 + (back - 1) * 0.6, dist),
        target: new THREE.Vector3(0, 1.45, -0.6)
    };

    laptop.position.set(LAPTOP_AT.x, LAPTOP_Y, LAPTOP_AT.z);   // rest pose for framing
    laptop.rotation.set(0, LAPTOP_YAW, 0);
    laptop.updateMatrixWorld(true);
    const center = new THREE.Vector3();
    const q = new THREE.Quaternion();
    screen.getWorldPosition(center);
    screen.getWorldQuaternion(q);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const mid = center.clone().addScaledVector(up, -LAPTOP.lidH * 0.28);   // middle of the whole laptop

    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let d, look;
    if (camera.aspect >= 1) {
        d = Math.max(LAPTOP.w / (0.62 * tanH * camera.aspect), LAPTOP.lidH * 1.9 / (2 * tanH));
        const visW = 2 * d * tanH * camera.aspect;
        look = mid.clone().addScaledVector(right, visW * 0.21).addScaledVector(up, -0.15);
    } else {
        d = LAPTOP.w / (1.25 * tanH * camera.aspect);
        const visH = 2 * d * tanH;
        look = mid.clone().addScaledVector(up, -visH * 0.13);
    }
    END = { pos: look.clone().addScaledVector(normal, d), target: look };

    desk.updateMatrixWorld(true);
    const onDeskAt = (x, y, z) => desk.localToWorld(new THREE.Vector3(x, y, z));
    // the camera drifts a little around the laptop from one project to the next
    const projectViews = PROJECTS.map((_, i) => {
        const yaw = (i - (PROJECTS.length - 1) / 2) * 0.09;
        const pivot = END.target.clone().addScaledVector(normal, 0);
        const offset = END.pos.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        return { pos: pivot.clone().add(offset).add(new THREE.Vector3(0, i * 0.05, 0)), target: END.target.clone() };
    });
    STOPS = [
        START,
        ...projectViews,
        viewAt(new THREE.Vector3(WIN.x, WIN.y - 0.1, WIN.z), new THREE.Vector3(-0.35, 0.05, 1), 4.6, -1),   // about: window
        viewAt(onDeskAt(-0.75, onDesk + 0.12, -0.1), new THREE.Vector3(0.25, 0.55, 1), 2.4, 1),             // education: books
        viewAt(onDeskAt(0.4, onDesk + 0.45, -0.25), new THREE.Vector3(-0.3, 0.35, 1), 2.7, -1),             // skills: lamp
        viewAt(onDeskAt(DESK.w / 2 - 0.4, 0.75, DESK.d / 2), new THREE.Vector3(0.45, 0.25, 1), 3.1, 1)      // experience: drawers
    ];
}

// Frame `focus` from direction `dir`. side = 1 puts the object on the left (panel on the right),
// side = -1 puts it on the right (panel on the left). On portrait screens the object sits above the panel.
function viewAt(focus, dir, dist, side) {
    const back = dir.clone().normalize();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, back).normalize();
    const look = focus.clone();
    if (camera.aspect >= 1) {
        const visW = 2 * dist * tanH * camera.aspect;
        look.addScaledVector(right, side * visW * 0.21);
    } else {
        dist *= THREE.MathUtils.clamp(1.1 / camera.aspect, 1, 2.2);
        look.addScaledVector(up, -2 * dist * tanH * 0.2);
    }
    return { pos: look.clone().addScaledVector(back, dist), target: look };
}

// ── UI ──────────────────────────────────────────────────────
const panels = [...document.querySelectorAll('.panel[data-stop]')];
const navItems = [...document.querySelectorAll('.nav-item[data-go]')];
let lastNavStop = -1;
const list = document.getElementById('project-list');
const toast = document.getElementById('toast');
let toastTimer;

PROJECTS.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button"><span class="p-name">${p.name}</span><span class="p-tags">${p.tags}</span></button>`;
    li.querySelector('button').addEventListener('click', () => {
        goTo(PROJECT_FIRST + i);
    });
    list.appendChild(li);
});
function renderList() {
    list.querySelectorAll('button').forEach((btn, i) => btn.classList.toggle('active', i === activeProject));
}
renderList();

document.getElementById('resume-btn').addEventListener('click', () => {
    toast.textContent = 'My CV is still being finalised. Check back soon!';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
});

document.getElementById('theme-btn').addEventListener('click', () => {
    const from = T;
    themeKey = themeKey === 'night' ? 'day' : 'night';
    T = THEMES[themeKey];
    try { localStorage.setItem('sy-theme', themeKey); } catch (e) { /* ignore */ }
    applyUI();
    if (reducedMotion) applyColors(T, T, 1);
    else fade = { from, start: clock.elapsedTime };
});

// ── TITLE SIGN PLACEMENT ────────────────────────────────────
// The opening shot is pushed down a little (titleSpace) so the name has clear space above the room.
// The sign is then placed in 3D so that, from the opening camera, it appears centred near the top of
// the screen at its design size, part-way between the camera and the stage.
let titleSpace = 0;
let lastShift = -1;
const titleBase = new THREE.Vector3();
const titleBaseQuat = new THREE.Quaternion();
const titleLocal = new THREE.Vector3();
const _attached = new THREE.Vector3();
const _tCam = new THREE.PerspectiveCamera();
function placeTitle() {
    if (!START) return;
    const { cssW, cssH, pad } = titleSign.size;
    const extra = pad - 34;                      // padding beyond the original layout
    const w = window.innerWidth, h = window.innerHeight;
    titleSpace = (cssH - extra * 2) * (h > w ? 0.55 : 0.62);
    lastShift = -1;

    _tCam.fov = camera.fov; _tCam.aspect = camera.aspect; _tCam.near = camera.near; _tCam.far = camera.far;
    _tCam.position.copy(START.pos);
    _tCam.lookAt(START.target);
    _tCam.setViewOffset(w, h, 0, -titleSpace, w, h);
    _tCam.updateProjectionMatrix();
    _tCam.updateMatrixWorld();

    const topPx = THREE.MathUtils.clamp(0.08 * h, 60, 88);
    const D = START.pos.distanceTo(START.target) * 0.45;            // how far in front of the camera
    const ray = new THREE.Vector3(0, -((topPx - extra + cssH / 2) / h) * 2 + 1, 0.5).unproject(_tCam).sub(_tCam.position).normalize();
    const fwd = new THREE.Vector3();
    _tCam.getWorldDirection(fwd);
    titleSign.mesh.position.copy(_tCam.position).addScaledVector(ray, D / ray.dot(fwd));
    titleBase.copy(titleSign.mesh.position);
    titleBaseQuat.copy(titleSign.mesh.quaternion);
    titleLocal.copy(titleBase).applyMatrix4(_tCam.matrixWorldInverse);   // where it sits relative to the camera
    titleSign.mesh.quaternion.copy(_tCam.quaternion);
    const worldPerPx = 2 * D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / h;
    titleSign.mesh.scale.set(cssW * worldPerPx, cssH * worldPerPx, 1);
}

// ── LOOP ────────────────────────────────────────────────────
let lastScreenDraw = -1;
const tilt = new THREE.Vector2();   // eased cursor position the laptop leans towards
const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    {
        // move smoothly towards the target, never faster than the speed limit
        const limit = (navigating ? NAV_SPEED : MAX_SPEED) * dt;
        const step = (targetProgress - progress) * (1 - Math.exp(-dt * 5));
        progress += Math.max(-limit, Math.min(limit, step));
        if (Math.abs(targetProgress - progress) < 0.0005) { progress = targetProgress; navigating = false; }
    }

    if (fade) {
        const k = smooth(0, 1, (t - fade.start) / 0.9);
        applyColors(fade.from, T, k);
        if (k >= 1) fade = null;
    }
    const camP = ease(smooth(0.12, 1, progress));

    // laptop keeps floating, a little calmer when we're close
    if (!reducedMotion) {
        const amp = 1 - camP * 0.5;
        const k = 1 - Math.exp(-dt * 4);   // eased follow
        tilt.x += (mouse.x - tilt.x) * k;
        tilt.y += (mouse.y - tilt.y) * k;
        laptop.position.x = LAPTOP_AT.x + tilt.x * 0.18;
        laptop.position.y = LAPTOP_Y + Math.sin(t * 1.1) * 0.05 * amp - tilt.y * 0.1;
        const faceYaw = Math.atan2(camera.position.x - laptop.position.x, camera.position.z - laptop.position.z);
        let turn = faceYaw - LAPTOP_YAW;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));                     // shortest way round
        const face = camP * (1 - smooth(PROJECT_LAST, PROJECT_LAST + 0.8, progress));
        laptop.rotation.y = LAPTOP_YAW + turn * face + tilt.x * 0.45 * (1 - 0.5 * face);  // face the camera, lean to the cursor
        laptop.rotation.x = tilt.y * 0.3;                                     // tip forward/back with it
        laptop.rotation.z = Math.sin(t * 0.8) * 0.012 * amp - tilt.x * 0.08;  // slight bank
    }

    // mug: hole opens, mug sinks, hole closes again
    const open = smooth(0.0, 0.14, progress);
    const sink = smooth(0.08, 0.34, progress);
    setHole(open);
    mug.position.y = TOP - sink * 0.95 * MUG_SCALE;
    mug.visible = sink < 0.999;

    steam.forEach(s => {
        const life = (t * 0.16 + s.userData.offset) % 1;
        if (life < s.userData.life) newSteamSpot(s);                 // starting a new rise: pick a new spot
        s.userData.life = life;
        const drift = Math.sin(life * 4 + s.userData.sway) * 0.025;
        s.position.set(s.userData.x + drift, 0.42 + life * 0.45, s.userData.z);
        s.scale.set(0.05 + life * 0.1, 0.09 + life * 0.17, 1);      // thin and tall, widening a little as it rises
        s.material.opacity = Math.sin(life * Math.PI) * 0.16 * (1 - sink);
    });


    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < P; i++) {
        arr[i * 3 + 1] += pSpeed[i] * dt * (reducedMotion ? 0 : 1);
        if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = 0;
    }
    pGeo.attributes.position.needsUpdate = true;

    // shift the opening shot down so the name sits in clear space above the room
    const shift = titleSpace * (1 - camP);
    if (Math.abs(shift - lastShift) > 0.5) {
        if (shift > 0.5) camera.setViewOffset(window.innerWidth, window.innerHeight, 0, -shift, window.innerWidth, window.innerHeight);
        else camera.clearViewOffset();
        lastShift = shift;
    }

    // camera: room → laptop uses the intro timing, later stops glide between each other
    if (progress <= 1) {
        _pos.lerpVectors(START.pos, STOPS[1].pos, camP);
        _look.lerpVectors(START.target, STOPS[1].target, camP);
    } else {
        const seg = Math.min(Math.floor(progress), LAST_STOP - 1);
        const k = ease(clamp01(progress - seg));
        _pos.lerpVectors(STOPS[seg].pos, STOPS[seg + 1].pos, k);
        _look.lerpVectors(STOPS[seg].target, STOPS[seg + 1].target, k);
    }
    const par = 1 - camP * 0.7;
    const px = mouse.x * 0.45 * par, py = -mouse.y * 0.25 * par;
    _pos.x += px;
    _pos.y += py;
    camera.position.copy(_pos);
    camera.lookAt(_look);
    camera.updateMatrixWorld();

    // the name: fixed to the camera on the landing view (drifting only slightly with the mouse),
    // handing over to its place in the room as you scroll in so the camera flies past it
    const attach = 1 - smooth(0.0, 0.3, camP);
    _attached.set(titleLocal.x + mouse.x * 0.06, titleLocal.y - mouse.y * 0.04, titleLocal.z).applyMatrix4(camera.matrixWorld);
    titleSign.mesh.position.lerpVectors(titleBase, _attached, attach);
    titleSign.mesh.quaternion.slerpQuaternions(titleBaseQuat, camera.quaternion, attach);

    // overlay: each panel shows while we're within its section of the path
    titleSign.mesh.visible = progress < 1.5;
    titleSign.update(dt, camera);
    const nearest = Math.round(progress);
    panels.forEach(p => {
        const from = Number(p.dataset.stop), to = Number(p.dataset.stopEnd || p.dataset.stop);
        const outside = progress < from ? from - progress : progress > to ? progress - to : 0;
        const show = outside <= 0.5 && progress >= 0.5;   // the nearest section's panel is always up
        if (show && !p.classList.contains('show')) { const body = p.querySelector('.panel-body'); if (body) body.scrollTop = 0; }
        p.classList.toggle('show', show);
        p.setAttribute('aria-hidden', String(!show));
    });

    // laptop screen follows the project we're nearest to
    const proj = THREE.MathUtils.clamp(nearest - PROJECT_FIRST, 0, PROJECTS.length - 1);
    if (proj !== activeProject) {
        activeProject = proj;
        renderList();
        drawScreen(t);
    }

    // highlighted nav item
    if (nearest !== lastNavStop) {
        lastNavStop = nearest;
        navItems.forEach(a => {
            const from = Number(a.dataset.go), to = Number(a.dataset.goEnd || a.dataset.go);
            a.classList.toggle('active', nearest >= from && nearest <= to);
        });
    }

    // only re-upload the screen texture when the clock's minute changes
    const minute = new Date().getMinutes();
    if (minute !== lastScreenDraw) {
        drawScreen(t);
        lastScreenDraw = minute;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

// ── RESIZE ──────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeViews();
    if (fontsReady) { titleSign.draw(); placeTitle(); }
});

// ── BROWSER TAB ICON ────────────────────────────────────────
// "SY" in Fraunces on a dark rounded square, like the nav logo
function drawFavicon() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#1e1f22';
    g.beginPath();
    g.roundRect(0, 0, 64, 64, 16);
    g.fill();
    g.fillStyle = '#f2f3f5';
    g.font = '900 32px "Fraunces", serif';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = '-2px';
    g.fillText('SY', 32, 44);
    const link = document.querySelector('link[rel="icon"]');
    if (link) { link.type = 'image/png'; link.href = c.toDataURL('image/png'); }
}

// ── START ───────────────────────────────────────────────────
const loaderFill = document.getElementById('loader-fill');
loaderFill.style.width = '60%';
computeViews();
applyTheme();
Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    document.fonts ? document.fonts.load('900 100px "Fraunces"') : null,
    document.fonts ? document.fonts.load('300 34px "Fraunces"') : null
]).catch(() => {}).then(() => {
    fontsReady = true;
    drawFavicon();
    titleSign.draw();
    placeTitle();
    drawScreen(0);
    loaderFill.style.width = '100%';
    requestAnimationFrame(tick);
    setTimeout(() => document.getElementById('loader').classList.add('done'), 350);
});
