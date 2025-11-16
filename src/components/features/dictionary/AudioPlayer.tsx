/**
 * AudioPlayer - Inline Audio Playback Component
 * 
 * Phase 9: User Story 5 (US5) - Inline Audio Playback
 * Tasks: T125-T131
 * 
 * Purpose: Enable pronunciation playback directly in search results
 * Features:
 * - Touch-friendly play/pause button (min 44x44px) - T125
 * - Speed selector (0.5x, 1x, 1.5x) - T126
 * - Volume slider - T125
 * - Web Audio API integration - T126
 * - Auto-stop previous audio - T127
 * - ARIA labels - T130
 * - Keyboard controls - T131
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  wordId: string;
  className?: string;
  compact?: boolean; // For inline display in cards
}

// T127: Global audio state management - single audio instance
let currentPlayingAudio: HTMLAudioElement | null = null;
let currentPlayingId: string | null = null;

/**
 * T125-T126: AudioPlayer component with Web Audio API integration
 * T130: ARIA labels for accessibility
 * T131: Keyboard controls
 */
export function AudioPlayer({
  audioUrl,
  wordId,
  className,
  compact = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([100]);
  const [playbackRate, setPlaybackRate] = useState("1");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) {
      setError(true);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // T126: Web Audio API setup for playback speed control
    if (typeof window !== "undefined" && window.AudioContext) {
      try {
        const audioContext = new AudioContext();
        const sourceNode = audioContext.createMediaElementSource(audio);
        const gainNode = audioContext.createGain();

        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        sourceNodeRef.current = sourceNode;
        gainNodeRef.current = gainNode;
      } catch (err) {
        console.error("Failed to initialize Web Audio API:", err);
      }
    }

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (currentPlayingId === wordId) {
        currentPlayingAudio = null;
        currentPlayingId = null;
      }
    };

    const handleError = () => {
      setError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      
      audio.pause();
      audio.src = "";
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl, wordId]);

  // T127: Auto-stop previous audio when new audio plays
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || error) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Stop currently playing audio if different from this one
      if (currentPlayingAudio && currentPlayingId !== wordId) {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
      }

      // Play this audio
      audioRef.current.play().catch((err) => {
        console.error("Failed to play audio:", err);
        setError(true);
      });
      
      setIsPlaying(true);
      currentPlayingAudio = audioRef.current;
      currentPlayingId = wordId;
    }
  }, [isPlaying, error, wordId]);

  // T126: Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = parseFloat(playbackRate);
    }
  }, [playbackRate]);

  // Update volume
  useEffect(() => {
    if (audioRef.current && gainNodeRef.current) {
      const volumeValue = volume[0] / 100;
      audioRef.current.volume = volumeValue;
      gainNodeRef.current.gain.value = volumeValue;
    }
  }, [volume]);

  // T131: Keyboard controls (Space to play/pause, Left/Right arrows to seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this player is focused or playing
      if (!isPlaying && currentPlayingId !== wordId) return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration,
            audioRef.current.currentTime + 5
          );
        }
      }
    };

    if (isPlaying) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isPlaying, wordId, handlePlayPause]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (compact) {
    // T125: Compact mode for inline display in cards (min 44x44px touch target)
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        disabled={error}
        className={cn("h-11 w-11 touch-manipulation", className)}
        aria-label={`${isPlaying ? "Pause" : "Play"} pronunciation audio`} // T130
        aria-disabled={error}
        title={error ? "Audio not available" : undefined}
      >
        {error ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Full player with controls
  return (
    <div
      className={cn("flex items-center gap-2 p-2 rounded-lg border bg-card", className)}
      role="region"
      aria-label="Audio player controls" // T130
    >
      {/* T125: Play/Pause button (min 44x44px) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        disabled={error}
        className="h-11 w-11 touch-manipulation shrink-0"
        aria-label={`${isPlaying ? "Pause" : "Play"} pronunciation audio`} // T130
        aria-disabled={error}
      >
        {error ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Time display and progress */}
      {!error && (
        <div className="flex-1 min-w-0 text-xs text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* T126: Speed selector */}
      <Select value={playbackRate} onValueChange={setPlaybackRate}>
        <SelectTrigger
          className="w-20 h-9"
          aria-label="Playback speed" // T130
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0.5">0.5x</SelectItem>
          <SelectItem value="1">1x</SelectItem>
          <SelectItem value="1.5">1.5x</SelectItem>
        </SelectContent>
      </Select>

      {/* T125: Volume slider */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Volume control" // T130
          >
            {volume[0] === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32" side="top">
          <div className="space-y-2">
            <label className="text-xs font-medium" id="volume-label">
              Volume
            </label>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              aria-labelledby="volume-label" // T130
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Screen reader live region for playback state - T130 */}
      <div className="sr-only" role="status" aria-live="polite">
        {isPlaying ? "Playing" : "Paused"} at {playbackRate}x speed
      </div>
    </div>
  );
}

export default AudioPlayer;