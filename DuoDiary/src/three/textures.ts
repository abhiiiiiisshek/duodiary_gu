import * as THREE from 'three';

/**
 * Procedural canvas textures. No asset pipeline, no Blender export, no CDN —
 * but the leather still gets its grain and tiny scratches and the paper still
 * gets its fibre, which is what sells the material under bloom.
 */

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, ctx: c.getContext('2d')! };
}

function finish(c: HTMLCanvasElement, repeat = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

let leatherCache: { map: THREE.Texture; rough: THREE.Texture } | null = null;

export function leatherTextures() {
  if (leatherCache) return leatherCache;
  const size = 512;
  const { c, ctx } = canvas(size);

  ctx.fillStyle = '#3a2f42';
  ctx.fillRect(0, 0, size, size);

  // grain: thousands of short overlapping arcs
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 3;
    const shade = 26 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${shade},${shade * 0.85},${shade * 1.1},0.35)`;
    ctx.lineWidth = 0.6 + Math.random();
    ctx.beginPath();
    ctx.arc(x, y, r, Math.random() * 6.28, Math.random() * 6.28 + 1.6);
    ctx.stroke();
  }

  // tiny scratches — the detail the brief actually names
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 6 + Math.random() * 40;
    const angle = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(210,190,160,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const map = finish(c, 2);

  const { c: rc, ctx: rctx } = canvas(256);
  const img = rctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  rctx.putImageData(img, 0, 0);
  const rough = finish(rc, 3);

  leatherCache = { map, rough };
  return leatherCache;
}

let paperCache: THREE.Texture | null = null;

export function paperTexture(tint = '#efe6d2') {
  if (paperCache) return paperCache;
  const size = 512;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(120,100,70,${a})` : `rgba(255,252,240,${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }

  // foxing — the faint age spots on old paper
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(150,110,60,0.09)');
    g.addColorStop(1, 'rgba(150,110,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  paperCache = finish(c, 1);
  return paperCache;
}

let ruledCache: THREE.Texture | null = null;

/** Paper with faint ruled lines and a margin — used on the open spread. */
export function ruledPaperTexture() {
  if (ruledCache) return ruledCache;
  const size = 512;
  const { c, ctx } = canvas(size);
  ctx.drawImage(paperTexture().image as CanvasImageSource, 0, 0, size, size);
  ctx.strokeStyle = 'rgba(70,60,45,0.13)';
  ctx.lineWidth = 1;
  for (let y = 64; y < size; y += 34) {
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(size - 24, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(150,60,60,0.12)';
  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.lineTo(46, size);
  ctx.stroke();
  ruledCache = finish(c, 1);
  return ruledCache;
}

let woodCache: THREE.Texture | null = null;

export function woodTexture() {
  if (woodCache) return woodCache;
  const size = 512;
  const { c, ctx } = canvas(size);
  ctx.fillStyle = '#2e2018';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    const wobble = Math.sin(y * 0.06) * 8 + Math.sin(y * 0.013) * 26;
    const shade = 30 + Math.sin(y * 0.2 + wobble * 0.1) * 14 + Math.random() * 8;
    ctx.fillStyle = `rgb(${shade + 18},${shade * 0.72},${shade * 0.5})`;
    ctx.fillRect(0, y, size, 2);
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    for (let r = 2; r < 30; r += 3) {
      ctx.strokeStyle = `rgba(20,12,8,${0.25 - r * 0.006})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  woodCache = finish(c, 1);
  return woodCache;
}
