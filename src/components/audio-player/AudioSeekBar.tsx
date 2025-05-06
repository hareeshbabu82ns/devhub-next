import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  FunctionComponent,
  MouseEvent,
} from "react";
import { useAudioPlayerContext } from "react-use-audio-player";

interface AudioSeekBarProps {
  className?: string;
}

const AudioSeekBar: FunctionComponent<AudioSeekBarProps> = ( { className } ) => {
  const { isPlaying: playing, getPosition, duration, seek } = useAudioPlayerContext();
  const [ pos, setPos ] = useState( 0 );
  const frameRef = useRef<number>();

  const seekBarElem = useRef<HTMLDivElement>( null );

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
  }, [] );

  const goTo = useCallback(
    ( event: MouseEvent ) => {
      const { pageX: eventOffsetX } = event;

      if ( seekBarElem.current ) {
        const elementOffsetX = seekBarElem.current.offsetLeft;
        const elementWidth = seekBarElem.current.clientWidth;
        const percent = ( eventOffsetX - elementOffsetX ) / elementWidth;
        seek( percent * duration );
      }
    },
    [ duration, playing, seek ],
  );

  if ( duration === Infinity ) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-1 cursor-pointer bg-slate-200 dark:bg-slate-900 overflow-hidden h-2",
        className,
      )}
      ref={seekBarElem}
      onClick={goTo}
    >
      <div
        style={{ width: `${( pos / duration ) * 100}%` }}
        className="bg-secondary h-3"
      />
    </div>
  );
};

export default AudioSeekBar;
