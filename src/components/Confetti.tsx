import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#B8963E', '#D4B96A', '#8A7A5A', '#E8D5A3', '#C4A84D', '#9B8340'];

const Confetti: React.FC<ConfettiProps> = ({ active, duration = 4000 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; color: string; rotation: number; rotSpeed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 12 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        opacity: 1,
      });
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const fadeStart = duration * 0.7;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        if (elapsed > fadeStart) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, duration]);

  if (Platform.OS !== 'web' || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 10000,
      }}
    /> as any
  );
};

export default Confetti;
