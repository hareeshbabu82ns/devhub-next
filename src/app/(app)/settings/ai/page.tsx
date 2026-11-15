"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AiSelection } from "@/lib/ai/config";
import type { WebSearchEngine } from "@/lib/ai/web-search";
import { AiModelSelect } from "@/components/features/ai/AiModelPicker";
import {
  aiModelsKey,
  useAiModels,
} from "@/components/features/ai/use-ai-models";
import {
  AiProviderSettings,
  deleteAiProvider,
  getAiAdminSettings,
  saveWebSearchSettings,
  setAppAiDefault,
  setUserAiDefault,
  testWebSearch,
} from "@/app/actions/ai-settings-actions";
import AiProviderForm from "./AiProviderForm";

const adminKey = ["aiAdminSettings"];

type Result = { status: "success" } | { status: "error"; error: string };

/** Shows a server action's error, and passes a success on. */
const settle = (onSuccess: () => void) => (result: Result) => {
  if (result.status === "error") toast.error(result.error);
  else onSuccess();
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-sm border p-4">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** Picks a default model, with a way back to "whatever the level above says". */
function DefaultModel({
  value,
  inherited,
  inheritLabel,
  onChange,
  pending,
}: {
  value: AiSelection | null;
  /** what applies when nothing is chosen here */
  inherited: string;
  inheritLabel: string;
  onChange: (selection: AiSelection | null) => void;
  pending: boolean;
}) {
  const { options } = useAiModels();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <AiModelSelect
        options={options}
        value={value}
        onChange={onChange}
        disabled={pending}
        className="w-full sm:w-80"
        placeholder={inherited ? `${inheritLabel}: ${inherited}` : inheritLabel}
      />
      {value && (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={pending}
          onClick={() => onChange(null)}
        >
          {inheritLabel}
        </Button>
      )}
    </div>
  );
}

function WebSearchSettings({
  initial,
}: {
  initial: { engine: WebSearchEngine; url: string; hasKey: boolean };
}) {
  const queryClient = useQueryClient();
  const [engine, setEngine] = useState(initial.engine);
  const [url, setUrl] = useState(initial.url);
  const [apiKey, setApiKey] = useState("");
  const needsKey = engine === "tavily" || engine === "brave";
  // a key saved for one engine is not the other engine's key
  const keySaved = initial.hasKey && engine === initial.engine;

  const save = useMutation({
    mutationFn: () =>
      saveWebSearchSettings({
        engine,
        url,
        apiKey: apiKey ? apiKey : keySaved ? undefined : "",
      }),
    onSuccess: settle(() => {
      toast.success("Web search saved");
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: adminKey });
    }),
  });
  const test = useMutation({
    mutationFn: testWebSearch,
    onSuccess: (result) => {
      if (result.status === "error") toast.error(result.error);
      else {
        toast.success(`Search works — first result: ${result.data[0]}`);
      }
    },
  });
  const dirty =
    engine !== initial.engine || url !== initial.url || apiKey !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="web-engine">Search engine</Label>
          <Select
            value={engine}
            onValueChange={(v) => setEngine(v as WebSearchEngine)}
          >
            <SelectTrigger id="web-engine" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duckduckgo">DuckDuckGo (no key)</SelectItem>
              <SelectItem value="tavily">Tavily (API key)</SelectItem>
              <SelectItem value="brave">Brave Search (API key)</SelectItem>
              <SelectItem value="searxng">SearXNG (your own)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {engine === "searxng" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="web-url">SearXNG URL</Label>
            <Input
              id="web-url"
              className="h-10"
              inputMode="url"
              placeholder="http://searxng.local:8080"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}
        {needsKey && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="web-key">API key</Label>
            <Input
              id="web-key"
              className="h-10"
              type="password"
              autoComplete="off"
              placeholder={keySaved ? "Saved — type to replace" : "API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {engine === "duckduckgo"
          ? "Works without an account, but DuckDuckGo limits automated searches. For filling a whole book, use one of the others."
          : engine === "searxng"
            ? "The instance must have the JSON output format enabled (search.formats in its settings.yml)."
            : engine === "tavily"
              ? "Returns the text of the pages along with the results, which gives the best explanations."
              : "Uses the Brave Search API; the pages found are then read by this server."}{" "}
        Claude models from an Anthropic provider do not use this: they search
        with Anthropic&apos;s own web search.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-10"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={dirty || test.isPending}
          title={dirty ? "Save first" : undefined}
          onClick={() => test.mutate()}
        >
          {test.isPending && <Loader2 className="size-4 animate-spin" />}
          Test search
        </Button>
      </div>
    </div>
  );
}

function AdminSettings() {
  const queryClient = useQueryClient();
  const ai = useAiModels();
  // "new", a provider id, or null when the form is closed
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, error } = useQuery({
    queryKey: adminKey,
    queryFn: async () => {
      const result = await getAiAdminSettings();
      if (result.status === "error") throw new Error(result.error);
      return result.data;
    },
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKey });
    queryClient.invalidateQueries({ queryKey: aiModelsKey });
  };

  const appDefault = useMutation({
    mutationFn: setAppAiDefault,
    onSuccess: settle(() => {
      toast.success("App default saved");
      refresh();
    }),
  });
  const remove = useMutation({
    mutationFn: deleteAiProvider,
    onSuccess: settle(() => {
      setConfirmDelete(null);
      refresh();
    }),
  });

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading providers…
      </p>
    );
  }

  const row = (provider: AiProviderSettings) =>
    editing === provider.id ? (
      <li key={provider.id}>
        <AiProviderForm
          provider={provider}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      </li>
    ) : (
      <li
        key={provider.id}
        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{provider.name}</span>
            <Badge variant="secondary">
              {provider.kind === "anthropic" ? "Anthropic" : "OpenAI-compatible"}
            </Badge>
            {!provider.enabled && <Badge variant="outline">Off</Badge>}
            {!provider.hasKey && <Badge variant="outline">No key</Badge>}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {provider.models.length} model
            {provider.models.length === 1 ? "" : "s"}: {provider.defaultModel}
            {provider.models.length > 1 ? " and others" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirmDelete === provider.id ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="h-10"
                disabled={remove.isPending}
                onClick={() => remove.mutate(provider.id)}
              >
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => setConfirmDelete(null)}
              >
                Keep
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={`Edit ${provider.name}`}
                disabled={editing !== null}
                onClick={() => setEditing(provider.id)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={`Delete ${provider.name}`}
                onClick={() => setConfirmDelete(provider.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </li>
    );

  return (
    <>
      <Section
        title="Providers"
        description="The AI services this app can use. API keys are stored encrypted on the server and are never shown again."
      >
        {data.providers.length > 0 && (
          <ul className="flex flex-col gap-3">{data.providers.map(row)}</ul>
        )}
        {data.environment && (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Server environment
            </span>{" "}
            — the provider set through AI_BASE_URL and AI_MODEL is also
            available. Change it in the server&apos;s environment.
          </p>
        )}
        {data.providers.length === 0 && !data.environment && (
          <p className="text-sm text-muted-foreground">
            No provider yet. Add one to turn on Ask AI, the knowledge index and
            Fill with AI.
          </p>
        )}
        {editing === "new" ? (
          <AiProviderForm
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 self-start"
            disabled={editing !== null}
            onClick={() => setEditing("new")}
          >
            <Plus className="size-4" />
            Add provider
          </Button>
        )}
      </Section>

      <Section
        title="App default"
        description="The model used by everyone who has not chosen their own, and by background work."
      >
        <DefaultModel
          value={ai.options?.appDefault ?? null}
          inherited=""
          inheritLabel={data.environment ? "Server environment" : "First provider"}
          pending={appDefault.isPending}
          onChange={(selection) => appDefault.mutate(selection)}
        />
      </Section>

      <Section
        title="Web search"
        description="How “search the web for explanations” finds pages when the chosen model cannot search by itself."
      >
        <WebSearchSettings
          key={`${data.webSearch.engine}:${data.webSearch.url}:${data.webSearch.hasKey}`}
          initial={data.webSearch}
        />
      </Section>
    </>
  );
}

export default function AiSettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const ai = useAiModels();
  const isAdmin = session?.user?.role === "ADMIN";

  const userDefault = useMutation({
    mutationFn: setUserAiDefault,
    onSuccess: settle(() => {
      toast.success("Your default saved");
      queryClient.invalidateQueries({ queryKey: aiModelsKey });
    }),
  });

  return (
    <div className="grid min-w-0 gap-6">
      <Section
        title="Your default model"
        description="Used for your AI requests unless you pick another model in the dialog. It follows you to every device."
      >
        {ai.configured === false ? (
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Add a provider below first."
              : "No AI provider is set up yet. Ask an admin to add one."}
          </p>
        ) : (
          <DefaultModel
            value={ai.options?.userDefault ?? null}
            inherited={ai.label(ai.options?.appDefault ?? ai.options?.default ?? null)}
            inheritLabel="App default"
            pending={userDefault.isPending}
            onChange={(selection) => userDefault.mutate(selection)}
          />
        )}
      </Section>
      {isAdmin && <AdminSettings />}
    </div>
  );
}
