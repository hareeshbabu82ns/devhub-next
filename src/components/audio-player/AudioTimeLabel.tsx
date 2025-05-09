import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { formatTime } from "./AudioSeekBar";

interface AudioTimeLabelProps {
  className?: string;
}

/**
 * Component that displays the current time and duration of audio playback
 * with optimized updates to prevent unnecessary renders
 */
const AudioTimeLabel = React.memo( ( { className }: AudioTimeLabelProps ) => {
  const [ pos, setPos ] = useState( 0 );
  const { duration, getPosition, isPlaying } = useAudioPlayerContext();
  const intervalRef = useRef<number | null>( null );

  // Use a progressive update interval - update frequently while playing,
  // less frequently when paused to save resources
  useEffect( () => {
    // Clear any existing interval
    if ( intervalRef.current !== null ) {
      clearInterval( intervalRef.current );
    }

    // Set update interval based on playing status
    const updateInterval = isPlaying ? 250 : 1000;

    // Create interval for time updates
    intervalRef.current = window.setInterval( () => {
      setPos( getPosition() );
    }, updateInterval );

    // Cleanup function to remove interval on unmount or when dependencies change
    return () => {
      if ( intervalRef.current !== null ) {
        clearInterval( intervalRef.current );
        intervalRef.current = null;
      }
    };
  }, [ getPosition, isPlaying ] );

  return (
    <div
      className={cn( "text-sm select-none", className )}
      role="timer"
      aria-live="polite"
    >
      {`${formatTime( pos )} / ${formatTime( duration )}`}
    </div>
  );
} );

AudioTimeLabel.displayName = "AudioTimeLabel";

export default AudioTimeLabel;
