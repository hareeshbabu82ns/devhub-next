import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  FunctionComponent,
  MouseEvent,
  KeyboardEvent,
} from "react";
import { useAudioPlayerContext } from "react-use-audio-player";

interface AudioSeekBarProps {
  className?: string;
}

const AudioSeekBar: FunctionComponent<AudioSeekBarProps> = ( { className } ) => {
  const { isPlaying: playing, getPosition, duration, seek } = useAudioPlayerContext();
  const [ pos, setPos ] = useState( 0 );
  const frameRef = useRef<number>( null );
  const seekBarElem = useRef<HTMLDivElement>( null );

  // Animation frame for smooth progress updates
  useEffect( () => {
    const animate = () => {
      setPos( getPosition() );
      frameRef.current = requestAnimationFrame( animate );
    };

    frameRef.current = window.requestAnimationFrame( animate );

    return () => {
      if ( frameRef.current ) {
        cancelAnimationFrame( frameRef.current );
      }
    };
  }, [ getPosition ] );

  // Convert position and duration to human-readable time for accessibility
  const currentTime = formatTime( pos );
  const totalTime = formatTime( duration );

  // Handle mouse click for seeking
  const handleSeek = useCallback(
    ( event: MouseEvent ) => {
      const { pageX: eventOffsetX } = event;

      if ( seekBarElem.current ) {
        const rect = seekBarElem.current.getBoundingClientRect();
        const percent = ( eventOffsetX - rect.left ) / rect.width;
        const newPos = Math.max( 0, Math.min( 1, percent ) ) * duration;
        seek( newPos );
      }
    },
    [ duration, seek ],
  );

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    ( event: KeyboardEvent ) => {
      // Skip by 5 seconds for arrow keys
      const skipTime = 5;

      switch ( event.key ) {
        case "ArrowRight":
          seek( Math.min( duration, pos + skipTime ) );
          event.preventDefault();
          break;
        case "ArrowLeft":
          seek( Math.max( 0, pos - skipTime ) );
          event.preventDefault();
          break;
        case "Home":
          seek( 0 );
          event.preventDefault();
          break;
        case "End":
          seek( duration );
          event.preventDefault();
          break;
      }
    },
    [ duration, pos, seek ],
  );

  if ( duration === Infinity ) return null;

  // Calculate percentage for visual progress and ARIA values
  const progressPercent = ( pos / duration ) * 100;

  return (
    <div
      className={cn(
        "relative w-full flex-1 overflow-hidden h-2 rounded-full",
        "bg-slate-200 dark:bg-slate-900",
        "hover:h-3 transition-height duration-150",
        className,
      )}
      ref={seekBarElem}
      onClick={handleSeek}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Audio seek bar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round( progressPercent )}
      aria-valuetext={`${currentTime} of ${totalTime}`}
    >
      <div
        style={{ width: `${progressPercent}%` }}
        className="bg-secondary h-full"
      />
      {/* Seek handle for better visual feedback */}
      <div
        className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-primary shadow-md pointer-events-none"
        style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
};

// Helper function to format time in MM:SS format
function formatTime( seconds: number ): string {
  if ( !seconds || !isFinite( seconds ) ) return '0:00';

  const mins = Math.floor( seconds / 60 );
  const secs = Math.floor( seconds % 60 );
  return `${mins}:${secs.toString().padStart( 2, '0' )}`;
}

export default AudioSeekBar;
