import { PlayCircle as PlayIcon, StopCircle as PauseIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useAudioPlayerContext } from "react-use-audio-player";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { toast } from "sonner";

export default function AudioPlayPauseButton( {
  url,
  title,
  id,
}: {
  url: string;
  id: string;
  title: string;
} ) {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const {
    isPlaying: playing,
    play: playerPlay,
    pause: playerPause,
    getPosition,
  } = useAudioPlayerContext();

  const isPlaying =
    playing &&
    playlist.currentSongIndex !== -1 &&
    playlist.songs[ playlist.currentSongIndex ]?.src === url;

  // console.log("playlist", playlist);

  const play = () => {
    if ( playlist.songs[ playlist.currentSongIndex ]?.src === url ) {
      playerPlay();
      return;
    }
    const index = playlist.songs.findIndex( ( song ) => song.src === url );
    if ( index !== -1 ) {
      dispatch( { type: "PAUSE", payload: getPosition() } );
      dispatch( {
        type: "SET_CURRENT_INDEX",
        payload: index,
      } );
    } else {
      dispatch( {
        type: "ADD_SONG",
        payload: {
          id,
          title,
          album: "",
          artist: "",
          src: url,
          position: 0,
        } as Song,
      } );
      toast.info( "Song added to playlist" );
    }
  };
  const pause = () => {
    playerPause();
    dispatch( { type: "PAUSE", payload: getPosition() } );
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={isPlaying ? "Pause" : "Play"}
      onClick={() => ( isPlaying ? pause() : play() )}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </Button>
  );
}
