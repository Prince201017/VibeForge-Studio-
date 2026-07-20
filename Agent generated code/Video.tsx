/**
 * [ForgeOS UI] Video
 * HTML5 video player with a custom control bar (play/pause, seek,
 * volume, fullscreen) so styling stays consistent with the rest of
 * the dark-theme editor UI instead of relying on native browser chrome.
 */
import React, { useRef, useState } from "react";
import { cn } from "../utils/classNames";

export interface VideoProps {
  src: string;
  poster?: string;
  className?: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const Video: React.FC<VideoProps> = ({ src, poster, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play();
    setPlaying(!playing);
  };

  const seek = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setProgress(value);
  };

  const toggleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={containerRef} className={cn("relative rounded-lg overflow-hidden bg-black group", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onClick={togglePlay}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="w-full h-full cursor-pointer"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="range-thumb w-full h-1 accent-indigo-500"
        />
        <div className="flex items-center gap-3">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="text-white hover:text-indigo-300">
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
            )}
          </button>
          <span className="text-xs text-white/80 tabular-nums">{formatTime(progress)} / {formatTime(duration)}</span>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (videoRef.current) videoRef.current.volume = v;
            }}
            className="range-thumb w-16 h-1 accent-indigo-500 ml-auto"
          />
          <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className="text-white hover:text-indigo-300">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

Video.displayName = "Video";
