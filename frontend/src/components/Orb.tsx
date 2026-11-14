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
    if (isDark) {
      // Strictly Pure Monochrome for Dark Mode
      switch (state) {
        case 'listening':
          return 'radial-gradient(circle at 35% 35%, #ffffff, #737373 45%, #000000 85%)';
        case 'transcribing':
        case 'thinking':
          return 'radial-gradient(circle at 35% 35%, #e5e5e5, #525252 45%, #000000 85%)';
        case 'executing':
          return 'radial-gradient(circle at 35% 35%, #ffffff, #404040 50%, #000000 90%)';
        case 'speaking':
          return 'radial-gradient(circle at 35% 35%, #ffffff, #a3a3a3 40%, #000000 80%)';
        case 'clarification':
        case 'error':
          return 'radial-gradient(circle at 35% 35%, #d4d4d4, #262626 50%, #000000 90%)';
        case 'success':
          return 'radial-gradient(circle at 35% 35%, #ffffff, #a3a3a3 35%, #000000 80%)';
        case 'idle':
        default:
          return 'radial-gradient(circle at 35% 35%, #ffffff, #525252 40%, #000000 85%)';
      }
    }

    // Light Mode with refined accent colors
    switch (state) {
      case 'listening':
        return 'radial-gradient(circle at 35% 35%, #f87171, #dc2626 40%, #1e1e1e 80%)';
      case 'transcribing':
      case 'thinking':
        return 'radial-gradient(circle at 35% 35%, #fbbf24, #d97706 40%, #1e1e1e 80%)';
      case 'executing':
        return 'radial-gradient(circle at 35% 35%, #c77dff, #7b2cbf 40%, #1e1e1e 80%)';
      case 'speaking':
        return 'radial-gradient(circle at 35% 35%, #00f2fe, #2563eb 40%, #1e1e1e 80%)';
      case 'clarification':
        return 'radial-gradient(circle at 35% 35%, #fcd34d, #b45309 40%, #1e1e1e 80%)';
      case 'success':
        return 'radial-gradient(circle at 35% 35%, #34d399, #059669 40%, #1e1e1e 80%)';
      case 'error':
        return 'radial-gradient(circle at 35% 35%, #fca5a5, #b91c1c 40%, #1e1e1e 80%)';
      case 'idle':
      default:
        return 'radial-gradient(circle at 35% 35%, #00f2fe, #4facfe 35%, #1e1e1e 80%)';
    }
  };

  const getGlowShadow = () => {
    if (isDark) {
      // Monochrome glow
      switch (state) {
        case 'listening':
          return '0 0 50px rgba(255, 255, 255, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.6)';
        case 'transcribing':
        case 'thinking':
          return '0 0 45px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.5)';
        case 'executing':
          return '0 0 55px rgba(255, 255, 255, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.6)';
        case 'speaking':
          return '0 0 60px rgba(255, 255, 255, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.7)';
        case 'success':
          return '0 0 50px rgba(255, 255, 255, 0.5), inset 0 0 25px rgba(255, 255, 255, 0.6)';
        case 'error':
        case 'clarification':
          return '0 0 40px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.4)';
        case 'idle':
        default:
          return '0 0 35px rgba(255, 255, 255, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.4)';
      }
    }

    switch (state) {
      case 'listening':
        return '0 0 50px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.7)';
      case 'transcribing':
      case 'thinking':
        return '0 0 50px rgba(245, 158, 11, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.5)';
      case 'executing':
        return '0 0 55px rgba(157, 78, 221, 0.5), inset 0 0 25px rgba(255, 255, 255, 0.5)';
      case 'speaking':
        return '0 0 65px rgba(0, 242, 254, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.7)';
      case 'clarification':
        return '0 0 45px rgba(245, 158, 11, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.5)';
      case 'success':
        return '0 0 50px rgba(16, 185, 129, 0.5), inset 0 0 25px rgba(255, 255, 255, 0.6)';
      case 'error':
        return '0 0 50px rgba(239, 68, 68, 0.5), inset 0 0 25px rgba(255, 255, 255, 0.6)';
      case 'idle':
      default:
        return '0 0 35px rgba(0, 210, 255, 0.3), inset 0 0 25px rgba(255, 255, 255, 0.6)';
    }
  };

  const scaleBoost = state === 'listening' ? 1 + audioLevel * 0.45 : 1;

  return (
    <div className="relative w-56 h-56 flex items-center justify-center my-2">
      {/* Outer Halo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute w-60 h-60 rounded-full border border-dashed border-neutral-700 light:border-neutral-300 pointer-events-none"
      />

      {/* Inner Halo */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute w-44 h-44 rounded-full border border-neutral-600 light:border-neutral-400 pointer-events-none"
      />

      {/* Core Orb */}
      <motion.div
        animate={{
          scale: scaleBoost,
          y: state === 'idle' ? [0, -8, 0] : 0,
          rotate: state === 'executing' ? 360 : 0,
        }}
        transition={{
          y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          rotate: state === 'executing' ? { duration: 2, repeat: Infinity, ease: 'linear' } : { duration: 0.3 },
          scale: { type: 'spring', damping: 15, stiffness: 200 },
        }}
        style={{
          background: getOrbGradient(),
          boxShadow: getGlowShadow(),
        }}
        className="relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-500"
      >
        {/* Organic Flow Layers */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className={`absolute -inset-4 rounded-[40%] ${
            isDark
              ? 'bg-gradient-to-tr from-white to-transparent opacity-20'
              : 'bg-gradient-to-tr from-cyan-400 to-transparent opacity-60'
          } mix-blend-screen`}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className={`absolute -inset-4 rounded-[42%] ${
            isDark
              ? 'bg-gradient-to-br from-neutral-300 to-transparent opacity-20'
              : 'bg-gradient-to-br from-purple-600 to-transparent opacity-60'
          } mix-blend-screen`}
        />

        {/* Light Sheen */}
        <div className="absolute top-2 left-3 w-10 h-6 rounded-full bg-radial from-white/80 to-transparent -rotate-30 pointer-events-none" />
      </motion.div>
    </div>
  );
};
