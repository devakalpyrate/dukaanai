import React from 'react';
import { motion } from 'framer-motion';
import type { AssistantState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface OrbProps {
  state: AssistantState;
  audioLevel: number;
}

export const Orb: React.FC<OrbProps> = ({ state, audioLevel }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getOrbGradient = () => {
    switch (state) {
      case 'listening':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #f43f5e 40%, #881337 80%, #000000 95%)';
      case 'transcribing':
      case 'thinking':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #eab308 40%, #713f12 80%, #000000 95%)';
      case 'executing':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #ffd026 45%, #a16207 80%, #000000 95%)';
      case 'speaking':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #06b6d4 40%, #0e7490 80%, #000000 95%)';
      case 'clarification':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #f59e0b 45%, #78350f 85%, #000000 95%)';
      case 'success':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #10b981 40%, #064e3b 80%, #000000 95%)';
      case 'error':
        return 'radial-gradient(circle at 35% 35%, #ffffff, #ef4444 40%, #7f1d1d 85%, #000000 95%)';
      case 'idle':
      default:
        return isDark
          ? 'radial-gradient(circle at 35% 35%, #ffffff, #71717a 45%, #18181b 85%)'
          : 'radial-gradient(circle at 35% 35%, #ffffff, #ffd026 40%, #ca8a04 85%)';
    }
  };

  const getGlowShadow = () => {
    switch (state) {
      case 'listening':
        return '0 0 60px rgba(244, 63, 94, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.8)';
      case 'transcribing':
      case 'thinking':
        return '0 0 65px rgba(234, 179, 8, 0.65), inset 0 0 30px rgba(255, 255, 255, 0.8)';
      case 'executing':
        return '0 0 70px rgba(255, 208, 38, 0.75), inset 0 0 35px rgba(255, 255, 255, 0.9)';
      case 'speaking':
        return '0 0 65px rgba(6, 182, 212, 0.65), inset 0 0 30px rgba(255, 255, 255, 0.8)';
      case 'success':
        return '0 0 65px rgba(16, 185, 129, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.85)';
      case 'error':
        return '0 0 55px rgba(239, 68, 68, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.7)';
      case 'clarification':
        return '0 0 50px rgba(245, 158, 11, 0.55), inset 0 0 25px rgba(255, 255, 255, 0.7)';
      case 'idle':
      default:
        return isDark
          ? '0 0 40px rgba(255, 255, 255, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.5)'
          : '0 0 45px rgba(255, 208, 38, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.6)';
    }
  };

  const scaleBoost =
    state === 'listening'
      ? 1 + audioLevel * 0.45
      : state === 'speaking'
      ? [1, 1.08, 1]
      : state === 'thinking' || state === 'transcribing'
      ? [1, 1.05, 1]
      : 1;

  const isSpinning = state === 'transcribing' || state === 'thinking' || state === 'executing';

  return (
    <div className="relative w-56 h-56 flex items-center justify-center my-2">
      {/* Outer Orbital Ring 1 - reacts to thinking / transcribing */}
      <motion.div
        animate={{
          rotate: isSpinning ? 360 : 360,
          scale: state === 'listening' ? [1, 1.15, 1] : 1,
          opacity: isSpinning ? [0.4, 0.9, 0.4] : 0.4,
        }}
        transition={{
          rotate: { duration: isSpinning ? 3 : 25, repeat: Infinity, ease: 'linear' },
          scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
          opacity: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        }}
        className={`absolute w-60 h-60 rounded-full border border-dashed pointer-events-none transition-colors duration-500 ${
          state === 'listening'
            ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            : isSpinning
            ? 'border-[#FFD026] shadow-[0_0_25px_rgba(255,208,38,0.4)]'
            : state === 'speaking'
            ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            : state === 'success'
            ? 'border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
            : 'border-neutral-700/50 dark:border-neutral-700/50 light:border-neutral-300'
        }`}
      />

      {/* Inner Orbital Ring 2 - counter-rotates */}
      <motion.div
        animate={{
          rotate: isSpinning ? -360 : -360,
          scale: isSpinning ? [1, 1.08, 1] : 1,
        }}
        transition={{
          rotate: { duration: isSpinning ? 2 : 18, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
        }}
        className={`absolute w-44 h-44 rounded-full border pointer-events-none transition-colors duration-500 ${
          state === 'listening'
            ? 'border-rose-400/50'
            : isSpinning
            ? 'border-[#FFD026]/70 border-t-transparent border-l-transparent'
            : state === 'speaking'
            ? 'border-cyan-300/50'
            : state === 'success'
            ? 'border-emerald-400/50'
            : 'border-neutral-600/40'
        }`}
      />

      {/* Energy Particle Halo during active processing */}
      {isSpinning && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute w-40 h-40 rounded-full pointer-events-none"
        >
          <div className="w-3 h-3 rounded-full bg-[#FFD026] shadow-[0_0_15px_#FFD026] absolute -top-1.5 left-1/2 -translate-x-1/2" />
          <div className="w-2 h-2 rounded-full bg-[#FFD026] shadow-[0_0_10px_#FFD026] absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </motion.div>
      )}

      {/* Core Orb Sphere */}
      <motion.div
        animate={{
          scale: scaleBoost,
          y: state === 'idle' ? [0, -6, 0] : 0,
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          scale:
            typeof scaleBoost === 'number'
              ? { type: 'spring', damping: 15, stiffness: 200 }
              : { duration: 1, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          background: getOrbGradient(),
          boxShadow: getGlowShadow(),
        }}
        className="relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-500"
      >
        {/* Swirling Flow Layer 1 */}
        <motion.div
          animate={{ rotate: isSpinning ? 720 : 360 }}
          transition={{ duration: isSpinning ? 3 : 8, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-4 rounded-[40%] bg-gradient-to-tr from-white/30 to-transparent mix-blend-screen"
        />

        {/* Swirling Flow Layer 2 */}
        <motion.div
          animate={{ rotate: isSpinning ? -720 : -360 }}
          transition={{ duration: isSpinning ? 4 : 12, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-4 rounded-[42%] bg-gradient-to-br from-amber-200/30 to-transparent mix-blend-screen"
        />

        {/* Gloss Sheen Reflection */}
        <div className="absolute top-2 left-3 w-10 h-6 rounded-full bg-radial from-white/80 to-transparent -rotate-30 pointer-events-none" />
      </motion.div>
    </div>
  );
};
