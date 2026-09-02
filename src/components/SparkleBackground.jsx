import { useEffect, useRef, useState } from 'react';
import './SparkleBackground.css';

// The two changes for React:
//   1. Renders into a ref'd container instead of document.body, so it
//      can't leak elements across route changes / re-mounts.
//   2. Everything it creates is cleaned up on unmount.

const COLORS = [
  '#FFFFFF',
  '#FFFFFF',

  'hsl(33, 30%, 93%)',
  'hsl(141, 40%, 93%)',

  // 'hsl(300, 80%, 96%)', //magenta
  // 'hsl(60, 80%, 91%)',  //yellow
  // 'hsl(120, 80%, 93%)', //green
  // 'hsl(0, 80%, 97%)',  //red
  // 'hsl(180, 80%, 92%)',  //cyan
  // 'hsl(240, 80%, 97%)', //blue
];

const SPARKLES_PER_LAYER = 15;
const SPARKLE_SIZE_INCREASE = 1;  // multiplier to adjut the average size of sparkles
const LAYERS = 10;  // number of layers (more layers leads to more variety)
const RARITY_MIN = 1000; // Multiplier; A higher number means it's rarer to see sparkles appear
const RARITY_MAX = 100; // Gets added after multiplying; A higher number makes it even rarer to see sparkles appear
const THRESHOLD = 50;  // A higher number makes sparkles stay visible for longer

export default function SparkleBackground() {
  const hostRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleChange);
    return () => motionQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // if (reducedMotion) return;

    const totalX = window.innerWidth;
    const totalY = window.innerHeight;
    function makeLayer(index) {
      const layer = document.createElement('div');
      layer.classList.add('sparkleDiv');
      layer.id = 'sparkles' + index;
      for (let i = 0; i < SPARKLES_PER_LAYER; i++) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '200');
        svg.setAttribute('height', '200');
        const sizer = Math.ceil(Math.random() * SPARKLE_SIZE_INCREASE);
        const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tri.setAttribute('points', '12,10 20,16 12,30');
        tri.style.fill = COLORS[Math.floor(Math.random() * COLORS.length)];
        tri.setAttribute('transform', `scale(${sizer})`);
        svg.appendChild(tri);
        svg.style.top = Math.floor(Math.random() * totalY) + 'px';
        svg.style.left = Math.floor(Math.random() * totalX) + 'px';
        svg.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
        layer.appendChild(svg);
      }
      layer.style.display = 'none';
      if (index > 0) {
        layer.style.transformOrigin = 'center center';
        layer.style.transform = `rotate(${(index * 360) / LAYERS}deg)`;
      }
      return layer;
    }
    const layers = [];
    for (let j = 0; j < LAYERS; j++) {
      const layer = makeLayer(j);
      host.appendChild(layer);
      layers.push(layer);
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
  // }, [reducedMotion]);
  }, []);
  return <div ref={hostRef} className="sparkle-host" aria-hidden="true" />;
}