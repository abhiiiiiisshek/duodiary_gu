import React, { useEffect, useRef } from 'react';
import { ThemeId } from '../../types/diary';

interface AmbientCanvasProps {
  theme: ThemeId;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  fadeSpeed: number;
  angle?: number;
  spin?: number;
  color?: string;
}

export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      const count = theme === 'rainy' ? 95 : theme === 'moonlit' ? 120 : 45;

      for (let i = 0; i < count; i++) {
        if (theme === 'moonlit') {
          // Stars & celestial motes
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            fadeSpeed: (Math.random() * 0.01 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
          });
        } else if (theme === 'rainy') {
          // Rain streaks
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: -0.6,
            vy: Math.random() * 8 + 12,
            size: Math.random() * 1.5 + 0.8,
            opacity: Math.random() * 0.4 + 0.15,
            fadeSpeed: 0,
          });
        } else if (theme === 'botanical') {
          // Drifting petals & leaves
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: Math.random() * 0.8 + 0.3,
            vy: Math.random() * 0.7 + 0.4,
            size: Math.random() * 5 + 3,
            opacity: Math.random() * 0.5 + 0.2,
            fadeSpeed: 0,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.02,
          });
        } else if (theme === 'parchment') {
          // Warm golden dust motes / candle embers
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.5 - 0.1,
            size: Math.random() * 2.5 + 1,
            opacity: Math.random() * 0.6 + 0.1,
            fadeSpeed: Math.random() * 0.006 + 0.002,
          });
        } else {
          // Aurora ethereal glowing orbs
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: Math.random() * 20 + 8,
            opacity: Math.random() * 0.25 + 0.05,
            fadeSpeed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
          });
        }
      }
    };

    initParticles();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render theme-specific particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (theme === 'moonlit') {
          // Stars twinkling
          p.opacity += p.fadeSpeed;
          if (p.opacity > 0.95 || p.opacity < 0.15) {
            p.fadeSpeed = -p.fadeSpeed;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(235, 240, 255, ${p.opacity})`;
          ctx.shadowBlur = p.size > 1.8 ? 8 : 0;
          ctx.shadowColor = 'rgba(180, 210, 255, 0.8)';
          ctx.fill();
          ctx.shadowBlur = 0;

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        } else if (theme === 'rainy') {
          // Rain streaks
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 2.2);
          ctx.strokeStyle = `rgba(160, 205, 240, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.stroke();

          p.x += p.vx;
          p.y += p.vy;
          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        } else if (theme === 'botanical') {
          // Soft flower petal / leaf sway
          if (p.angle !== undefined && p.spin !== undefined) {
            p.angle += p.spin;
            p.x += Math.sin(p.angle) * 0.8 + p.vx;
            p.y += p.vy;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(195, 150, 160, ${p.opacity * 0.7})`;
            ctx.fill();
            ctx.restore();

            if (p.y > height + 20) {
              p.y = -20;
              p.x = Math.random() * width;
            }
          }
        } else if (theme === 'parchment') {
          // Warm golden floating dust
          p.opacity += p.fadeSpeed;
          if (p.opacity > 0.75 || p.opacity < 0.1) {
            p.fadeSpeed = -p.fadeSpeed;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(215, 175, 110, ${p.opacity * 0.6})`;
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(215, 160, 80, 0.4)';
          ctx.fill();
          ctx.shadowBlur = 0;

          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        } else {
          // Aurora glowing ethereal orbs
          p.opacity += p.fadeSpeed;
          if (p.opacity > 0.3 || p.opacity < 0.05) {
            p.fadeSpeed = -p.fadeSpeed;
          }

          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, `rgba(180, 160, 240, ${p.opacity})`);
          gradient.addColorStop(0.5, `rgba(130, 200, 220, ${p.opacity * 0.4})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -p.size) p.x = width + p.size;
          if (p.x > width + p.size) p.x = -p.size;
          if (p.y < -p.size) p.y = height + p.size;
          if (p.y > height + p.size) p.y = -p.size;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70 transition-opacity duration-1000"
    />
  );
};
