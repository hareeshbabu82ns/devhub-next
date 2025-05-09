import React from "react";
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

const AudioPlayExtrasBar = ( { className, isSidebar }: AudioPlayExtrasBarProps ) => {
  const { duration, setRate, rate, src } = useAudioPlayerContext();

  // Extract filename from path for cleaner display
  const displayName = src ? src.split( '/' ).pop()?.split( '?' )[ 0 ] : "No track selected";

  // For sidebar mode, show a compact version with icon-only controls
  if ( isSidebar ) {
    return (
      <div className={cn( "flex flex-col items-center gap-2 p-1", className )}>
        <div className="w-full text-center text-xs truncate mb-1 border-b pb-1" aria-live="polite">
          {displayName}
        </div>
        <div className="flex justify-center space-x-2">
          <div className="flex items-center text-xs">
            <FaRunning className="size-3 mr-1" />
            <select
              className="bg-transparent text-xs focus:ring-1 focus:ring-offset-1 w-12"
              value={rate}
              onChange={( e ) => setRate( Number( e.target.value ) )}
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
      {/* Track information with marquee effect */}
      <div
        className="w-full truncate border-b pb-1 mb-1"
        aria-live="polite"
        aria-label="Current track"
      >
        <div className="group w-full">
          <div className="relative text-sm font-medium group-hover:animate-slide overflow-hidden">
            {displayName}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {src}
          </div>
        </div>
      </div>

      {/* Seek bar - only show if duration is available */}
      {duration !== Infinity && (
        <div className="w-full" role="group" aria-label="Playback progress">
          <AudioSeekBar />
        </div>
      )}

      {/* Controls grid - adapt to different screen sizes */}
      <div className="grid w-full gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
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
              name="playbackSpeed"
              id="playback-speed"
              value={rate}
              onChange={( e ) => setRate( Number( e.target.value ) )}
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
};

export default AudioPlayExtrasBar;
