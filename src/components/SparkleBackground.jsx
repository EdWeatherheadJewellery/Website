import { useEffect, useRef } from 'react';
import './SparkleBackground.css';

// Ported from the old site's vanilla-JS sparkle script.
// Same generation logic (kept dynamic on purpose — see project notes on
// why hard-coding the SVGs wouldn't meaningfully help performance).
// The two changes for React:
//   1. Renders into a ref'd container instead of document.body, so it
//      can't leak elements across route changes / re-mounts.
//   2. Everything it creates is cleaned up on unmount.

const COLORS = ['white', '#e1e2ff', 'hsl(106, 82%, 83%)', '#c9ffff', '#ffd3fe'];
const SPARKLES_PER_LAYER = 100;
const MAX_SPARKLE_SIZE = 5;
const REDUCE_SPARKLE_SIZE = 5;
const LAYERS = 5;
const RARITY_MIN = 100;
const RARITY_MAX = 100;
const THRESHOLD = 20;

export default function SparkleBackground() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const totalX = window.innerWidth;
    const totalY = window.innerHeight;

    function makeLayer() {
      const layer = document.createElement('div');
      layer.classList.add('sparkleDiv');

      for (let i = 0; i < SPARKLES_PER_LAYER; i++) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');

        const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tri.setAttribute('points', '12,10 20,16 12,30');
        tri.style.fill = COLORS[Math.floor(Math.random() * COLORS.length)];

        const sizer = Math.floor(Math.random() * MAX_SPARKLE_SIZE) / REDUCE_SPARKLE_SIZE;
        tri.setAttribute('transform', `scale(${sizer})`);

        svg.appendChild(tri);
        svg.style.top = Math.floor(Math.random() * totalY) + 'px';
        svg.style.left = Math.floor(Math.random() * totalX) + 'px';
        svg.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;

        layer.appendChild(svg);
      }

      layer.style.display = 'none';
      return layer;
    }

    const layers = [];
    const base = makeLayer();
    base.id = 'sparkles0';
    host.appendChild(base);
    layers.push(base);

    for (let j = 1; j < LAYERS; j++) {
      const clone = base.cloneNode(true);
      clone.id = 'sparkles' + j;
      clone.style.transformOrigin = 'center center';
      clone.style.transform = `rotate(${(j * 360) / LAYERS}deg)`;
      host.appendChild(clone);
      layers.push(clone);
    }

    const moduloValues = layers.map(() => Math.floor(Math.random() * RARITY_MIN) + RARITY_MAX);

    function handleMouseMove(e) {
      layers.forEach((layer, idx) => {
        layer.style.display =
          (e.screenX + e.screenY) % moduloValues[idx] < THRESHOLD ? 'block' : 'none';
      });
    }

    function handleOrientation(e) {
      layers.forEach((layer, idx) => {
        const hit =
          Math.round(e.alpha) % moduloValues[idx] < 5 &&
          Math.round(e.beta) % moduloValues[idx] < 5 &&
          Math.round(e.gamma) % moduloValues[idx] < 5;
        layer.style.display = hit ? 'block' : 'none';
      });
    }

    const useOrientation = 'DeviceOrientation' in document;
    if (useOrientation) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (useOrientation) {
        window.removeEventListener('deviceorientation', handleOrientation);
      } else {
        document.removeEventListener('mousemove', handleMouseMove);
      }
      host.innerHTML = '';
    };
  }, []);

  return <div ref={hostRef} className="sparkle-host" aria-hidden="true" />;
}
