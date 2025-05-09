import { cn } from "@/lib/utils";
import React, { ChangeEvent, useCallback, useState, useRef, useEffect } from "react";
import { MdVolumeDown, MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { useAudioPlayerContext } from "react-use-audio-player";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";

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

  // Store volume in localStorage for persistence
  // useEffect( () => {
  //   // Load saved volume on mount
  //   const savedVolume = localStorage.getItem( 'audioPlayerVolume' );
  //   if ( savedVolume !== null ) {
  //     const parsedVolume = parseFloat( savedVolume );
  //     if ( !isNaN( parsedVolume ) && parsedVolume >= 0 && parsedVolume <= 1 ) {
  //       setVolume( parsedVolume );
  //     }
  //   }
  // }, [ setVolume ] );

  // Save volume changes to localStorage
  // useEffect( () => {
  //   localStorage.setItem( 'audioPlayerVolume', volume.toString() );
  // }, [ volume ] );

  // Handle volume change with debounced updates
  const handleChange = useCallback(
    ( slider: ChangeEvent<HTMLInputElement> ) => {
      const volValue = parseFloat( ( Number( slider.target.value ) / 100 ).toFixed( 2 ) );
      setVolume( volValue );
    },
    [ setVolume ],
  );

  // Handle keyboard controls for volume adjustment
  const handleKeyDown = useCallback(
    ( e: React.KeyboardEvent<HTMLInputElement> ) => {
      let newVolume = volume;

      switch ( e.key ) {
        case 'ArrowUp':
        case 'ArrowRight':
          newVolume = Math.min( 1, volume + 0.05 );
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          newVolume = Math.max( 0, volume - 0.05 );
          e.preventDefault();
          break;
        case 'Home':
          newVolume = 0;
          e.preventDefault();
          break;
        case 'End':
          newVolume = 1;
          e.preventDefault();
          break;
        case 'm':
          // 'm' key toggles mute
          toggleMute();
          e.preventDefault();
          break;
      }

      if ( newVolume !== volume ) {
        setVolume( newVolume );
      }
    },
    [ volume, setVolume ]
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
              <input
                type="range"
                min={0}
                max={100}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                value={volume * 100}
                className="flex-1"
                aria-label="Volume control"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round( volume * 100 )}
                aria-valuetext={`Volume ${Math.round( volume * 100 )}%`}
                ref={volumeRef}
              />
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
      <input
        type="range"
        min={0}
        max={100}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        value={volume * 100}
        className="flex-1"
        aria-label="Volume control"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round( volume * 100 )}
        aria-valuetext={`Volume ${Math.round( volume * 100 )}%`}
        ref={volumeRef}
      />
    </div>
  );
} );

AudioVolumeControl.displayName = "AudioVolumeControl";

export default AudioVolumeControl;
