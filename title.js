import * as THREE from 'three';

// The name, as an object in the 3D scene (a flat "LCD sign" floating in front of the stage).
// It sits closer to the camera than the room, so it shifts with the mouse parallax and the camera
// flies past it when zooming into the laptop.
// - always: a fixed grid of tiny LCD bulbs, and an occasional gentle glitch of the whole sign
// - hover: the letters around the cursor bulge and ripple like they're under a lens, and glow

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NAME_1 = 'Sheng';
const NAME_2 = 'Yiping';
const SUB = ['ICT', 'Undergraduate'];
const NAME_FONT = (px) => `900 ${px}px "Fraunces", serif`;
const SUB_FONT = (px) => `300 ${px}px "Fraunces", serif`;
const PAD = 72;        // css px of room around the text, so the glow and distortion are never cut off
const BULB_PX = 2.5;   // LCD bulb size, in css px, when the sign is at its starting distance

export function createTitle() {
    const textCanvas = document.createElement('canvas');
    const tctx = textCanvas.getContext('2d');
    const tex = new THREE.CanvasTexture(textCanvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            tMap: { value: tex },
            uMouse: { value: new THREE.Vector2(-2, -2) },
            uHover: { value: 0 },
            uTime: { value: 0 },
            uMotion: { value: reducedMotion ? 0 : 1 },
            uAspect: { value: 1 },
            uCells: { value: new THREE.Vector2(100, 30) },
            uRows: { value: 100 },
            uGlow: { value: new THREE.Color('#ffffff') }
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform sampler2D tMap;
            uniform vec2 uMouse;
            uniform float uHover;
            uniform float uTime;
            uniform float uMotion;
            uniform float uAspect;
            uniform vec2 uCells;
            uniform float uRows;
            uniform vec3 uGlow;
            varying vec2 vUv;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            void main() {
                float t = uTime;

                // a short, gentle glitch only now and then (roughly every 6-10 seconds)
                float burst = smoothstep(0.8, 0.92, noise(vec2(t * 0.45, 3.0))) * uMotion;

                // cursor proximity
                vec2 d = (vUv - uMouse) * vec2(uAspect, 1.0);
                float near = smoothstep(0.6, 0.0, length(d)) * uHover;

                // whole-sign shake: still at rest, a small wobble in a burst, stronger on hover
                float shakeAmt = (0.006 * burst + 0.01 * uHover) * uMotion;
                vec2 uv = vUv + vec2(
                    noise(vec2(t * 9.0, 1.0)) - 0.5,
                    (noise(vec2(t * 11.0, 7.0)) - 0.5) * 0.6
                ) * shakeAmt * 2.0;

                // around the cursor: a lens bulge with rippling rings
                float dist = length(d);
                vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
                uv -= dir * vec2(1.0 / uAspect, 1.0) * (0.035 * near * smoothstep(0.0, 0.35, dist)) * uMotion;
                uv += dir * vec2(1.0 / uAspect, 1.0) * sin(dist * 38.0 - t * 9.0) * 0.012 * near * uMotion;

                // a slight sideways jitter of thin rows near the cursor
                float row = floor(vUv.y * uRows);
                uv.x += (noise(vec2(row * 0.53, t * 18.0)) - 0.5) * 0.018 * near * uMotion;


                // RGB split only while glitching or hovered
                float ang = t * 0.8;
                vec2 ca = vec2(cos(ang), sin(ang)) * vec2(1.0 / uAspect, 1.0)
                        * (0.004 * burst + 0.014 * near + 0.003 * uHover) * uMotion;
                vec4 r = texture2D(tMap, uv + ca);
                vec4 g = texture2D(tMap, uv);
                vec4 b = texture2D(tMap, uv - ca);
                vec3 col = vec3(r.r, g.g, b.b);
                float a = max(max(r.a, g.a), b.a);

                // glow: a wide, bright halo of light around the letters near the cursor (four rings of samples)
                float halo = 0.0;
                for (int i = 0; i < 16; i++) {
                    float aa = float(i) / 16.0 * 6.2832 + 0.2;
                    vec2 o = vec2(cos(aa), sin(aa)) * vec2(1.0 / uAspect, 1.0);
                    halo += texture2D(tMap, uv + o * 0.02).a
                          + texture2D(tMap, uv + o * 0.045).a * 0.8
                          + texture2D(tMap, uv + o * 0.08).a * 0.55
                          + texture2D(tMap, uv + o * 0.12).a * 0.3;
                }
                halo = clamp(halo / 16.0 * 0.85, 0.0, 1.0);
                halo = pow(halo, 0.8) * near * uMotion;
                col = mix(col, uGlow, halo * (1.0 - a)) + uGlow * a * near * 0.8 * uMotion;    // letters light up too
                a = max(a, halo * 0.95);


                // LCD bulbs: a grid of tiny round dots fixed to the sign itself
                vec2 cellUv = fract(vUv * uCells) - 0.5;
                float bulb = 1.0 - smoothstep(0.18, 0.62, length(cellUv));
                float cellShade = 0.94 + 0.06 * hash(floor(vUv * uCells));   // static, not animated
                col *= cellShade * mix(0.8, 1.12, bulb);
                a *= mix(0.62, 1.0, bulb);

                // the whole sign dims very slightly during a glitch, like a screen refresh
                col *= 1.0 - 0.08 * burst * (0.5 + 0.5 * sin(t * 40.0));

                gl_FragColor = vec4(col, a);
            }
        `,
        transparent: true,
        depthWrite: false,
        fog: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;

    const size = { cssW: 1, cssH: 1 };

    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // Layout, like the reference:
    //   Sheng
    //   ICT            Yiping
    //   Undergraduate
    function draw() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const inkW = (m) => Math.max(m.width, m.actualBoundingBoxRight + Math.max(0, m.actualBoundingBoxLeft));
        tctx.font = NAME_FONT(100);
        const n1 = inkW(tctx.measureText(NAME_1));
        const n2 = inkW(tctx.measureText(NAME_2));
        tctx.font = SUB_FONT(34);
        const sub = Math.max(...SUB.map(s => tctx.measureText(s).width));
        const gap = 14;
        const block100 = Math.max(n1, sub + gap + n2);

        const targetW = Math.min(window.innerWidth * 0.62, 360);
        const k = targetW / block100;
        const nameSize = 100 * k;
        const subSize = 34 * k;
        const subW = sub * k;
        const blockW = block100 * k;

        const b1 = PAD + nameSize * 0.8;
        const b2 = b1 + nameSize * 1.0;   // room for the "g" descender above the "Y"
        const cssW = Math.ceil(blockW + PAD * 2);
        const cssH = Math.ceil(b2 + nameSize * 0.3 + PAD);

        // draw at 2x the screen size so it stays sharp as the camera gets closer
        const scale = dpr * 2;
        textCanvas.width = cssW * scale;
        textCanvas.height = cssH * scale;
        tctx.setTransform(scale, 0, 0, scale, 0, 0);
        tctx.clearRect(0, 0, cssW, cssH);
        tctx.textBaseline = 'alphabetic';
        tctx.textAlign = 'left';

        tctx.fillStyle = cssVar('--title-color', cssVar('--heading', '#eee'));
        tctx.font = NAME_FONT(nameSize);
        tctx.fillText(NAME_1, PAD, b1);
        tctx.fillText(NAME_2, PAD + subW + gap * k, b2);

        tctx.fillStyle = cssVar('--sub-color', cssVar('--text-mid', '#aaa'));
        tctx.font = SUB_FONT(subSize);
        tctx.fillText(SUB[0], PAD, b2 - subSize * 1.02);
        tctx.fillText(SUB[1], PAD, b2 + subSize * 0.08);

        tex.needsUpdate = true;
        size.cssW = cssW;
        size.cssH = cssH;
        size.pad = PAD;
        const u = material.uniforms;
        u.uGlow.value.set(cssVar('--accent', '#ffffff')).lerp(new THREE.Color('#ffffff'), 0.35);   // lighter, so it reads as light
        u.uAspect.value = cssW / cssH;
        u.uCells.value.set(cssW / BULB_PX, cssH / BULB_PX);
        u.uRows.value = cssH / 3;
    }

    // hover: point the mouse ray at the sign to find where on it the cursor is
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(-9, -9);
    const mouseTarget = new THREE.Vector2(-2, -2);
    let hoverTarget = 0;
    window.addEventListener('pointermove', e => {
        ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    document.addEventListener('pointerleave', () => ndc.set(-9, -9));

    function update(dt, camera) {
        const u = material.uniforms;
        u.uTime.value += dt;
        if (!mesh.visible) return;

        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObject(mesh, false)[0];
        if (hit && hit.uv && !reducedMotion) {
            mouseTarget.copy(hit.uv);
            hoverTarget = 1;
        } else {
            hoverTarget = 0;
        }
        u.uHover.value += (hoverTarget - u.uHover.value) * (1 - Math.exp(-dt * 7));
        u.uMouse.value.lerp(mouseTarget, 1 - Math.exp(-dt * 14));
    }

    return { mesh, draw, update, size };
}
