import React from "react";
import { cn } from "@/lib/utils";
import { useAudioControls } from "@/hooks/use-audio-controls";
import AudioControlButton from "./AudioControlButton";
import {
  MdOutlineRepeat,
  MdOutlineRepeatOn,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";
// import { PlaylistTrigger } from "./PlaylistTrigger";

interface PlaylistControlsProps {
  className?: string;
  hideTrigger?: boolean;
}

/**
 * Reusable component for playlist-related controls (repeat, clear playlist, etc.)
 */
const PlaylistControls: React.FC<PlaylistControlsProps> = ( {
  className,
  hideTrigger = false
} ) => {
  const {
    repeat,
    handleToggleRepeat,
    handleClearPlaylist,
    hasSongs
  } = useAudioControls();

  return (
    <div
      className={cn( "flex items-center justify-around gap-1", className )}
      role="group"
      aria-label="Playlist controls"
    >
      <AudioControlButton
        icon={repeat ? <MdOutlineRepeatOn className="size-5" /> : <MdOutlineRepeat className="size-5" />}
        label={repeat ? "Turn repeat off" : "Turn repeat on"}
        title={repeat ? "Repeat off" : "Repeat on"}
        onClick={handleToggleRepeat}
        disabled={!hasSongs}
        ariaPressed={repeat}
      />
      <AudioControlButton
        icon={<ClearIcon className="size-5" />}
        label="Clear playlist"
        title="Clear playlist"
        onClick={handleClearPlaylist}
        disabled={!hasSongs}
      />

      {/* Use the new simpler PlaylistTrigger component */}
      {/* {!hideTrigger && <PlaylistTrigger />} */}
    </div>
  );
};

export default React.memo( PlaylistControls );