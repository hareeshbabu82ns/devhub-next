import { PlayCircle as PlayIcon, StopCircle as PauseIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";

export default function AudioPlayPauseButton({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [player, setPlayer] = useState<HTMLAudioElement>(new Audio());

  useEffect(() => {
    setPlayer(new Audio(url));
  }, [url]);

  const play = () => {
    setPlaying(true);
    player.play();
  };
  const pause = () => {
    setPlaying(false);
    player.pause();
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={playing ? "Pause" : "Play"}
      onClick={() => (playing ? pause() : play())}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
    </Button>
  );
}
