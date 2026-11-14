import React from 'react';
import { motion } from 'framer-motion';
import type { AssistantState } from '../types';

interface OrbProps {
  state: AssistantState;
  audioLevel: number;
}

export const Orb: React.FC<OrbProps> = ({ state, audioLevel }) => {
  const getOrbGradient = () => {
    switch (state) {
      case 'listening':
        return 'radial-gradient(circle at 35% 35%, #f87171, #dc2626 40%, #000 80%)';
      case 'transcribing':
      case 'thinking':
        return 'radial-gradient(circle at 35% 35%, #fbbf24, #d97706 40%, #000 80%)';
      case 'executing':
        return 'radial-gradient(circle at 35% 35%, #c77dff, #7b2cbf 40%, #000 80%)';
      case 'speaking':
        return 'radial-gradient(circle at 35% 35%, #00f2fe, #2563eb 40%, #000 80%)';
      case 'clarification':
        return 'radial-gradient(circle at 35% 35%, #fcd34d, #b45309 40%, #000 80%)';
      case 'success':
        return 'radial-gradient(circle at 35% 35%, #34d399, #059669 40%, #000 80%)';
      case 'error':
        return 'radial-gradient(circle at 35% 35%, #fca5a5, #b91c1c 40%, #000 80%)';
      case 'idle':
      default:
        return 'radial-gradient(circle at 35% 35%, #00f2fe, #4facfe 35%, #000 80%)';
    }
  };

  const getGlowShadow = () => {
    switch (state) {
      case 'listening':
        return '0 0 50px rgba(239, 68, 68, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.7)';
      case 'transcribing':
      case 'thinking':
        return '0 0 50px rgba(245, 158, 11, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.5)';
      case 'executing':
        return '0 0 55px rgba(157, 78, 221, 0.7), inset 0 0 25px rgba(255, 255, 255, 0.5)';
      case 'speaking':
        return '0 0 65px rgba(0, 242, 254, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.7)';
      case 'clarification':
        return '0 0 45px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.5)';
      case 'success':
        return '0 0 50px rgba(16, 185, 129, 0.7), inset 0 0 25px rgba(255, 255, 255, 0.6)';
      case 'error':
        return '0 0 50px rgba(239, 68, 68, 0.7), inset 0 0 25px rgba(255, 255, 255, 0.6)';
      case 'idle':
      default:
        return '0 0 40px rgba(0, 210, 255, 0.4), 0 0 80px rgba(121, 40, 202, 0.3), inset 0 0 25px rgba(255, 255, 255, 0.6)';
    }
  };

  const scaleBoost = state === 'listening' ? 1 + audioLevel * 0.45 : 1;

  return (
    <div className="relative w-56 h-56 flex items-center justify-center my-2">
      {/* Outer Halo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute w-60 h-60 rounded-full border border-dashed border-violet-500/20 pointer-events-none"
      />

      {/* Inner Halo */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute w-44 h-44 rounded-full border border-cyan-400/25 shadow-[0_0_20px_rgba(0,210,255,0.15)] pointer-events-none"
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
          className="absolute -inset-4 rounded-[40%] bg-gradient-to-tr from-cyan-400 to-transparent opacity-60 mix-blend-screen"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-4 rounded-[42%] bg-gradient-to-br from-purple-600 to-transparent opacity-60 mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-radial from-cyan-400/40 to-transparent"
        />

        {/* Light Sheen */}
        <div className="absolute top-2 left-3 w-10 h-6 rounded-full bg-radial from-white/80 to-transparent -rotate-30 pointer-events-none" />
      </motion.div>
    </div>
  );
};
