import { cn } from "@/lib/utils";
import React, { useCallback, useState, useRef } from "react";
import { MdVolumeDown, MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { useAudioPlayerContext } from "react-use-audio-player";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { useLocalStorage } from "usehooks-ts";
import { LS_AUDIO_PLAYER_VOLUME } from "@/lib/constants";

interface AudioVolumeControlProps {
  className?: string;
  iconOnly?: boolean;
}

/**
 * Volume control component with mute toggle and volume slider
 * Supports compact icon-only mode for smaller layouts
 */
const AudioVolumeControl = React.memo( ( { className, iconOnly = false }: AudioVolumeControlProps ) => {
  const { setVolume, volume } = useAudioPlayerContext();
  const [ previousVolume, setPreviousVolume ] = useState<number>( 1 );
  const volumeRef = useRef<HTMLInputElement>( null );
  const [ , setSavedVolume ] = useLocalStorage<number>( LS_AUDIO_PLAYER_VOLUME, 1 );

  // Handle volume change with debounced updates
  const handleChange = useCallback(
    ( volume: number ) => {
      setSavedVolume( volume );
      setVolume( volume );
    },
    [ setVolume, setSavedVolume ],
  );

  // Toggle mute/unmute
  const toggleMute = useCallback( () => {
    if ( volume > 0 ) {
      setPreviousVolume( volume );
      setVolume( 0 );
    } else {
      setVolume( previousVolume || 0.5 ); // Default to 50% if no previous volume
    }
  }, [ volume, previousVolume, setVolume ] );

  // Get appropriate volume icon based on current level
  const VolumeIcon = volume === 0 ? MdVolumeOff : volume < 0.5 ? MdVolumeDown : MdVolumeUp;

  // For icon-only mode (sidebar)
  if ( iconOnly ) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={volume === 0 ? "Unmute" : "Mute or adjust volume"}
          >
            <VolumeIcon className="size-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="center">
          <div className="flex flex-col gap-2 p-2">
            <p className="text-sm text-center">Volume: {Math.round( volume * 100 )}%</p>
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                onClick={toggleMute}
              >
                <VolumeIcon className="size-4" />
              </Button>
              <Slider value={[ volume * 100 ]}
                onValueChange={( r ) => handleChange( r[ 0 ] / 100 )}
                min={0}
                max={100}
                className="flex-1 w-22"
                aria-label="Volume control"
                ref={volumeRef} />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full slider mode (default)
  return (
    <div className={cn( "flex gap-2 items-center", className )}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        aria-label={volume === 0 ? "Unmute" : "Mute"}
        onClick={toggleMute}
      >
        <VolumeIcon className="size-4" />
      </Button>
      <Slider value={[ volume * 100 ]}
        onValueChange={( r ) => handleChange( r[ 0 ] / 100 )}
        min={0}
        max={100}
        className="flex-1 w-22"
        aria-label="Volume control"
        ref={volumeRef} />
    </div>
  );
} );

AudioVolumeControl.displayName = "AudioVolumeControl";

export default AudioVolumeControl;
