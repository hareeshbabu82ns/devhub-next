import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  FunctionComponent,
} from "react";
import { useAudioPlayerContext } from "react-use-audio-player";

interface AudioSeekBarProps {
  className?: string;
}

/**
 * A seekable progress bar for audio playback with keyboard accessibility
 * and performance optimizations.
 */
const AudioSeekBar: FunctionComponent<AudioSeekBarProps> = React.memo( ( { className } ) => {
  const { getPosition, duration, seek } = useAudioPlayerContext();
  const [ pos, setPos ] = useState( 0 );
  const frameRef = useRef<number | null>( null );
  const seekBarElem = useRef<HTMLDivElement>( null );
  const isDraggingRef = useRef( false );

  // Animation frame for smooth progress updates with performance optimization
  useEffect( () => {
    // Using RAF provides smoother updates than setInterval
    const animate = () => {
      // Skip position updates while user is dragging to avoid jumps
      if ( !isDraggingRef.current ) {
        setPos( getPosition() );
      }
      frameRef.current = requestAnimationFrame( animate );
    };

    // Start animation
    frameRef.current = requestAnimationFrame( animate );

    // Cleanup on unmount
    return () => {
      if ( frameRef.current ) {
        cancelAnimationFrame( frameRef.current );
        frameRef.current = null;
      }
    };
  }, [ getPosition ] );

  // Convert position and duration to human-readable time for accessibility
  const currentTime = formatTime( pos );
  const totalTime = formatTime( duration );

  // Handle mouse click/drag for seeking
  const handleSeek = useCallback(
    ( event: React.MouseEvent | React.TouchEvent ) => {
      if ( !seekBarElem.current ) return;

      // Get pointer position
      const rect = seekBarElem.current.getBoundingClientRect();
      const pageX = 'touches' in event
        ? event.touches[ 0 ].pageX
        : event.pageX;

      const percent = Math.max( 0, Math.min( 1, ( pageX - rect.left ) / rect.width ) );
      const newPos = percent * duration;
      seek( newPos );
    },
    [ duration, seek ],
  );

  // Handle touch/mouse start for drag operations
  const handleDragStart = useCallback( ( event: React.MouseEvent | React.TouchEvent ) => {
    event.preventDefault();
    isDraggingRef.current = true;
    handleSeek( event );

    const handleMove = ( e: MouseEvent | TouchEvent ) => {
      e.preventDefault();
      const mouseEvent = e as MouseEvent;
      const touchEvent = e as TouchEvent;

      const pageX = 'touches' in e
        ? touchEvent.touches[ 0 ].pageX
        : mouseEvent.pageX;

      if ( !seekBarElem.current ) return;

      const rect = seekBarElem.current.getBoundingClientRect();
      const percent = Math.max( 0, Math.min( 1, ( pageX - rect.left ) / rect.width ) );
      const newPos = percent * duration;
      setPos( newPos ); // Update visual position while dragging
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      document.removeEventListener( 'mousemove', handleMove );
      document.removeEventListener( 'mouseup', handleEnd );
      document.removeEventListener( 'touchmove', handleMove );
      document.removeEventListener( 'touchend', handleEnd );

      // Apply the final position when drag ends
      if ( seekBarElem.current ) {
        const newPos = pos;
        seek( newPos );
      }
    };

    document.addEventListener( 'mousemove', handleMove, { passive: false } );
    document.addEventListener( 'mouseup', handleEnd );
    document.addEventListener( 'touchmove', handleMove, { passive: false } );
    document.addEventListener( 'touchend', handleEnd );
  }, [ duration, pos, seek, handleSeek ] );

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    ( event: React.KeyboardEvent ) => {
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

  // Calculate percentage for visual progress
  const progressPercent = ( pos / duration ) * 100;

  return (
    <div
      className={cn(
        "relative w-full flex-1 overflow-hidden h-2 rounded-full",
        "bg-slate-200 dark:bg-slate-900",
        "hover:h-3 group transition-all duration-150",
        className,
      )}
      ref={seekBarElem}
      onClick={handleSeek}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
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
        className="bg-secondary h-full transition-all"
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-primary shadow-md 
                 opacity-0 group-hover:opacity-100 pointer-events-none transform -translate-x-1/2
                 transition-opacity duration-200"
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );
} );

AudioSeekBar.displayName = "AudioSeekBar";

// Helper function to format time in MM:SS format
export function formatTime( seconds: number ): string {
  if ( !seconds || !isFinite( seconds ) ) return '0:00';

  const mins = Math.floor( seconds / 60 );
  const secs = Math.floor( seconds % 60 );
  return `${mins}:${secs.toString().padStart( 2, '0' )}`;
}

export default AudioSeekBar;
