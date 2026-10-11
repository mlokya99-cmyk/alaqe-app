import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatDuration } from '../utils/uyghur';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOutgoing?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, duration = 0, isOutgoing }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const currentDisplayTime = isPlaying ? currentTime : duration;

  return (
    <div className="flex items-center gap-3 py-1 px-2 select-none min-w-[200px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm ${
          isOutgoing
            ? 'bg-white text-telegram-primary hover:bg-gray-100'
            : 'bg-telegram-blue text-white hover:bg-telegram-blue-hover'
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-[2.5px] h-6">
          {[12, 20, 16, 24, 8, 18, 22, 14, 28, 10, 16, 22, 18, 12, 24, 16, 20, 14, 10, 18].map((h, idx) => {
            const progress = (idx / 20);
            const totalDuration = duration || (audioRef.current?.duration || 1);
            const playedRatio = currentTime / totalDuration;
            const isPlayed = playedRatio > progress;

            return (
              <div
                key={idx}
                style={{ height: `${h}px` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isPlayed
                    ? isOutgoing ? 'bg-white' : 'bg-telegram-blue'
                    : isOutgoing ? 'bg-white/40' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            );
          })}
        </div>

        {/* Time duration */}
        <div className={`text-[11px] font-mono leading-none ${isOutgoing ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
          {formatDuration(currentDisplayTime)}
        </div>
      </div>
    </div>
  );
};
