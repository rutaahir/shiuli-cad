import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const BackgroundAnimations: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Disable intensive canvas particle physics loop on mobile/touch screens to ensure smooth 60fps scrolling & save battery
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isMobileWidth = window.innerWidth < 768;
    if (isTouch || isMobileWidth) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      if (window.innerWidth < 768) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Color palette for golden studio atmosphere
    const colors = [
      'rgba(212, 175, 55, ',   // Gold
      'rgba(245, 231, 163, ',  // Champagne Gold
      'rgba(126, 172, 252, ',  // Sapphire Ice Blue
      'rgba(255, 255, 255, ',  // Diamond White
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseAlpha: number;
      alpha: number;
      alphaPhase: number;
      alphaSpeed: number;
    }

    // Lightweight particle count on desktop
    const particleCount = Math.min(Math.floor((width * height) / 40000), 28);
    const particles: Particle[] = [];


    for (let i = 0; i < particleCount; i++) {
      const colorPrefix = colors[Math.floor(Math.random() * colors.length)];
      const baseAlpha = Math.random() * 0.45 + 0.15;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.1, // Drifts upward gently
        radius: Math.random() * 1.8 + 0.6,
        color: colorPrefix,
        baseAlpha,
        alpha: baseAlpha,
        alphaPhase: Math.random() * Math.PI * 2,
        alphaSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connecting CAD geometry lattice lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130;

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 2. Draw & update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Twinkle / Pulse Alpha
        p.alphaPhase += p.alphaSpeed;
        p.alpha = p.baseAlpha + Math.sin(p.alphaPhase) * 0.15;

        // Wrap around screen boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.alpha))})`;
        ctx.shadowBlur = p.radius > 1.4 ? 6 : 0;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for efficiency
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {/* Floating Animated Ambient Glowing Orbs */}
      <motion.div
        animate={{
          x: [0, 45, -30, 0],
          y: [0, -40, 25, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-[#D4AF37]/10 blur-[150px] pointer-events-none z-[0]"
      />

      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -35, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed top-1/3 -right-40 w-[40rem] h-[40rem] rounded-full bg-[#1E4FA3]/12 blur-[170px] pointer-events-none z-[0]"
      />

      <motion.div
        animate={{
          x: [0, 35, -25, 0],
          y: [0, -30, 40, 0],
          scale: [0.95, 1.1, 1, 0.95],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full bg-[#F5E7A3]/8 blur-[160px] pointer-events-none z-[0]"
      />

      {/* Interactive Golden Star Dust & CAD Mesh Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[1] opacity-75"
      />
    </div>
  );
};
