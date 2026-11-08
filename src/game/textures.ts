import * as THREE from "three";

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function foliageTexture(kind: "green" | "sakura") {
  const texture = new THREE.TextureLoader().load(`/textures/foliage-${kind}.webp`);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function grassTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#5d8a3c";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4000; i++) {
      const l = 30 + Math.random() * 25;
      g.fillStyle = `hsl(${85 + Math.random() * 25},45%,${l}%)`;
      g.fillRect(Math.random() * s, Math.random() * s, 1.5, 3);
    }
  }, 60);
}

export function stoneTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#cbbfa8";
    g.fillRect(0, 0, s, s);
    const n = 4;
    const w = s / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const l = 70 + Math.random() * 12;
        g.fillStyle = `hsl(36,18%,${l}%)`;
        g.fillRect(x * w + 2, y * w + 2, w - 4, w - 4);
        for (let k = 0; k < 60; k++) {
          g.fillStyle = `rgba(80,60,40,${Math.random() * 0.08})`;
          g.fillRect(x * w + Math.random() * w, y * w + Math.random() * w, 3, 3);
        }
      }
  }, 20);
}

export function tileTexture() {
  return canvasTex(128, (g, s) => {
    g.fillStyle = "#c4502a";
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      g.fillStyle = "rgba(90,25,10,0.35)";
      g.fillRect(0, y, s, 2);
      for (let x = (y / 8) % 2 ? 0 : 8; x < s; x += 16) {
        g.fillStyle = "rgba(255,180,140,0.12)";
        g.fillRect(x, y + 2, 8, 6);
      }
    }
  }, 4);
}

export function waterTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#3f7d84";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      g.strokeStyle = `rgba(220,255,250,${Math.random() * 0.18})`;
      g.beginPath();
      const x = Math.random() * s, y = Math.random() * s;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 8, y - 3, x + 16, y);
      g.stroke();
    }
  }, 6);
}

export function fallTexture() {
  return canvasTex(128, (g, s) => {
    g.fillStyle = "#bfe3ea";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
      g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 10 + Math.random() * 30);
    }
  }, 1);
}
