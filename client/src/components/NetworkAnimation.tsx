import { motion } from "framer-motion";

export function NetworkAnimation() {
  return (
    <svg 
      viewBox="0 0 400 400" 
      className="w-full h-full"
      style={{ filter: 'drop-shadow(0px 2px 8px rgba(255,255,255,0.1))' }}
    >
      <defs>
        <linearGradient id="grid-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
      </defs>
      
      {/* Grid Background */}
      <motion.rect
        x="50"
        y="50"
        width="300"
        height="300"
        fill="url(#grid-gradient)"
        rx="8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Animated Nodes */}
      {[...Array(6)].map((_, i) => (
        <motion.circle
          key={i}
          cx={100 + (i % 3) * 100}
          cy={100 + Math.floor(i / 3) * 100}
          r="8"
          fill="white"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ 
            duration: 0.5,
            delay: i * 0.15,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 2
          }}
        />
      ))}

      {/* Connecting Lines */}
      {[...Array(7)].map((_, i) => (
        <motion.line
          key={`line-${i}`}
          x1={100 + (i % 3) * 100}
          y1={100 + Math.floor(i / 3) * 100}
          x2={100 + ((i + 1) % 3) * 100}
          y2={100 + Math.floor((i + 1) / 3) * 100}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ 
            duration: 1.5,
            delay: i * 0.2,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 1
          }}
        />
      ))}
    </svg>
  );
}
