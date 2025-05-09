import React, { useCallback } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import AudioSeekBar from "./AudioSeekBar";
import AudioTimeLabel from "./AudioTimeLabel";
import AudioVolumeControl from "./AudioVolumeControl";
import { FaRunning } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface AudioPlayExtrasBarProps {
  className?: string;
  isSidebar?: boolean;
}

/**
 * Component that provides additional audio controls like seek bar,
 * time display, volume, and playback speed
 */
const AudioPlayExtrasBar = React.memo( ( { className, isSidebar }: AudioPlayExtrasBarProps ) => {
  const { setRate, rate, src } = useAudioPlayerContext();

  // Optimize rate change handler
  const handleRateChange = useCallback( ( e: React.ChangeEvent<HTMLSelectElement> ) => {
    setRate( Number( e.target.value ) );
  }, [ setRate ] );

  // Extract filename from path for cleaner display
  const displayName = src
    ? src.split( '/' ).pop()?.split( '?' )[ 0 ] || "Unknown track"
    : "No track selected";

  // For sidebar mode, show a compact version with icon-only controls
  if ( isSidebar ) {
    return (
      <div className={cn( "flex flex-col items-center gap-2 p-1", className )}>
        <div className="w-full text-center text-xs truncate mb-1 border-b pb-1" aria-live="polite">
          {displayName}
        </div>
        <div className="flex justify-center space-x-2 items-center w-full">
          <div className="flex items-center text-xs">
            <FaRunning className="size-3 mr-1" aria-hidden="true" />
            <select
              className="bg-transparent text-xs focus:ring-1 focus:ring-offset-1 w-14"
              value={rate}
              onChange={handleRateChange}
              aria-label="Playback speed"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
          <AudioVolumeControl iconOnly />
        </div>
      </div>
    );
  }

  // Standard mode with full controls
  return (
    <div className={cn( "flex flex-col flex-1 items-start gap-2", className )}>
      {/* Track information with marquee effect for long titles */}
      <div
        className="flex flex-1 border-b pb-4 mb-1"
        aria-live="polite"
        aria-label="Current track"
      >
        <div className="group flex-1">
          <div className="relative text-sm font-medium group-hover:animate-marquee overflow-hidden whitespace-nowrap">
            {displayName}
          </div>
          {src && (
            <div className="text-xs text-muted-foreground line-clamp-1 overflow-ellipsis mt-0.5">
              {src}
            </div>
          )}
        </div>
      </div>

      {/* Seek bar */}
      <div className="flex" role="group" aria-label="Playback progress">
        <AudioSeekBar />
      </div>

      {/* Controls grid - adapt to different screen sizes */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        {/* Time display */}
        <div className="col-span-2" role="timer" aria-label="Playback time">
          <AudioTimeLabel />
        </div>

        {/* Playback speed control */}
        <div className="flex flex-row gap-2 items-center col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5">
            <label htmlFor="playback-speed" className="sr-only">
              Playback Speed
            </label>
            <FaRunning className="size-4 text-muted-foreground" aria-hidden="true" />
            <select
              className="w-full rounded-sm text-xs bg-background focus:ring-2 focus:ring-offset-1"
              id="playback-speed"
              value={rate}
              onChange={handleRateChange}
              aria-label="Playback speed"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>

        {/* Volume control */}
        <div className="col-span-2 md:col-span-3" aria-label="Volume control">
          <AudioVolumeControl />
        </div>
      </div>
    </div>
  );
} );

AudioPlayExtrasBar.displayName = "AudioPlayExtrasBar";

export default AudioPlayExtrasBar;
