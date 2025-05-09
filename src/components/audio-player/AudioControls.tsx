import React from "react";
import { cn } from "@/lib/utils";
import { useAudioControls } from "@/hooks/use-audio-controls";
import AudioControlButton from "./AudioControlButton";
import {
  MdSkipPrevious,
  MdSkipNext,
  MdOutlineFastForward,
  MdOutlineFastRewind,
  MdOutlinePlayCircle,
  MdOutlinePauseCircle,
} from "react-icons/md";

interface AudioControlsProps {
  className?: string;
}

/**
 * Reusable transport controls component for audio playback
 * (play/pause, skip, seek forward/backward)
 */
const AudioControls: React.FC<AudioControlsProps> = ( { className } ) => {
  const {
    isPlaying,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeekRelative,
    canGoNext,
    canGoPrevious,
    hasSongs,
  } = useAudioControls();

  return (
    <div
      className={cn( "flex items-center gap-1", className )}
      role="group"
      aria-label="Playback controls"
    >
      <AudioControlButton
        icon={<MdSkipPrevious className="size-5" />}
        label="Previous track"
        onClick={handlePrevious}
        disabled={!canGoPrevious}
      />
      <AudioControlButton
        icon={<MdOutlineFastRewind className="size-5" />}
        label="Rewind"
        onClick={() => handleSeekRelative( -10 )}
        disabled={!isPlaying}
      />
      <AudioControlButton
        icon={isPlaying ? <MdOutlinePauseCircle className="size-5" /> : <MdOutlinePlayCircle className="size-5" />}
        label={isPlaying ? "Pause" : "Play"}
        onClick={handlePlayPause}
        disabled={!hasSongs}
      />
      <AudioControlButton
        icon={<MdOutlineFastForward className="size-5" />}
        label="Fast forward"
        onClick={() => handleSeekRelative( 10 )}
        disabled={!isPlaying}
      />
      <AudioControlButton
        icon={<MdSkipNext className="size-5" />}
        label="Next track"
        onClick={handleNext}
        disabled={!canGoNext}
      />
    </div>
  );
};

export default React.memo( AudioControls );