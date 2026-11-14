import { AudioLines as GenerateIcon } from "lucide-react";
import { forwardRef } from "react";
import AudioControlButton from "../audio-player/AudioControlButton";

interface AudioGenPlayPauseButtonProps {
  title: string;
  /** Opens the audio dialog, where the recording is made. */
  onClick: () => void;
  className?: string;
}

/**
 * For a verse without a recording: opens the dialog that generates one (text
 * to speech). Once it has audio the tile shows the normal play button.
 */
const AudioGenPlayPauseButton = forwardRef<
  HTMLButtonElement,
  AudioGenPlayPauseButtonProps
>(({ title, onClick, className }, ref) => (
  <AudioControlButton
    ref={ref}
    icon={<GenerateIcon className="size-5 opacity-60" />}
    label="Generate audio"
    title={`Generate audio: ${title}`}
    onClick={onClick}
    className={className}
  />
));

AudioGenPlayPauseButton.displayName = "AudioGenPlayPauseButton";

export default AudioGenPlayPauseButton;
