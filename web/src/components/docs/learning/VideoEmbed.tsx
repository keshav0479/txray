"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ExternalLink, Video } from "lucide-react";

interface VideoEmbedProps {
  /** YouTube video ID or full URL */
  src: string;
  title: string;
  description?: string;
  /** Aspect ratio - default is 16/9 */
  aspectRatio?: "16/9" | "4/3" | "1/1";
  /** Show a poster/thumbnail before playing */
  poster?: string;
  /** Start time in seconds */
  startTime?: number;
}

function extractYouTubeId(src: string): string | null {
  // If it's already an ID (no slashes or dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(src)) {
    return src;
  }

  // Try to extract from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function VideoEmbed({
  src,
  title,
  description,
  aspectRatio = "16/9",
  poster,
  startTime,
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const videoId = extractYouTubeId(src);
  const thumbnailUrl = poster || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);
  
  const aspectRatioClass = {
    "16/9": "aspect-video",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
  }[aspectRatio];

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${startTime ? `&start=${startTime}` : ""}`
    : src;

  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : src;

  return (
    <div className="my-8 rounded-2xl border border-[var(--docs-panel-border)] bg-[var(--docs-panel)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--docs-panel-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Video className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[var(--docs-text)]">{title}</h4>
            {description && (
              <p className="text-sm text-[var(--docs-muted)] mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--docs-panel-border)] text-[var(--docs-muted)] text-sm hover:text-[var(--docs-text)] hover:bg-[var(--docs-panel-hover)] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      </div>

      {/* Video */}
      <div className={`relative ${aspectRatioClass} bg-black`}>
        {!isPlaying ? (
          // Thumbnail with play button
          <div className="absolute inset-0">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to hqdefault if maxresdefault fails
                  const target = e.target as HTMLImageElement;
                  if (videoId && target.src.includes("maxresdefault")) {
                    target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }
                }}
              />
            )}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Play button */}
            <motion.button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl group-hover:bg-red-500 transition-colors"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
              </motion.div>
            </motion.button>

            {/* Duration badge (placeholder) */}
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
              Video
            </div>
          </div>
        ) : (
          // Embedded iframe
          <>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--docs-bg)]">
                <motion.div
                  className="w-8 h-8 border-2 border-[var(--docs-accent)] border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              onLoad={() => setIsLoaded(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
