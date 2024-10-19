import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useEffect, useState } from "react";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Button } from "../ui/button";
import {
  MdSkipPrevious as PrevIcon,
  MdSkipNext as NextIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
  MdOutlineRepeat as RepeatIcon,
  MdOutlineRepeatOn as RepeatOnIcon,
  MdOutlinePlaylistRemove as ClearIcon,
  MdOutlineFeaturedPlayList as PlaylistIcon,
} from "react-icons/md";
import { Separator } from "../ui/separator";
import PlayListTrigger from "./PlayListTrigger";
import { cn } from "@/lib/utils";

const AudioPlayer = ({ className }: { className?: string }) => {
  const { load, playing, stop, play, src } = useGlobalAudioPlayer();
  const [playlist, dispatch] = usePlaylistAtom();

  useEffect(() => {
    console.log({ src, currentSongIndex: playlist.currentSongIndex });
    if (playlist.currentSongIndex === -1) {
      // dispatch({ type: "NEXT_SONG" });
      stop();
    } else if (playlist.currentSongIndex !== -1) {
      if (src !== playlist.songs[playlist.currentSongIndex].src) {
        console.log(
          "loading song",
          playlist.currentSongIndex,
          src,
          playlist.songs[playlist.currentSongIndex].src,
        );
        load(playlist.songs[playlist.currentSongIndex].src, {
          autoplay: true,
          loop: playlist.repeat,
          html5: true,
          onend: () => dispatch({ type: "NEXT_SONG" }),
        });
      } else if (!playing) {
        play();
      }
    }
  }, [playlist.currentSongIndex, load, playlist.repeat, src]);

  if (playlist.songs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border bg-muted rounded-sm p-1",
        className,
      )}
    >
      <div className="flex flex-row gap-1 items-center justify-between">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Previous song"
          onClick={() => dispatch({ type: "PREV_SONG" })}
          disabled={
            playlist.songs.length === 0 ||
            playlist.currentSongIndex === -1 ||
            playlist.currentSongIndex === 0
          }
        >
          <PrevIcon className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={playing ? "Pause" : "Play"}
          onClick={
            playing
              ? () => dispatch({ type: "PAUSE" })
              : () => dispatch({ type: "PLAY" })
          }
        >
          {playing ? (
            <PauseIcon className="size-5" />
          ) : (
            <PlayIcon className="size-5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Next song"
          onClick={() => dispatch({ type: "NEXT_SONG" })}
          disabled={
            playlist.songs.length === 0 ||
            playlist.currentSongIndex === -1 ||
            playlist.currentSongIndex === playlist.songs.length - 1
          }
        >
          <NextIcon className="size-5" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={playlist.repeat ? "Repeat off" : "Repeate on"}
          onClick={() => dispatch({ type: "TOGGLE_REPEAT" })}
        >
          {playlist.repeat ? (
            <RepeatOnIcon className="size-5" />
          ) : (
            <RepeatIcon className="size-5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Clear playlist"
          onClick={() => dispatch({ type: "CLEAR_PLAYLIST" })}
        >
          <ClearIcon className="size-5" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <PlayListTrigger />
      </div>
    </div>
  );
};

// const SeekBar = () => {
//   const { seek, getPosition, duration } = useGlobalAudioPlayer();
//   const [playlist, dispatch] = usePlaylistAtom();
//   const [seeking, setSeeking] = useState(0);

//   useEffect(() => {
//     setSeeking(getPosition());
//   }, []);

//   return (
//     <div className="flex flex-row gap-1 border bg-muted rounded-sm p-1 items-center justify-between">
//       <input
//         type="range"
//         min={0}
//         max={duration}
//         value={seeking}
//         onChange={(e) => seek(Number(e.target.value))}
//       />
//       {/* currentPos : elapsedTime : totalTime */}
//       <span>{getPosition()}</span>
//       <span>{duration}</span>
//     </div>
//   );
// };

export default AudioPlayer;
