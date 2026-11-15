"use client";

import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AiOptions,
  AiSelection,
  parseSelectionKey,
  selectionKey,
} from "@/lib/ai/config";
import { useAiModels } from "./use-ai-models";

interface AiModelSelectProps {
  options: AiOptions | undefined;
  value: AiSelection | null;
  onChange: (selection: AiSelection) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/** A provider-grouped list of models. */
export function AiModelSelect({
  options,
  value,
  onChange,
  className,
  disabled,
  id,
  placeholder = "Choose a model",
}: AiModelSelectProps) {
  return (
    <Select
      value={value ? selectionKey(value) : ""}
      onValueChange={(key) => {
        const selection = parseSelectionKey(key);
        if (selection) onChange(selection);
      }}
      disabled={disabled || !options?.providers.length}
    >
      <SelectTrigger
        id={id}
        aria-label="AI model"
        className={cn("h-10 min-w-0", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options?.providers.map((provider) => (
          <SelectGroup key={provider.id}>
            <SelectLabel>{provider.name}</SelectLabel>
            {provider.models.map((model) => (
              <SelectItem
                key={model}
                value={selectionKey({ providerId: provider.id, model })}
              >
                {model}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Chooses the model the next AI request goes to. Starts from the default in
 * Settings › AI and remembers a different choice for the rest of the visit.
 */
export default function AiModelPicker({
  className,
  disabled,
  id,
}: {
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { options, selection, setSelection, configured } = useAiModels();
  if (configured === false) return <AiNotConfigured className={className} />;
  return (
    <AiModelSelect
      id={id}
      options={options}
      value={selection}
      onChange={setSelection}
      className={className}
      disabled={disabled}
    />
  );
}

export function AiNotConfigured({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-md border p-3 text-sm", className)} role="alert">
      No AI provider is set up yet. An admin can add one — with its API key
      and models — in{" "}
      <Link href="/settings/ai" className="underline underline-offset-4">
        Settings › AI
      </Link>
      .
    </p>
  );
}
