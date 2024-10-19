import React from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import AudioSeekBar from "./AudioSeekBar";
import AudioTimeLabel from "./AudioTimeLabel";
import AudioVolumeControl from "./AudioVolumeControl";
import { FaRunning } from "react-icons/fa";

const AudioPlayExtrasBar = () => {
  const { togglePlayPause, playing, isReady, setRate, rate, src } =
    useGlobalAudioPlayer();

  return (
    <div className="h-[100px] flex flex-col flex-1 items-start gap-2">
      <div className="group w-full truncate">
        <div className="relative  group-hover:animate-slide">Track: {src}</div>
      </div>
      <AudioSeekBar />
      <div className="grid grid-cols-4 @md/main-player:grid-cols-6 gap-2">
        <AudioTimeLabel className="col-span-2" />
        <div className="flex flex-row gap-2 items-center col-span-2 @md/main-player:col-span-1">
          <FaRunning className="size-4" />
          <select
            className="w-full"
            name="rateSelect"
            id="rate"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            <option value="0.5">1/2x</option>
            <option value="0.75">1/3x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
        <AudioVolumeControl className="col-span-3" />
      </div>
    </div>
  );
};

export default AudioPlayExtrasBar;
