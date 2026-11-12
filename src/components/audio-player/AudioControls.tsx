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
import { Spinner } from "../ui/spinner";

interface AudioControlsProps {
  className?: string;
  /** Only previous / play / next, for the narrowest places. */
  compact?: boolean;
}

/**
 * Reusable transport controls component for audio playback
 * (play/pause, skip, seek forward/backward)
 */
const AudioControls: React.FC<AudioControlsProps> = ({
  className,
  compact,
}) => {
  const {
    isPlaying,
    isLoading,
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
      className={cn("flex items-center gap-0.5 sm:gap-1", className)}
      role="group"
      aria-label="Playback controls"
    >
      <AudioControlButton
        icon={<MdSkipPrevious className="size-5" />}
        label="Previous track"
        title="Previous (restarts the track first)"
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className="size-9"
      />
      {!compact && (
        <AudioControlButton
          icon={<MdOutlineFastRewind className="size-5" />}
          label="Back 10 seconds"
          title="Back 10 seconds"
          onClick={() => handleSeekRelative(-10)}
          disabled={!hasSongs}
          className="size-9"
        />
      )}
      <AudioControlButton
        icon={
          isLoading ? (
            <Spinner className="size-5" />
          ) : isPlaying ? (
            <MdOutlinePauseCircle className="size-6" />
          ) : (
            <MdOutlinePlayCircle className="size-6" />
          )
        }
        label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
        onClick={handlePlayPause}
        disabled={!hasSongs}
        className="size-10"
      />
      {!compact && (
        <AudioControlButton
          icon={<MdOutlineFastForward className="size-5" />}
          label="Forward 10 seconds"
          title="Forward 10 seconds"
          onClick={() => handleSeekRelative(10)}
          disabled={!hasSongs}
          className="size-9"
        />
      )}
      <AudioControlButton
        icon={<MdSkipNext className="size-5" />}
        label="Next track"
        title="Next"
        onClick={handleNext}
        disabled={!canGoNext}
        className="size-9"
      />
    </div>
  );
};

export default React.memo(AudioControls);
