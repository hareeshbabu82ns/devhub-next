import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MdOutlineFeaturedPlayList as PlaylistIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
} from "react-icons/md";
import AudioPlayer from "./player";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Icons } from "../utils/icons";
import { useAudioPlayerContext } from "react-use-audio-player";
import { Separator } from "../ui/separator";

export default function PlayListTrigger( { className }: { className?: string } ) {
  const [ playlist, dispatch ] = usePlaylistAtom();
  return (
    <Sheet>
      <SheetTrigger asChild className={className}>
        <Button variant="ghost" size="icon">
          <PlaylistIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="min-w-full md:min-w-[520px] m-0 px-2">
        <SheetHeader>
          <SheetTitle>Playlist</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-2">
          <AudioPlayer />
          <Separator />
          <div className="flex flex-col gap-4">
            {playlist.songs.map( ( song, index ) => (
              <SongTile key={song.id} song={song} index={index} />
            ) )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const SongTile = ( { song, index }: { song: Song; index: number } ) => {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const { isPlaying: playing } = useAudioPlayerContext();
  const isPlaying = playing && playlist.currentSongIndex === index;
  const pause = () => {
    dispatch( { type: "PAUSE" } );
  };
  const play = () => {
    dispatch( { type: "ADD_SONG", payload: song } );
  };
  const remove = () => {
    dispatch( { type: "REMOVE_SONG", payload: index } );
  };
  return (
    <div className="flex flex-row gap-3 items-center p-2 border rounded-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={isPlaying ? pause : play}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <PauseIcon className="size-5" />
        ) : (
          <PlayIcon className="size-5" />
        )}
      </Button>
      <p className="text-ellipsis line-clamp-2 flex-1">
        {song.title || song.src}
      </p>
      <Button variant="ghost" size="icon" onClick={remove} aria-label="Remove">
        <Icons.close className="size-5" />
      </Button>
    </div>
  );
};
