"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_PROVIDER_PRESETS, AiProviderKind } from "@/lib/ai/config";
import {
  AiProviderSettings,
  fetchAiProviderModels,
  saveAiProvider,
  testAiProvider,
} from "@/app/actions/ai-settings-actions";

const parseModels = (text: string) => [
  ...new Set(
    text
      .split(/[\n,]/)
      .map((m) => m.trim())
      .filter(Boolean),
  ),
];

/** Adds a provider, or edits one. The saved key is kept unless retyped. */
export default function AiProviderForm({
  provider,
  onClose,
  onSaved,
}: {
  provider?: AiProviderSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [preset, setPreset] = useState(provider ? "" : "0");
  const first = AI_PROVIDER_PRESETS[0];
  const [name, setName] = useState(provider?.name ?? first.label);
  const [kind, setKind] = useState<AiProviderKind>(provider?.kind ?? first.kind);
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? first.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [modelsText, setModelsText] = useState(
    (provider?.models ?? first.models).join("\n"),
  );
  const [defaultModel, setDefaultModel] = useState(
    provider?.defaultModel ?? first.models[0] ?? "",
  );
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  // what the server offers, shown as a checklist after "Fetch models"
  const [offered, setOffered] = useState<string[] | null>(null);
  const [filter, setFilter] = useState("");

  const models = parseModels(modelsText);
  const chosenDefault = models.includes(defaultModel)
    ? defaultModel
    : (models[0] ?? "");
  const keyHint =
    AI_PROVIDER_PRESETS[Number(preset)]?.keyHint ??
    (kind === "anthropic" ? "sk-ant-…" : "API key");
  // an untouched key field keeps the saved key; a new provider has none
  const connection = {
    id: provider?.id,
    kind,
    baseUrl,
    apiKey: apiKey ? apiKey : provider ? undefined : "",
  };

  const applyPreset = (index: string) => {
    const p = AI_PROVIDER_PRESETS[Number(index)];
    setPreset(index);
    setName(p.label);
    setKind(p.kind);
    setBaseUrl(p.baseUrl);
    setModelsText(p.models.join("\n"));
    setDefaultModel(p.models[0] ?? "");
    setOffered(null);
  };

  const fetchModels = useMutation({
    mutationFn: () => fetchAiProviderModels(connection),
    onSuccess: (result) => {
      if (result.status === "error") toast.error(result.error);
      else setOffered(result.data);
    },
  });
  const test = useMutation({
    mutationFn: () => testAiProvider({ ...connection, model: chosenDefault }),
    onSuccess: (result) => {
      if (result.status === "error") toast.error(result.error);
      else toast.success(`${chosenDefault} answered: ${result.data.reply || "(empty reply)"}`);
    },
  });
  const save = useMutation({
    mutationFn: () =>
      saveAiProvider({
        ...connection,
        name,
        models,
        defaultModel: chosenDefault,
        enabled,
      }),
    onSuccess: (result) => {
      if (result.status === "error") toast.error(result.error);
      else {
        toast.success("Provider saved");
        onSaved();
      }
    },
  });

  const toggleModel = (model: string, on: boolean) =>
    setModelsText(
      (on ? [...models, model] : models.filter((m) => m !== model)).join("\n"),
    );
  const shown = (offered ?? []).filter((m) =>
    m.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!provider && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="provider-preset">Service</Label>
            <Select value={preset} onValueChange={applyPreset}>
              <SelectTrigger id="provider-preset" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_PRESETS.map((p, i) => (
                  <SelectItem key={p.label} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-name">Name</Label>
          <Input
            id="provider-name"
            className="h-10"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-key">API key</Label>
          <Input
            id="provider-key"
            className="h-10"
            type="password"
            autoComplete="off"
            placeholder={
              provider?.hasKey ? "Saved — type to replace" : keyHint
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="provider-url">Base URL</Label>
          <Input
            id="provider-url"
            className="h-10"
            inputMode="url"
            placeholder={
              kind === "anthropic"
                ? "Leave empty for api.anthropic.com"
                : "https://…/v1"
            }
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {kind === "anthropic"
              ? "Speaks Anthropic's own API, which lets Claude search the web by itself."
              : "Any server with an OpenAI-style /chat/completions endpoint."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="provider-models">Models, one per line</Label>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={fetchModels.isPending}
            onClick={() => fetchModels.mutate()}
          >
            {fetchModels.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Fetch models
          </Button>
        </div>
        <Textarea
          id="provider-models"
          className="min-h-24 font-mono text-sm"
          placeholder="The model names as the service knows them"
          value={modelsText}
          onChange={(e) => setModelsText(e.target.value)}
        />
        {offered && (
          <div className="flex flex-col gap-2 rounded-md border p-2">
            <Input
              className="h-10"
              placeholder={`Filter ${offered.length} models`}
              aria-label="Filter models"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <ul className="max-h-56 overflow-y-auto">
              {shown.map((model) => (
                <li key={model}>
                  <label className="flex min-h-10 items-center gap-3 px-1">
                    <Checkbox
                      checked={models.includes(model)}
                      onCheckedChange={(v) => toggleModel(model, v === true)}
                    />
                    <span className="min-w-0 break-all text-sm">{model}</span>
                  </label>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="p-2 text-sm text-muted-foreground">
                  No model matches.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-default">Default model</Label>
          <Select
            value={chosenDefault}
            onValueChange={setDefaultModel}
            disabled={models.length === 0}
          >
            <SelectTrigger id="provider-default" className="h-10">
              <SelectValue placeholder="Add a model first" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 sm:pt-6">
          <Switch
            id="provider-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="provider-enabled" className="font-normal">
            Offer this provider in the model picker
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={!chosenDefault || test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending && <Loader2 className="size-4 animate-spin" />}
          Test
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10"
          disabled={!name.trim() || models.length === 0 || save.isPending}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
