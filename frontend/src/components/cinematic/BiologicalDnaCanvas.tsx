import React, { useEffect, useRef } from 'react';

interface BiologicalDnaCanvasProps {
  className?: string;
  portalCenterXRatio?: number; // default ~0.38 (left-center)
  portalCenterYRatio?: number; // default ~0.48
  portalRadius?: number;       // default ~110px
  isPaused?: boolean;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
}

export const BiologicalDnaCanvas: React.FC<BiologicalDnaCanvasProps> = ({
  className = '',
  portalCenterXRatio = 0.38,
  portalCenterYRatio = 0.48,
  portalRadius = 110,
  isPaused = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 1200);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 800);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Initialize Floating Biological Dust
    const dustCount = 80;
    const dustColors = ['#F59E0B', '#F97316', '#FB923C', '#FEF3C7', '#D97706'];
    const dustParticles: DustParticle[] = [];
    for (let i = 0; i < dustCount; i++) {
      const baseAlpha = 0.15 + Math.random() * 0.45;
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.1 - Math.random() * 0.25,
        size: 1 + Math.random() * 2.5,
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: 0.001 + Math.random() * 0.003,
        pulsePhase: Math.random() * Math.PI * 2,
        color: dustColors[Math.floor(Math.random() * dustColors.length)],
      });
    }

    // Main 60 FPS Render Loop
    let rotation = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const delta = Math.min(now - lastTime, 50);
      lastTime = now;

      if (!prefersReducedMotion && !isPaused) {
        rotation += delta * 0.00045; // slow cinematic rotation
      }

      // Reset and Clear Canvas with Deep Navy/Charcoal
      ctx.save();
      ctx.fillStyle = '#06080E';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Ambient Radial Lighting Blobs (Warm Orange Bloom & Deep Red/Navy Areas)
      const portalX = width * portalCenterXRatio;
      const portalY = height * portalCenterYRatio;

      // Primary Warm Biological Bloom (Center-Left)
      const primaryGlow = ctx.createRadialGradient(portalX, portalY, 10, portalX, portalY, width * 0.55);
      primaryGlow.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
      primaryGlow.addColorStop(0.35, 'rgba(239, 68, 68, 0.07)');
      primaryGlow.addColorStop(0.7, 'rgba(15, 23, 42, 0.4)');
      primaryGlow.addColorStop(1, 'rgba(6, 8, 14, 0)');
      ctx.fillStyle = primaryGlow;
      ctx.fillRect(0, 0, width, height);

      // Secondary Upper-Right Coral Haze
      const secGlow = ctx.createRadialGradient(width * 0.7, height * 0.3, 20, width * 0.7, height * 0.3, width * 0.45);
      secGlow.addColorStop(0, 'rgba(249, 115, 22, 0.09)');
      secGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.03)');
      secGlow.addColorStop(1, 'rgba(6, 8, 14, 0)');
      ctx.fillStyle = secGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw & Update Floating Biological Dust
      dustParticles.forEach((p) => {
        if (!prefersReducedMotion && !isPaused) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
          p.alpha = p.baseAlpha * (0.6 + Math.sin(now * p.pulseSpeed + p.pulsePhase) * 0.4);
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Construct and Render the Animated 3D DNA Double Helix
      // Helix travels diagonally from top center-right down toward bottom center-left
      const helixSteps = 75;
      const helixLength = Math.max(height * 1.25, 900);
      const helixStartY = -height * 0.12;
      const stepDist = helixLength / helixSteps;

      // Energy wave pulse travels smoothly along length
      const pulsePos = (now * 0.00028) % 1; // 0 to 1 loop

      interface DnaParticle {
        x: number;
        y: number;
        z: number;
        radius: number;
        color: string;
        alpha: number;
        isHotspot: boolean;
      }

      const renderQueue: DnaParticle[] = [];

      for (let i = 0; i < helixSteps; i++) {
        const prog = i / helixSteps;
        const y = helixStartY + i * stepDist;

        // Diagonal curvature path: center curves smoothly across the dashboard
        const cx = portalX + (prog - 0.5) * 180 + Math.sin(prog * Math.PI) * 70;

        // Helical phase angle with continuous cinematic rotation
        const phase = i * 0.16 + rotation;
        const radius = 100 + Math.sin(prog * Math.PI) * 35; // organic bulge in center

        // 3D coordinates for Strand 1 and Strand 2
        const cosP = Math.cos(phase);
        const sinP = Math.sin(phase);

        const x1 = cx + radius * cosP;
        const z1 = radius * sinP;

        const x2 = cx - radius * cosP;
        const z2 = -radius * sinP;

        // Check if this step is within the traveling energy pulse
        const distToPulse = Math.abs(prog - pulsePos);
        const isEnergyPulse = distToPulse < 0.06 || Math.abs(prog - (pulsePos - 1)) < 0.06;

        // Depth perspective mapping: z from -radius to +radius
        const mapParticle = (x: number, yPos: number, z: number, isCore: boolean): DnaParticle => {
          const depthNorm = (z + 140) / 280; // 0 (far) to 1 (near)
          const baseSize = isCore ? (isEnergyPulse ? 3.8 : 2.6) : 1.4;
          const r = baseSize * (0.6 + depthNorm * 0.7);

          // Warm golden color grading based on depth and energy
          let color = '#F59E0B'; // warm gold
          if (isEnergyPulse) {
            color = depthNorm > 0.6 ? '#FFFFFF' : '#FEF3C7'; // bright blazing core
          } else if (depthNorm > 0.7) {
            color = '#FDE68A'; // near, bright gold
          } else if (depthNorm < 0.3) {
            color = '#92400E'; // far, deep dark amber
          } else {
            color = '#F97316'; // mid-depth warm coral
          }

          const alpha = (0.25 + depthNorm * 0.65) * (isEnergyPulse ? 1.0 : 0.85);

          return {
            x,
            y: yPos,
            z,
            radius: r,
            color,
            alpha,
            isHotspot: isEnergyPulse && depthNorm > 0.5,
          };
        };

        // Add primary strand nodes
        renderQueue.push(mapParticle(x1, y, z1, true));
        renderQueue.push(mapParticle(x2, y, z2, true));

        // Add secondary scattering particles around each strand node (cloud density)
        const scatterCount = 2;
        for (let s = 0; s < scatterCount; s++) {
          const angle = (s * Math.PI) + (i * 0.4);
          const offset = 4 + (s * 3.5);
          renderQueue.push(mapParticle(x1 + Math.cos(angle) * offset, y + Math.sin(angle) * offset, z1, false));
          renderQueue.push(mapParticle(x2 - Math.cos(angle) * offset, y - Math.sin(angle) * offset, z2, false));
        }

        // Add base-pair rungs connecting Strand 1 and Strand 2 every 3rd step
        if (i % 3 === 0) {
          const rungSteps = 5;
          for (let r = 1; r < rungSteps; r++) {
            const rf = r / rungSteps;
            const rx = x1 + (x2 - x1) * rf;
            const rz = z1 + (z2 - z1) * rf;
            const ry = y;
            renderQueue.push(mapParticle(rx, ry, rz, false));
          }
        }
      }

      // Sort by Z depth (far to near painter's algorithm)
      renderQueue.sort((a, b) => a.z - b.z);

      // Render All DNA Particles with Glow
      renderQueue.forEach((p) => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        // Subtle bloom for hotspots/foreground nodes
        if (p.isHotspot) {
          ctx.save();
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // End of particles rendering
      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [portalCenterXRatio, portalCenterYRatio, portalRadius, isPaused]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default BiologicalDnaCanvas;
