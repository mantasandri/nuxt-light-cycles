export const useGameAudio = () => {
  let gameOverAudio: HTMLAudioElement | null = null

  const playGameOverSound = () => {
    try {
      // Create audio element if it doesn't exist
      if (!gameOverAudio) {
        gameOverAudio = new Audio('/audio/endofline.mp3')
        gameOverAudio.volume = 0.7
      }

      // Reset and play
      gameOverAudio.currentTime = 0
      gameOverAudio.play().catch((error) => {
        console.error('[Audio] Failed to play game over sound:', error)
      })
    } catch (error) {
      console.error('[Audio] Error initializing game over sound:', error)
    }
  }

  const stopGameOverSound = () => {
    if (gameOverAudio) {
      gameOverAudio.pause()
      gameOverAudio.currentTime = 0
    }
  }

  return {
    playGameOverSound,
    stopGameOverSound,
  }
}

