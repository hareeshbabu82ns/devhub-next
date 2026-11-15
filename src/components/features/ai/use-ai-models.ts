"use client";

import { atom, useAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import type { AiOptions, AiSelection } from "@/lib/ai/config";

export const aiModelsKey = ["aiModels"];

/**
 * The model picked in one of the AI dialogs. Kept for the visit so the next
 * dialog starts from the same choice; a reload goes back to the default set
 * in Settings › AI.
 */
const pickedAtom = atom<AiSelection | null>(null);

const available = (options: AiOptions | undefined, s: AiSelection | null) =>
  !!s &&
  !!options?.providers.some(
    (p) => p.id === s.providerId && p.models.includes(s.model),
  );

/** The models requests can go to and the one currently chosen. */
export function useAiModels() {
  const [picked, setPicked] = useAtom(pickedAtom);
  const { data: options, isLoading } = useQuery({
    queryKey: aiModelsKey,
    queryFn: async () => {
      const response = await fetch("/api/ai/models");
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Request failed");
      return json as AiOptions;
    },
    staleTime: 5 * 60 * 1000,
  });
  const selection = available(options, picked)
    ? picked
    : (options?.default ?? null);
  return {
    options,
    isLoading,
    /** false once it is known that no provider is set up */
    configured: isLoading || !options ? null : options.providers.length > 0,
    /** what to send with a request; null lets the server use its default */
    selection,
    /** true when the model was picked here rather than taken from a default */
    picked: available(options, picked),
    setSelection: setPicked,
    label: (s: AiSelection | null = selection) => {
      const provider = options?.providers.find((p) => p.id === s?.providerId);
      return provider && s ? `${provider.name} · ${s.model}` : "";
    },
  };
}
