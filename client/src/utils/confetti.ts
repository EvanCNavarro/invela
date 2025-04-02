import confetti from 'canvas-confetti';

// Enhanced confetti effect with larger explosion and more colors
export const fireEnhancedConfetti = () => {
  confetti({
    particleCount: 300,
    spread: 120,
    origin: { y: 0.6 },
    startVelocity: 45,
    gravity: 1.2,
    ticks: 400,
    colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF', '#4965EC', '#5CFF5C', '#FFC300']
  });
};

// Super-sized confetti explosion specifically for modal celebrations
export const fireSuperConfetti = () => {
  // First burst - large spread from center
  confetti({
    particleCount: 500,
    spread: 180,
    origin: { y: 0.6 },
    startVelocity: 55,
    gravity: 1.0,
    ticks: 500,
    colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF', '#4965EC', '#5CFF5C', '#FFC300', '#FF5C5C', '#FFEC49']
  });
  
  // Second burst - from sides with delay
  setTimeout(() => {
    confetti({
      particleCount: 150,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.7 },
      colors: ['#00A3FF', '#4965EC', '#5CFF5C', '#FFC300']
    });
    
    confetti({
      particleCount: 150,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.7 },
      colors: ['#0068FF', '#4965EC', '#FF5C5C', '#FFEC49']
    });
  }, 200);
};