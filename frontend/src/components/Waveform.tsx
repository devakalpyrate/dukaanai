import React, { useEffect, useRef } from 'react';
import type { AssistantState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface WaveformProps {
  state: AssistantState;
  audioLevel: number;
}

export const Waveform: React.FC<WaveformProps> = ({ state, audioLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      let strokeColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 210, 255, 0.5)';
      let glowColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 242, 254, 0.4)';
      let waveCount = 3;
      let baseAmp = 3;

      if (isDark) {
        if (state === 'listening') {
          strokeColor = 'rgba(255, 255, 255, 0.9)';
          glowColor = 'rgba(255, 255, 255, 0.5)';
          baseAmp = 6 + audioLevel * 34;
        } else if (state === 'transcribing' || state === 'thinking') {
          strokeColor = 'rgba(220, 220, 220, 0.8)';
          glowColor = 'rgba(220, 220, 220, 0.4)';
          baseAmp = 8;
        } else if (state === 'executing') {
          strokeColor = 'rgba(255, 255, 255, 0.85)';
          glowColor = 'rgba(255, 255, 255, 0.5)';
          baseAmp = 12;
        } else if (state === 'speaking') {
          strokeColor = 'rgba(255, 255, 255, 0.95)';
          glowColor = 'rgba(255, 255, 255, 0.6)';
          baseAmp = 15;
        }
      } else {
        if (state === 'listening') {
          strokeColor = 'rgba(239, 68, 68, 0.85)';
          glowColor = 'rgba(239, 68, 68, 0.6)';
          baseAmp = 6 + audioLevel * 34;
        } else if (state === 'transcribing' || state === 'thinking') {
          strokeColor = 'rgba(245, 158, 11, 0.8)';
          glowColor = 'rgba(245, 158, 11, 0.5)';
          baseAmp = 8;
        } else if (state === 'executing') {
          strokeColor = 'rgba(157, 78, 221, 0.85)';
          glowColor = 'rgba(157, 78, 221, 0.6)';
          baseAmp = 12;
        } else if (state === 'speaking') {
          strokeColor = 'rgba(0, 242, 254, 0.9)';
          glowColor = 'rgba(0, 242, 254, 0.7)';
          baseAmp = 15;
        }
      }

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = glowColor;

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === 1 ? 2.5 : 1.2;
        ctx.strokeStyle = strokeColor;

        const currentPhase = phase + i * 0.8;
        const currentAmp = baseAmp * (1 - i * 0.25);

        for (let x = 0; x < width; x += 3) {
          const progress = x / width;
          const envelope = Math.sin(progress * Math.PI);
          const y = centerY + Math.sin(progress * 8 + currentPhase) * currentAmp * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
      phase += state === 'listening' ? 0.08 + audioLevel * 0.15 : 0.04;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state, audioLevel]);

  return (
    <div className="w-full max-w-xl h-20 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={560}
        height={80}
        className="w-full h-full"
      />
    </div>
  );
};
