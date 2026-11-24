/**
 * Turns a rendered 3D still (transparent PNG data URL) into a hand-inked comic sketch:
 * flat posterised colour, dark ink outlines (including the silhouette) and pencil hatching in the shadows.
 */
export function sketchify(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        const n = w * h;
        const lum = new Float32Array(n);
        const alpha = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const o = i * 4;
          lum[i] = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;
          alpha[i] = px[o + 3] / 255;
        }
        // Sobel edges on brightness (inner detail) and on alpha (silhouette)
        const edge = new Float32Array(n);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const gx = (a: Float32Array) =>
              -a[i - w - 1] - 2 * a[i - 1] - a[i + w - 1] + a[i - w + 1] + 2 * a[i + 1] + a[i + w + 1];
            const gy = (a: Float32Array) =>
              -a[i - w - 1] - 2 * a[i - w] - a[i - w + 1] + a[i + w - 1] + 2 * a[i + w] + a[i + w + 1];
            const el = Math.hypot(gx(lum), gy(lum)) * alpha[i];
            const ea = Math.hypot(gx(alpha), gy(alpha)) * 1.6;
            edge[i] = Math.max(el * 0.95, ea);
          }
        }
        // Thicken lines by one pixel
        const thick = new Float32Array(n);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            thick[i] = Math.max(edge[i], edge[i - 1], edge[i + 1], edge[i - w], edge[i + w] * 0.9);
          }
        }
        const out = ctx.createImageData(w, h);
        const o = out.data;
        const levels = 4;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const p = i * 4;
            let r = px[p];
            let g = px[p + 1];
            let b = px[p + 2];
            let a = px[p + 3];
            if (a > 8) {
              // flat comic colours, lifted a little toward paper so it reads as coloured ink, not a render
              const q = (v: number) => Math.round((v / 255) * (levels - 1)) * (255 / (levels - 1));
              r = q(r) * 0.82 + 255 * 0.18;
              g = q(g) * 0.82 + 255 * 0.18;
              b = q(b) * 0.82 + 255 * 0.18;
              // pencil hatching in the shadows
              if (lum[i] < 0.25 && (x + y) % 6 < 1.2) {
                r *= 0.45;
                g *= 0.45;
                b *= 0.45;
              } else if (lum[i] < 0.14 && (x - y + 1000) % 5 < 1) {
                r *= 0.5;
                g *= 0.5;
                b *= 0.5;
              }
            }
            const e = Math.min(1, thick[i] * 2.3);
            if (e > 0.28) {
              const k = Math.min(1, (e - 0.28) / 0.35);
              r = r * (1 - k) + 20 * k;
              g = g * (1 - k) + 18 * k;
              b = b * (1 - k) + 16 * k;
              a = Math.max(a, 255 * k);
            }
            o[p] = r;
            o[p + 1] = g;
            o[p + 2] = b;
            o[p + 3] = a;
          }
        }
        ctx.putImageData(out, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
