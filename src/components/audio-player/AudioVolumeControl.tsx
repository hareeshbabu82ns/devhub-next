import { cn } from "@/lib/utils";
import React, { ChangeEvent, useCallback, useState } from "react";
import { MdVolumeDown, MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { useAudioPlayerContext } from "react-use-audio-player";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";

interface AudioVolumeControlProps {
  className?: string;
  iconOnly?: boolean;
}

const AudioVolumeControl = ( { className, iconOnly }: AudioVolumeControlProps ) => {
  const { setVolume, volume } = useAudioPlayerContext();
  const [ previousVolume, setPreviousVolume ] = useState<number>( 1 );

  const handleChange = useCallback(
    ( slider: ChangeEvent<HTMLInputElement> ) => {
      const volValue = parseFloat(
        ( Number( slider.target.value ) / 100 ).toFixed( 2 ),
      );
      return setVolume( volValue );
    },
    [ setVolume ],
  );

  const toggleMute = useCallback( () => {
    if ( volume > 0 ) {
      setPreviousVolume( volume );
      setVolume( 0 );
    } else {
      setVolume( previousVolume );
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
          >
            <VolumeIcon className="size-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="center">
          <div className="flex flex-col gap-2 p-2">
            <p className="text-sm text-center">Volume: {Math.round( volume * 100 )}%</p>
            <div className="flex gap-2 items-center">
              <MdVolumeDown className="size-4" />
              <input
                type="range"
                min={0}
                max={100}
                onChange={handleChange}
                value={volume * 100}
                className="flex-1"
              />
              <MdVolumeUp className="size-4" />
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
        value={volume * 100}
        className="flex-1"
        aria-label="Volume control"
      />
    </div>
  );
};

export default AudioVolumeControl;
