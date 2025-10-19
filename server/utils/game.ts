/**
 * Pure game utility functions
 * Auto-imported in server context per Nuxt conventions
 */

/**
 * Generate random obstacles on the grid
 */
export const generateObstacles = (gridSize: number): string[] => {
  const obstacles: string[] = []
  const margin = 5
  const minObstacleSpacing = 5

  const isTooCloseToObstacle = (x: number, y: number): boolean => {
    return obstacles.some(obs => {
      const parts = obs.split(',').map(Number)
      const ox = parts[0]
      const oy = parts[1]
      if (ox === undefined || oy === undefined) return false
      const distance = Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2))
      return distance < minObstacleSpacing
    })
  }

  const quadrantSize = Math.floor(gridSize / 2)
  const quadrants = [
    { x: 0, y: 0 },
    { x: quadrantSize, y: 0 },
    { x: 0, y: quadrantSize },
    { x: quadrantSize, y: quadrantSize },
  ]

  quadrants.forEach(quadrant => {
    // Increased from 0.03 (3%) to 0.08 (8%) for more obstacles
    const numObstaclesInQuadrant = Math.floor((quadrantSize * quadrantSize) * 0.08)
    let attempts = 0
    let placedInQuadrant = 0

    while (placedInQuadrant < numObstaclesInQuadrant && attempts < 100) {
      attempts++
      const x = quadrant.x + margin + Math.floor(Math.random() * (quadrantSize - 2 * margin))
      const y = quadrant.y + margin + Math.floor(Math.random() * (quadrantSize - 2 * margin))
      
      if (!isTooCloseToObstacle(x, y)) {
        obstacles.push(`${x},${y}`)
        placedInQuadrant++
      }
    }
  })

  return obstacles
}

/**
 * Get a safe spawn position for a player
 */
export const getSafePosition = (
  gridSize: number,
  players: Array<{ x: number; y: number; trail: string[] }>,
  obstacles: string[]
): { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right' } => {
  const margin = 5
  const maxAttempts = 50

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const x = margin + Math.floor(Math.random() * (gridSize - 2 * margin))
    const y = margin + Math.floor(Math.random() * (gridSize - 2 * margin))
    const pos = `${x},${y}`

    // Check if position is clear
    const isOccupied = players.some(p => 
      (p.x === x && p.y === y) || p.trail.includes(pos)
    ) || obstacles.includes(pos)

    if (!isOccupied) {
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right']
      const direction = directions[Math.floor(Math.random() * directions.length)] as 'up' | 'down' | 'left' | 'right'
      return { x, y, direction }
    }
  }

  return { x: margin, y: margin, direction: 'right' as const }
}

/**
 * Check if color is too similar to existing colors
 */
export const isColorTooSimilar = (color1: string, color2: string): boolean => {
  const getHSL = (color: string) => {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (!match || !match[1] || !match[2] || !match[3]) return null
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3]),
    }
  }

  const hsl1 = getHSL(color1)
  const hsl2 = getHSL(color2)
  if (!hsl1 || !hsl2) return false

  const hueDiff = Math.abs(hsl1.h - hsl2.h)
  const minHueDiff = Math.min(hueDiff, 360 - hueDiff)
  return minHueDiff < 30
}

