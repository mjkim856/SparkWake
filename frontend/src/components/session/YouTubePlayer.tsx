'use client'

interface YouTubePlayerProps {
  videoId: string
  className?: string
  onClose?: () => void
}

/**
 * Renders a responsive YouTube iframe with an optional overlay close button.
 *
 * @param videoId - YouTube video identifier inserted into the embed URL
 * @param className - Additional container CSS classes
 * @param onClose - Optional callback invoked when the close button is clicked
 * @returns The rendered player element containing the iframe (and close button when `onClose` is provided)
 */
export function YouTubePlayer({ videoId, className, onClose }: YouTubePlayerProps) {
  return (
    <div className={`relative ${className || ''}`}>
      {/* 닫기 버튼 */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          aria-label="영상 닫기"
        >
          <span className="material-icons text-sm">close</span>
        </button>
      )}
      
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        className="w-full h-full rounded-xl"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video player"
      />
    </div>
  )
}

/**
 * Extracts the YouTube video ID from a URL or direct ID string.
 *
 * @param url - A YouTube URL (e.g., watch, short, or embed formats) or a direct 11-character video ID
 * @returns The 11-character YouTube video ID when found, `null` otherwise
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,  // 직접 videoId인 경우
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}
