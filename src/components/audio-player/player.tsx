import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useEffect } from "react";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Button } from "../ui/button";
import {
  MdSkipPrevious as PrevIcon,
  MdSkipNext as NextIcon,
  MdOutlineFastForward as ForwardIcon,
  MdOutlineFastRewind as RewindIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
  MdOutlineRepeat as RepeatIcon,
  MdOutlineRepeatOn as RepeatOnIcon,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";
import { Separator } from "../ui/separator";
import PlayListTrigger from "./PlayListTrigger";
import { cn } from "@/lib/utils";
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";

interface AudioPlayerProps {
  className?: string;
  isMini?: boolean;
}

const AudioPlayer = ({ className, isMini }: AudioPlayerProps) => {
  const { load, playing, stop, play, pause, seek, src, getPosition } =
    useGlobalAudioPlayer();
  const [playlist, dispatch] = usePlaylistAtom();

  useEffect(() => {
    if (
      playlist.currentSongIndex >= 0 &&
      playlist.currentSongIndex < playlist.songs.length &&
      src !== playlist.songs[playlist.currentSongIndex].src
    ) {
      // console.log("loading song", playlist.currentSongIndex, src);
      load(playlist.songs[playlist.currentSongIndex].src, {
        autoplay: true,
        loop: playlist.repeat,
        html5: playlist.stream,
        format: "mp3",
        onload: () => {
          seek(playlist.songs[playlist.currentSongIndex].position);
        },
        onend: () => dispatch({ type: "NEXT_SONG" }),
      });
    }
  }, [playlist.currentSongIndex, load, playlist.repeat, src]);

  if (playlist.songs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "@container/main-player flex flex-col gap-2 border bg-muted rounded-sm p-1",
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
          aria-label="Previous song"
          onClick={() => seek(getPosition() - playlist.seekInterval)}
          disabled={!playing}
        >
          <RewindIcon className="size-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={playing ? "Pause" : "Play"}
          disabled={playlist.songs.length === 0}
          onClick={
            playing
              ? () => {
                  pause();
                  dispatch({ type: "PAUSE", payload: getPosition() });
                }
              : () => play()
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
          aria-label="Previous song"
          onClick={() => seek(getPosition() + playlist.seekInterval)}
          disabled={!playing}
        >
          <ForwardIcon className="size-5" />
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
          onClick={() => {
            pause();
            dispatch({ type: "CLEAR_PLAYLIST" });
          }}
        >
          <ClearIcon className="size-5" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <PlayListTrigger />
      </div>
      <div className={cn(isMini ? "hidden" : "flex flex-col flex-1 gap-2")}>
        <Separator />
        <AudioPlayExtrasBar />
      </div>
    </div>
  );
};

export default AudioPlayer;
