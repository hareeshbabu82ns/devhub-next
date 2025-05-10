import React, { useCallback } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import AudioSeekBar from "./AudioSeekBar";
import AudioTimeLabel from "./AudioTimeLabel";
import AudioVolumeControl from "./AudioVolumeControl";
import { FaRunning } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";

interface AudioPlayExtrasBarProps {
  className?: string;
  isSidebar?: boolean;
  hideSongName?: boolean;
}

/**
 * Component that provides additional audio controls like seek bar,
 * time display, volume, and playback speed
 */
const AudioPlayExtrasBar = React.memo( ( { className, isSidebar, hideSongName }: AudioPlayExtrasBarProps ) => {
  const { setRate, rate, src } = useAudioPlayerContext();

  // Optimize rate change handler
  const handleRateChange = useCallback( ( range: number ) => {
    setRate( range );
  }, [ setRate ] );
  // const handleRateChange = useCallback( ( e: React.ChangeEvent<HTMLSelectElement> ) => {
  //   setRate( Number( e.target.value ) );
  // }, [ setRate ] );

  // Extract filename from path for cleaner display
  const displayName = src
    ? src.split( '/' ).pop()?.split( '?' )[ 0 ] || "Unknown track"
    : "No track selected";

  // For sidebar mode, show a compact version with icon-only controls
  if ( isSidebar ) {
    return (
      <div className={cn( "flex flex-col items-stretch gap-2 p-1", className )}>
        <div className={cn( "w-full text-center text-xs truncate", { "hidden": hideSongName } )} aria-live="polite">
          {displayName}
        </div>
        <Separator className={hideSongName ? "hidden" : ""} />
        <div className="flex justify-between space-x-2 items-center w-full">
          {/* <div className="flex items-center text-xs">
            <FaRunning className="size-3 mr-1" aria-hidden="true" />
            <select
              className="bg-transparent text-xs focus:ring-1 focus:ring-offset-1 w-14"
              value={rate}
              onChange={( e ) => handleRateChange( Number( e.target.value ) )}
              aria-label="Playback speed"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div> */}
          {/* Playback speed control */}
          <div className="flex flex-row gap-3 items-center">
            <FaRunning className="size-3 text-muted-foreground" />
            <Slider value={[ rate ]}
              onValueChange={( r ) => handleRateChange( r[ 0 ] )}
              min={0.5}
              max={2}
              step={0.25}
              defaultValue={[ 1 ]}
              className="flex-1 w-18"
              aria-label="Playback speed" />
            <p className="text-xs text-muted-foreground">{rate}x</p>
          </div>
          <AudioVolumeControl iconOnly />
        </div>
      </div>
    );
  }

  // Standard mode with full controls
  return (
    <div className={cn( "flex flex-col flex-1 items-stretch gap-2", className )}>
      {/* Track information with marquee effect for long titles */}
      {hideSongName ? null : <div
        className="flex flex-1 border-b mb-1"
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
      </div>}

      {/* Seek bar */}
      <div className="flex" role="group" aria-label="Playback progress">
        <AudioSeekBar />
      </div>

      {/* Controls grid - adapt to different screen sizes */}
      <div className="flex-1 flex flex-row items-center justify-around">

        {/* Playback speed control */}
        <div className="flex flex-row gap-3 items-center">
          <FaRunning className="size-4 text-muted-foreground" />
          <Slider value={[ rate ]}
            onValueChange={( r ) => handleRateChange( r[ 0 ] )}
            min={0.5}
            max={2}
            step={0.25}
            defaultValue={[ 1 ]}
            className="w-28"
            aria-label="Playback speed" />
          <p className="text-sm text-muted-foreground">{rate}x</p>
        </div>

        {/* Volume control */}
        <div className="col-span-2 md:col-span-3" aria-label="Volume control">
          <AudioVolumeControl />
        </div>

        {/* Time display */}
        <div className="col-span-2 text-center" role="timer" aria-label="Playback time">
          <AudioTimeLabel />
        </div>
      </div>
    </div>
  );
} );

AudioPlayExtrasBar.displayName = "AudioPlayExtrasBar";

export default AudioPlayExtrasBar;
