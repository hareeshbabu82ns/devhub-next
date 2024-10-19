import { cn } from "@/lib/utils";
import React, { ChangeEvent, useCallback } from "react";
import { MdVolumeDown, MdVolumeUp } from "react-icons/md";
import { useGlobalAudioPlayer } from "react-use-audio-player";

const AudioVolumeControl = ({ className }: { className?: string }) => {
  const { setVolume, volume } = useGlobalAudioPlayer();

  const handleChange = useCallback(
    (slider: ChangeEvent<HTMLInputElement>) => {
      const volValue = parseFloat(
        (Number(slider.target.value) / 100).toFixed(2),
      );
      return setVolume(volValue);
    },
    [setVolume],
  );

  return (
    <div className={cn("flex gap-2 items-center", className)}>
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
  );
};

export default AudioVolumeControl;
