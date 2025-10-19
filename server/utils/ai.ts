/**
 * AI logic utilities
 * Auto-imported in server context per Nuxt conventions
 */

import type { GamePlayer } from '../types/game.types';

/**
 * AI logic to determine next move
 */
export const getAIMove = (
  player: GamePlayer,
  context: {
    players: GamePlayer[];
    obstacles: string[];
    settings: { gridSize: number };
    powerUps: Array<{ x: number; y: number }>;
  }
): 'up' | 'down' | 'left' | 'right' => {
  const gridSize = context.settings.gridSize;
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
  
  // Helper to check if a position is safe
  const isSafe = (x: number, y: number, checkDistance: number = 1): boolean => {
    // Check bounds
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
    
    const pos = `${x},${y}`;

    // Check obstacles
    if (context.obstacles.includes(pos)) return false;
    
    // Check all trails
    for (const p of context.players) {
      if (p.trail.includes(pos)) return false;
    }
    
    // Look ahead for additional safety
    if (checkDistance > 1) {
      const lookaheadDirections: Array<{ dx: number; dy: number }> = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
      ];
      
      let safeExits = 0;
      for (const dir of lookaheadDirections) {
        const nextX = x + dir.dx;
        const nextY = y + dir.dy;
        if (nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
          const nextPos = `${nextX},${nextY}`;
          if (!context.obstacles.includes(nextPos) && !context.players.some(p => p.trail.includes(nextPos))) {
            safeExits++;
          }
        }
      }
      
      return safeExits >= 2; // Need at least 2 exits for safety
    }
    
    return true;
  };
  
  // Score each direction
  const scores = directions.map(dir => {
    let x = player.x;
    let y = player.y;
    
    switch (dir) {
      case 'up': y--; break;
      case 'down': y++; break;
      case 'left': x--; break;
      case 'right': x++; break;
    }
    
    let score = 0;
    
    // Immediately unsafe = very negative score
    if (!isSafe(x, y, 1)) {
      return { dir, score: -1000 };
    }
    
    // Look ahead 2-3 steps for better planning
    if (isSafe(x, y, 2)) {
      score += 100;
    }
    
    // Prefer directions toward power-ups if close
    if (context.powerUps.length > 0) {
      const closestPowerUp = context.powerUps[0];
      if (closestPowerUp) {
        const distanceToPowerUp = Math.abs(x - closestPowerUp.x) + Math.abs(y - closestPowerUp.y);
        if (distanceToPowerUp < 10) {
          score += (10 - distanceToPowerUp) * 5;
        }
      }
    }
    
    // Prefer center of the map (more options)
    const centerX = gridSize / 2;
    const centerY = gridSize / 2;
    const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
    score += (gridSize - distanceFromCenter) * 2;
    
    // Avoid going back in the opposite direction unless necessary
    const opposites: Record<string, string> = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    
    if (dir === opposites[player.direction]) {
      score -= 50;
    }
    
    return { dir, score };
  });
  
  // Sort by score and pick the best
  scores.sort((a, b) => b.score - a.score);
  
  // If best move is still negative, we're likely trapped, but try anyway
  const bestMove = scores[0];
  if (!bestMove) return 'right'; // Fallback
  return bestMove.dir;
};

