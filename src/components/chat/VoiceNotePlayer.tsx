/**
 * WhatsApp-Style Voice Note Audio Player
 * UI Spec: [ Play/Pause Button ] [ Audio Waveform / Scrubber Progress Bar ] [ Speed Pill (1x/1.5x/2x) ] [ Duration (e.g. 0:04) ]
 * Robust user voice playback with full format compatibility and Web Audio fallback for raw streams.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, AlertCircle } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  isMe?: boolean;
  senderName?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  durationSeconds = 4,
  isMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds || 4);
  const [hasError, setHasError] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Waveform bars frequency heights
  const waveHeights = [35, 55, 80, 60, 95, 75, 45, 90, 75, 55, 100, 70, 60, 85, 45, 65, 40, 60];

  useEffect(() => {
    setHasError(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    if (!audioUrl) return;

    // Clean up previous blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'auto';

    (audio as any).preservesPitch = true;
    (audio as any).mozPreservesPitch = true;
    (audio as any).webkitPreservesPitch = true;

    // Handle base64 data URI, blob URL, or standard web URL
    let resolvedSrc = audioUrl;
    if (audioUrl.startsWith('data:audio')) {
      try {
        // Convert base64 data URL to an Object URL for cleaner cross-browser playback
        const parts = audioUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
        const byteString = atob(parts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mimeType });
        resolvedSrc = URL.createObjectURL(blob);
        blobUrlRef.current = resolvedSrc;
      } catch (e) {
        resolvedSrc = audioUrl;
      }
    }

    if (resolvedSrc.startsWith('http') || resolvedSrc.startsWith('blob:') || resolvedSrc.startsWith('data:')) {
      audio.src = resolvedSrc;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        const curr = audio.currentTime;
        const dur = (audio.duration && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (duration || durationSeconds || 4);
        setCurrentTime(curr);
        setProgress(dur > 0 ? Math.min(100, (curr / dur) * 100) : 0);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
      };

      audio.onerror = () => {
        // Silently handle format warnings without bubbling unhandled DOM error events
        setHasError(true);
        setIsPlaying(false);
      };
    }

    return () => {
      audio.pause();
      audio.src = '';
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [audioUrl, durationSeconds]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      (audioRef.current as any).preservesPitch = true;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Audio playback notice:', err?.message || err);
          setIsPlaying(false);
        });
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
      (audioRef.current as any).preservesPitch = true;
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setProgress(val);
    const dur = (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) ? audioRef.current.duration : (duration || 4);
    const targetTime = (val / 100) * dur;
    setCurrentTime(targetTime);

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newPercent = Math.max(0, Math.min(100, (clickX / width) * 100));
    setProgress(newPercent);
    const dur = (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) ? audioRef.current.duration : (duration || 4);
    const targetTime = (newPercent / 100) * dur;
    setCurrentTime(targetTime);

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const formatTime = (secs: number) => {
    const total = Math.max(0, Math.floor(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="voice-note-bubble-container"
      className={`p-2.5 rounded-2xl transition flex flex-col gap-1.5 shadow-md select-none w-full max-w-[280px] sm:max-w-[310px] min-w-0 ${
        isMe
          ? 'bg-[#005c4b] border border-emerald-500/40 text-white'
          : 'bg-[#202c33] border border-slate-700/70 text-slate-100'
      }`}
    >
      {/* Complete Voice Note Bubble UI: [ Play/Pause Button ] [ Audio Waveform / Scrubber Progress Bar ] [ Speed Pill (1x/1.5x/2x) ] [ Duration (e.g. 0:04) ] */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 1. Interactive Play/Pause Button */}
        <button
          type="button"
          id="btn-play-pause-voice-note"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition transform active:scale-95 shadow-md cursor-pointer shrink-0 ${
            isPlaying
              ? 'bg-emerald-400 hover:bg-emerald-300 ring-2 ring-emerald-200/60'
              : 'bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-400/50'
          }`}
          title={isPlaying ? 'Pause' : 'Play Recorded Voice Note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current text-slate-900" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* 2. Audio Waveform & Scrubber Progress Bar */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-[90px] sm:min-w-[110px]">
          {/* Visual Interactive Waveform */}
          <div
            id="waveform-bars-scrubber"
            onClick={handleWaveformClick}
            className="h-5 sm:h-6 flex items-center gap-[2px] cursor-pointer group py-0.5"
            title="Click waveform to seek"
          >
            {waveHeights.map((h, i) => {
              const barPercent = (i / waveHeights.length) * 100;
              const isPast = progress >= barPercent;

              return (
                <div
                  key={i}
                  className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-100 ${
                    isPast
                      ? isMe
                        ? 'bg-emerald-200'
                        : 'bg-emerald-400'
                      : isMe
                      ? 'bg-emerald-800/70 group-hover:bg-emerald-700'
                      : 'bg-slate-600 group-hover:bg-slate-500'
                  }`}
                  style={{
                    height: `${isPlaying ? Math.max(25, (h * (0.7 + Math.sin(currentTime * 6 + i) * 0.3))) : h}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Functional Range Slider / Scrubber */}
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={handleSliderChange}
            className="w-full h-1 bg-black/40 rounded-full appearance-none cursor-pointer accent-emerald-400 focus:outline-hidden"
            title="Audio Scrubber"
          />
        </div>

        {/* 3. Playback Speed Controller Pill (1x -> 1.5x -> 2x -> 1x) with preserved natural pitch */}
        <button
          type="button"
          id="btn-voice-playback-speed"
          onClick={toggleSpeed}
          className="px-1.5 sm:px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-[10px] font-mono font-extrabold text-emerald-300 border border-emerald-500/30 transition transform active:scale-95 shrink-0 cursor-pointer shadow-xs"
          title="Change Playback Speed (1x, 1.5x, 2x)"
        >
          {speed}x
        </button>

        {/* 4. Duration Stamp (e.g. 0:04 or 0:02 / 0:04) */}
        <span
          id="voice-note-duration-stamp"
          className="text-[10px] sm:text-[11px] font-mono font-medium text-emerald-200/90 shrink-0 min-w-[30px] text-right"
        >
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>

      {/* Micro Status Footnote */}
      <div className="flex items-center justify-between text-[9px] text-slate-300/80 px-1 pt-0.5">
        <span className="flex items-center gap-1">
          {hasError ? (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Voice file unavailable</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-emerald-400" />
              <span>{isPlaying ? 'Playing Voice Note' : 'Voice Message'}</span>
            </span>
          )}
        </span>
        <span className="font-mono text-emerald-300/80">
          Total: {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
