import { PlayCircle as PlayIcon, PauseCircle as PauseIcon } from "lucide-react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { toast } from "sonner";
import { forwardRef, useCallback, memo } from "react";
import AudioControlButton from "../audio-player/AudioControlButton";

interface AudioPlayPauseButtonProps {
  url: string;
  id: string;
  title: string;
  className?: string;
}

/**
 * A button component for playing/pausing individual audio tracks
 * Can be placed anywhere in the app to play a specific audio file
 */
const AudioPlayPauseButton = forwardRef<
  HTMLButtonElement,
  AudioPlayPauseButtonProps
>( ( { url, title, id, className }, ref ) => {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const {
    isPlaying,
    play: playerPlay,
    pause: playerPause,
    getPosition,
  } = useAudioPlayerContext();

  // Check if this is the currently playing track
  const isCurrentlyPlaying =
    isPlaying &&
    playlist.currentSongIndex !== -1 &&
    playlist.songs[ playlist.currentSongIndex ]?.src === url;

  // Add/play song in playlist
  const play = useCallback( () => {
    if ( playlist.songs[ playlist.currentSongIndex ]?.src === url ) {
      // If this is already the current song, just play it
      playerPlay();
      return;
    }

    // Check if the song is already in the playlist
    const index = playlist.songs.findIndex( ( song ) => song.src === url );
    if ( index !== -1 ) {
      // If it's in the playlist but not the current song, switch to it
      dispatch( { type: "PAUSE", payload: getPosition() } );
      dispatch( {
        type: "SET_CURRENT_INDEX",
        payload: index,
      } );
    } else {
      // Add as a new song to the playlist
      dispatch( {
        type: "ADD_SONG",
        payload: {
          id,
          title: title || url.split( '/' ).pop(),
          album: "",
          artist: "",
          src: url,
          position: 0,
        },
      } );
      toast.info( "Song added to playlist" );
    }
  }, [ playlist.songs, playlist.currentSongIndex, url, id, title, playerPlay, dispatch, getPosition ] );

  // Pause playback
  const pause = useCallback( () => {
    playerPause();
    dispatch( { type: "PAUSE", payload: getPosition() } );
  }, [ playerPause, dispatch, getPosition ] );

  return (
    <AudioControlButton
      ref={ref}
      icon={isCurrentlyPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
      label={isCurrentlyPlaying ? "Pause" : "Play"}
      title={title}
      onClick={isCurrentlyPlaying ? pause : play}
      className={className}
      isActive={playlist.songs[ playlist.currentSongIndex ]?.src === url}
    />
  );
} );

AudioPlayPauseButton.displayName = "AudioPlayPauseButton";

export default AudioPlayPauseButton;
