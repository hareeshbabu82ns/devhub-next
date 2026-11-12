import { AudioLines as GenerateIcon } from "lucide-react";
import { useAudioQueueDispatch } from "@/hooks/use-audio-queue";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { toast } from "sonner";
import { forwardRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import AudioControlButton from "../audio-player/AudioControlButton";
import { generateAudioForEntity } from "@/app/(app)/entities/actions";

interface AudioGenPlayPauseButtonProps {
  id: string;
  title: string;
  /** Where the track sits, shown under its title in the queue. */
  subtitle?: string;
  /** Page showing the verse. */
  href?: string;
  className?: string;
}

/**
 * For a verse without a recording: generates one (text to speech), saves it
 * on the verse and plays it. The tile then shows the normal play button.
 */
const AudioGenPlayPauseButton = forwardRef<
  HTMLButtonElement,
  AudioGenPlayPauseButtonProps
>(({ title, subtitle, href, id, className }, ref) => {
  const dispatch = useAudioQueueDispatch();
  const invalidateEntities = useInvalidateEntities();

  // Audio generation mutation
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      const audioPath = await generateAudioForEntity(id);
      if (!audioPath) {
        throw new Error("Failed to generate audio");
      }
      return audioPath;
    },
    onSuccess: (audioPath) => {
      toast.success("Audio generated successfully");

      dispatch({
        type: "playNow",
        track: { id, src: audioPath, title, subtitle, href },
      });
      // the verse now has audio: lists must pick that up
      invalidateEntities();
    },
    onError: (error) => {
      console.error("Audio generation failed:", error);
      toast.error("Failed to generate audio");
    },
  });

  // Add/play song in playlist
  const play = useCallback(async () => {
    // If no audio URL exists, generate audio first
    if (generateAudioMutation.isPending) {
      toast.info("Audio generation in progress...");
      return;
    }

    try {
      await generateAudioMutation.mutateAsync();
      // After successful generation, the audio will be played via the success handler
      return;
    } catch (error) {
      // Error is already handled in the mutation's onError
      return;
    }
  }, [generateAudioMutation]);

  return (
    <AudioControlButton
      ref={ref}
      icon={
        generateAudioMutation.isPending ? (
          <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        ) : (
          <GenerateIcon className="size-5 opacity-60" />
        )
      }
      label={
        generateAudioMutation.isPending
          ? "Generating audio..."
          : "Generate audio and play"
      }
      title={`Generate audio: ${title}`}
      onClick={play}
      className={className}
      disabled={generateAudioMutation.isPending}
    />
  );
});

AudioGenPlayPauseButton.displayName = "AudioGenPlayPauseButton";

export default AudioGenPlayPauseButton;
