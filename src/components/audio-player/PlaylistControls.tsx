import React from "react";
import { cn } from "@/lib/utils";
import { useAudioControls } from "@/hooks/use-audio-controls";
import AudioControlButton from "./AudioControlButton";
import {
  MdOutlineRepeat,
  MdOutlineRepeatOn,
  MdOutlineRepeatOneOn,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";

interface PlaylistControlsProps {
  className?: string;
}

const REPEAT = {
  off: {
    icon: <MdOutlineRepeat className="size-5" />,
    title: "Repeat is off",
    next: "Repeat the whole queue",
  },
  all: {
    icon: <MdOutlineRepeatOn className="size-5" />,
    title: "Repeating the whole queue",
    next: "Repeat this track only",
  },
  one: {
    icon: <MdOutlineRepeatOneOn className="size-5" />,
    title: "Repeating this track",
    next: "Turn repeat off",
  },
};

/** Queue-level controls: repeat mode (off → queue → one track) and clear. */
const PlaylistControls: React.FC<PlaylistControlsProps> = ({ className }) => {
  const { repeat, handleCycleRepeat, handleClearPlaylist, hasSongs } =
    useAudioControls();
  const mode = REPEAT[repeat];

  return (
    <div
      className={cn("flex items-center justify-around gap-1", className)}
      role="group"
      aria-label="Queue controls"
    >
      <AudioControlButton
        icon={mode.icon}
        label={`${mode.title}. ${mode.next}`}
        title={`${mode.title} — tap to: ${mode.next.toLowerCase()}`}
        onClick={handleCycleRepeat}
        disabled={!hasSongs}
        isActive={repeat !== "off"}
        className="size-9"
      />
      <AudioControlButton
        icon={<ClearIcon className="size-5" />}
        label="Clear the queue"
        title="Clear the queue"
        onClick={handleClearPlaylist}
        disabled={!hasSongs}
        className="size-9"
      />
    </div>
  );
};

export default React.memo(PlaylistControls);
