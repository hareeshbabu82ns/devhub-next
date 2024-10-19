import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";

const formatTime = (seconds: number) => {
  if (seconds === Infinity) {
    return "--";
  }
  const floored = Math.floor(seconds);
  let from = 14;
  let length = 5;
  // Display hours only if necessary.
  if (floored >= 3600) {
    from = 11;
    length = 8;
  }

  return new Date(floored * 1000).toISOString().slice(from, from + length);
};

const AudioTimeLabel = ({ className }: { className?: string }) => {
  const [pos, setPos] = useState(0);
  const { duration, getPosition, playing } = useGlobalAudioPlayer();

  useEffect(() => {
    const i = setInterval(() => {
      setPos(getPosition());
    }, 500);

    return () => clearInterval(i);
  }, [getPosition]);

  return (
    <div
      className={cn("text-sm", className)}
    >{`${formatTime(pos)} / ${formatTime(duration)}`}</div>
  );
};

export default AudioTimeLabel;
