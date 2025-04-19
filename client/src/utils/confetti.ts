import confetti from 'canvas-confetti';

// Enhanced confetti effect with larger explosion and blue colors
export const fireEnhancedConfetti = () => {
  confetti({
    particleCount: 300,
    spread: 120,
    origin: { y: 0.6 },
    startVelocity: 45,
    gravity: 1.2,
    ticks: 400,
    colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF', '#4965EC', '#003399', '#1E3A8A']
  });
};

// Super-sized confetti explosion specifically for modal celebrations
export const fireSuperConfetti = () => {
  // Ensure confetti canvas is positioned correctly
  const canvas = document.querySelector('canvas.confetti-canvas');
  if (canvas) {
    canvas.setAttribute('style', 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 40 !important;');
  }
  
  // First burst - large spread from center
  confetti({
    particleCount: 500,
    spread: 180,
    origin: { y: 0.6 },
    startVelocity: 55,
    gravity: 1.0,
    ticks: 500,
    zIndex: 40, // Set lower z-index to ensure it's behind modal
    colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF', '#4965EC', '#003399', '#1E3A8A', '#101D42', '#172554']
  });
  
  // Second burst - from sides with delay
  setTimeout(() => {
    confetti({
      particleCount: 150,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.7 },
      zIndex: 40, // Set lower z-index to ensure it's behind modal
      colors: ['#00A3FF', '#4965EC', '#0040FF', '#1E3A8A']
    });
    
    confetti({
      particleCount: 150,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.7 },
      zIndex: 40, // Set lower z-index to ensure it's behind modal
      colors: ['#0068FF', '#4965EC', '#003399', '#0059FF']
    });
  }, 200);
};