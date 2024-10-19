import { PlayCircle as PlayIcon, StopCircle as PauseIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { usePlaylistAtom } from "@/hooks/use-songs";

export default function AudioPlayPauseButton({
  url,
  title,
  id,
}: {
  url: string;
  id: string;
  title: string;
}) {
  const [playlist, dispatch] = usePlaylistAtom();
  const { playing } = useGlobalAudioPlayer();

  const isPlaying =
    playing &&
    playlist.currentSongIndex !== -1 &&
    playlist.songs[playlist.currentSongIndex]?.src === url;

  // console.log("playlist", playlist);

  const play = () => {
    dispatch({
      type: "ADD_SONG",
      payload: {
        id,
        title,
        album: "",
        artist: "",
        src: url,
      } as Song,
    });
  };
  const pause = () => {
    dispatch({ type: "PAUSE" });
  };
  // const play = () => {
  //   setPlaylist((prev) => {
  //     // find if the song is already in the playlist
  //     const index = prev.songs.findIndex((song) => song.src === url);
  //     if (index === -1) {
  //       // not available, add the song to the playlist
  //       const songs = [
  //         ...prev.songs,
  //         {
  //           id: url,
  //           title: "",
  //           album: "",
  //           artist: "",
  //           src: url,
  //         } as Song,
  //       ];
  //       // set the current song to the new song
  //       const currentSongIndex = songs.length - 1;
  //       return { ...prev, songs, currentSongIndex };
  //     } else {
  //       // set the current song to the existing song
  //       const currentSongIndex = index;
  //       return { ...prev, currentSongIndex };
  //     }
  //   });
  // };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={isPlaying ? "Pause" : "Play"}
      onClick={() => (isPlaying ? pause() : play())}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </Button>
  );
}

// export default function AudioPlayPauseButton({ url }: { url: string }) {
//   const [playing, setPlaying] = useState(false);
//   const [player, setPlayer] = useState<HTMLAudioElement>(new Audio());

//   useEffect(() => {
//     setPlayer(new Audio(url));
//   }, [url]);

//   const play = () => {
//     setPlaying(true);
//     player.play();
//   };
//   const pause = () => {
//     setPlaying(false);
//     player.pause();
//   };

//   return (
//     <Button
//       type="button"
//       size="icon"
//       variant="ghost"
//       aria-label={playing ? "Pause" : "Play"}
//       onClick={() => (playing ? pause() : play())}
//     >
//       {playing ? <PauseIcon /> : <PlayIcon />}
//     </Button>
//   );
// }
