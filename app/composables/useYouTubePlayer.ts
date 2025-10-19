// YouTube player composable

interface YouTubePlayer {
  playVideo: () => void
  pauseVideo: () => void
  setVolume: (volume: number) => void
}

interface YouTubeEvent {
  target: YouTubePlayer
  data: number
}

export function useYouTubePlayer() {
  const youtubePlayer = ref<YouTubePlayer | null>(null)
  const isYoutubePlaying = ref(false)
  
  const toggleYoutube = () => {
    if (!youtubePlayer.value) return
    
    if (isYoutubePlaying.value) {
      youtubePlayer.value.pauseVideo()
    } else {
      youtubePlayer.value.playVideo()
    }
  }
  
  const initializeYouTube = () => {
    if (!import.meta.client) return
    
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    if (firstScriptTag?.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    (window as { onYouTubeIframeAPIReady?: () => void; YT?: { Player: new (id: string, config: unknown) => YouTubePlayer } }).onYouTubeIframeAPIReady = () => {
      const YT = (window as { YT?: { Player: new (id: string, config: unknown) => YouTubePlayer } }).YT
      if (!YT) return
      
      youtubePlayer.value = new YT.Player('youtubePlayer', {
        videoId: 'TAutddyBrOg',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          loop: 1,
          playlist: 'TAutddyBrOg',
          start: 20
        },
        events: {
          onReady: (event: YouTubeEvent) => {
            event.target.setVolume(30)
          },
          onStateChange: (event: YouTubeEvent) => {
            isYoutubePlaying.value = event.data === 1
          }
        }
      })
    }
  }
  
  onMounted(() => {
    initializeYouTube()
  })
  
  onUnmounted(() => {
    if (youtubePlayer.value) {
      youtubePlayer.value.pauseVideo()
    }
  })
  
  return {
    youtubePlayer: readonly(youtubePlayer),
    isYoutubePlaying: readonly(isYoutubePlaying),
    toggleYoutube,
  }
}

