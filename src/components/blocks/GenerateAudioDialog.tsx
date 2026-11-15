"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAudioPlayerContext } from "react-use-audio-player";
import { useLocalStorage } from "usehooks-ts";
import { toast } from "sonner";
import { AudioLines, RotateCcw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchSpeechOptions,
  fetchVerseSpeechSource,
  generateAudioForEntity,
} from "@/app/(app)/entities/actions";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";
import { LANGUAGE_FONT_FAMILY } from "@/lib/constants";
import {
  appLangForSpeech,
  DEFAULT_SPEECH_STYLE,
  pickSpeechLanguage,
  pickVoiceForLanguage,
  sortVoicesForLanguage,
  SPEECH_SPEEDS,
  speechAliasLabel,
  speechLangsOnVerse,
  speechModelLabel,
  speechSpeedLabel,
  speechStyleLabel,
  speechVoiceLabel,
  verseTextForSpeech,
  voiceCatalogFor,
} from "@/lib/audio/speech-options";
import { cn } from "@/lib/utils";
import DeleteAudioDialog from "./DeleteAudioDialog";

interface GenerateAudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  /** The verse, as shown in the dialog header. */
  title: string;
  subtitle?: string;
  onGenerated?: (audioUrl: string) => void;
}

/** What was used last, so a chapter can be recorded verse after verse. */
type AudioPrefs = {
  model?: string;
  style?: string;
  speed?: number;
  /** Voice per speech language. */
  voices?: Record<string, string>;
};
const LS_VERSE_AUDIO_PREFS = "verse-audio-prefs";

/** The wanted style when the model has it, else its neutral or first one. */
const pickStyle = (styles: string[], wanted?: string) =>
  [wanted, DEFAULT_SPEECH_STYLE].find(
    (s): s is string => !!s && styles.includes(s),
  ) ??
  styles[0] ??
  "";

type Preview = { url: string; autoPlay: boolean };

const SELECT_TRIGGER = "h-10 w-full [&>span]:truncate";
const SELECT_CONTENT = "max-h-72 max-w-[calc(100vw-2rem)]";

/**
 * Generates (or regenerates) a verse's recording: the text to read can be
 * edited, and model, language, voice, style and speed chosen from what the
 * speech server offers. The result plays here, in the dialog, and nowhere
 * else; the dialog stays open until "Done".
 *
 * Mount it only while it is open — every mount starts from the verse's text.
 */
export default function GenerateAudioDialog({
  open,
  onOpenChange,
  entityId,
  title,
  subtitle,
  onGenerated,
}: GenerateAudioDialogProps) {
  const id = useId();
  const appLanguage = useLanguageAtomValue();
  const invalidateEntities = useInvalidateEntities();
  const player = useAudioPlayerContext();
  const playerRef = useRef(player);
  playerRef.current = player;
  const [prefs, setPrefs] = useLocalStorage<AudioPrefs>(
    LS_VERSE_AUDIO_PREFS,
    {},
  );

  const options = useQuery({
    queryKey: ["speechOptions"],
    queryFn: () => fetchSpeechOptions(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // read once per opening and never invalidated: what is typed here must
  // survive the entity refetches that follow a generation
  const source = useQuery({
    queryKey: ["verseSpeechSource", entityId],
    queryFn: () => fetchVerseSpeechSource(entityId),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [language, setLanguage] = useState("");
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const [voice, setVoice] = useState("");
  const [style, setStyle] = useState("");
  const [speed, setSpeed] = useState(1);
  const [audioUrl, setAudioUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const previewRef = useRef<HTMLAudioElement>(null);

  // only one thing plays: the preview in here
  useEffect(() => {
    if (open) playerRef.current.pause();
  }, [open]);

  // the form is filled once, when the verse and the server's lists are in
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current || !options.data || !source.data) return;
    initialised.current = true;
    const o = options.data;
    const lang = pickSpeechLanguage(o.languages, source.data.texts, appLanguage);
    setLanguage(lang);
    setText(verseTextForSpeech(source.data.texts, lang));
    const startModel = o.models.some((m) => m.id === prefs.model)
      ? prefs.model!
      : o.defaultModel;
    const startCatalog = voiceCatalogFor(o, startModel);
    setModel(startModel);
    setVoice(pickVoiceForLanguage(startCatalog, lang, prefs.voices?.[lang]));
    setStyle(pickStyle(startCatalog.styles, prefs.style));
    setSpeed(SPEECH_SPEEDS.includes(prefs.speed ?? 1) ? (prefs.speed ?? 1) : 1);
    setAudioUrl(source.data.audio);
    setPreview(
      source.data.audio ? { url: source.data.audio, autoPlay: false } : null,
    );
  }, [options.data, source.data, appLanguage, prefs]);

  const generation = useMutation({
    mutationFn: async () => {
      const result = await generateAudioForEntity(entityId, {
        text,
        model,
        voice,
        style: style || undefined,
        speed,
      });
      if (result.status === "error") throw new Error(result.error);
      return result.data.audio;
    },
    onMutate: () => {
      playerRef.current.pause();
      previewRef.current?.pause();
    },
    onSuccess: (url) => {
      setAudioUrl(url);
      // the file keeps its name: the version makes the browser fetch it anew
      setPreview({ url: `${url}?v=${Date.now()}`, autoPlay: true });
      setPrefs((old) => ({
        model,
        style,
        speed,
        voices: { ...old.voices, [language]: voice },
      }));
      toast.success("Audio generated");
      onGenerated?.(url);
      // the verse has (new) audio: lists must pick that up
      invalidateEntities();
    },
    onError: (error) => {
      console.error("Audio generation failed:", error);
      toast.error(error.message || "Failed to generate audio");
    },
  });

  const o = options.data;
  const texts = source.data?.texts;
  const onVerse = speechLangsOnVerse(texts);
  const languages = (o?.languages ?? []).filter((l) => l.code !== "auto");
  // scripts the verse has come first
  const languageChoices = [
    ...languages.filter((l) => onVerse.has(l.code)),
    ...languages.filter((l) => !onVerse.has(l.code)),
  ];
  // voices and styles differ between models
  const catalog = o ? voiceCatalogFor(o, model) : undefined;
  const voices = sortVoicesForLanguage(catalog?.voices ?? [], language);
  const aliases = Object.entries(catalog?.aliases ?? {});
  const styles = catalog?.styles ?? [];
  const originalText = verseTextForSpeech(texts, language);
  const languageName =
    languages.find((l) => l.code === language)?.name ?? language;
  const appLang = appLangForSpeech(language);

  const changeLanguage = (code: string) => {
    if (!o) return;
    setLanguage(code);
    const verseText = verseTextForSpeech(texts, code);
    if (verseText) setText(verseText);
    setVoice(
      pickVoiceForLanguage(voiceCatalogFor(o, model), code, prefs.voices?.[code]),
    );
  };

  const changeModel = (next: string) => {
    if (!o) return;
    setModel(next);
    const nextCatalog = voiceCatalogFor(o, next);
    const known =
      nextCatalog.voices.some((v) => v.name === voice) ||
      voice in nextCatalog.aliases;
    if (!known) {
      setVoice(
        pickVoiceForLanguage(nextCatalog, language, prefs.voices?.[language]),
      );
    }
    if (!nextCatalog.styles.includes(style)) {
      setStyle(pickStyle(nextCatalog.styles, prefs.style));
    }
  };

  const busy = generation.isPending;
  // a language is chosen as soon as the form has been filled
  const ready = !!o && !!language;
  const loadError = options.error ?? source.error;
  const verseMissing = source.isSuccess && !source.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // stays open while the server is still working on the recording
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        // rendered in a portal, but clicks still bubble to the verse tile
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-4 overflow-y-auto p-4 sm:p-6"
      >
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>
            {audioUrl ? "Modify & regenerate audio" : "Generate audio"}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {[subtitle, title].filter(Boolean).join(" — ")}
          </DialogDescription>
        </DialogHeader>

        {!ready ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            {loadError || verseMissing ? (
              <>
                <p role="alert">
                  {verseMissing
                    ? "This verse could not be found."
                    : "Could not load the verse or the speech options."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    options.refetch();
                    source.refetch();
                  }}
                >
                  Try again
                </Button>
              </>
            ) : (
              <>
                <Spinner className="size-6" />
                <p>Loading speech options…</p>
              </>
            )}
          </div>
        ) : (
          <>
            {!o.live && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
              >
                <span>
                  The speech server did not answer, so these are the standard
                  options. Generating may fail until it is back.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={options.isFetching}
                  onClick={() => options.refetch()}
                >
                  {options.isFetching ? "Checking…" : "Retry"}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`${id}-text`}>Text to read</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={busy || !originalText || text === originalText}
                  onClick={() => setText(originalText)}
                >
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
              </div>
              <Textarea
                id={`${id}-text`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                rows={6}
                lang={language}
                className={cn(
                  "max-h-[40dvh] min-h-32 text-base leading-relaxed",
                  appLang &&
                    LANGUAGE_FONT_FAMILY[
                      appLang as keyof typeof LANGUAGE_FONT_FAMILY
                    ],
                )}
              />
              <p className="text-xs text-muted-foreground">
                {originalText
                  ? "Exactly this text is sent to the speech server. Edit it to fix how something is read."
                  : `This verse has no ${languageName} text. Type or paste what should be read.`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-language`}>Language / script</Label>
                <Select
                  value={language}
                  onValueChange={changeLanguage}
                  disabled={busy}
                >
                  <SelectTrigger id={`${id}-language`} className={SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {languageChoices.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                        {onVerse.has(l.code) ? " ✓ (on verse)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-voice`}>Voice</Label>
                <Select value={voice} onValueChange={setVoice} disabled={busy}>
                  <SelectTrigger id={`${id}-voice`} className={SELECT_TRIGGER}>
                    <SelectValue placeholder="Choose a voice" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {voices.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Voices</SelectLabel>
                        {voices.map((v) => (
                          <SelectItem key={v.name} value={v.name}>
                            {speechVoiceLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {aliases.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>OpenAI names</SelectLabel>
                        {aliases
                          .filter(([alias]) => !voices.some((v) => v.name === alias))
                          .map(([alias, target]) => (
                            <SelectItem key={alias} value={alias}>
                              {speechAliasLabel(alias, target)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-style`}>Delivery style / mood</Label>
                <Select
                  value={style}
                  onValueChange={setStyle}
                  disabled={busy || styles.length === 0}
                >
                  <SelectTrigger id={`${id}-style`} className={SELECT_TRIGGER}>
                    <SelectValue
                      placeholder={styles.length ? undefined : "Not offered by this model"}
                    />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {styles.map((s) => (
                      <SelectItem key={s} value={s}>
                        {speechStyleLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-model`}>Model</Label>
                  <Select value={model} onValueChange={changeModel} disabled={busy}>
                    <SelectTrigger id={`${id}-model`} className={SELECT_TRIGGER}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT}>
                      {o.models.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          title={m.description}
                        >
                          {speechModelLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-speed`}>Speed</Label>
                  <Select
                    value={String(speed)}
                    onValueChange={(v) => setSpeed(Number(v))}
                    disabled={busy}
                  >
                    <SelectTrigger id={`${id}-speed`} className={SELECT_TRIGGER}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT}>
                      {SPEECH_SPEEDS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {speechSpeedLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex min-h-14 flex-col justify-center gap-1.5">
              {busy ? (
                <div
                  role="status"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Spinner /> Generating audio… this can take a little while.
                </div>
              ) : preview ? (
                <>
                  <Label htmlFor={`${id}-preview`}>
                    {preview.autoPlay ? "New recording" : "Current recording"}
                  </Label>
                  <audio
                    id={`${id}-preview`}
                    key={preview.url}
                    ref={previewRef}
                    src={preview.url}
                    controls
                    autoPlay={preview.autoPlay}
                    className="h-10 w-full"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This verse has no recording yet.
                </p>
              )}
              {generation.isError && !busy && (
                <p role="alert" className="text-sm text-destructive">
                  {generation.error.message}
                </p>
              )}
            </div>
          </>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
          {audioUrl && (
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-destructive hover:text-destructive sm:mr-auto"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete Audio
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
          <Button
            type="button"
            className="h-10"
            disabled={!ready || busy || !text.trim() || !voice}
            onClick={() => generation.mutate()}
          >
            {busy ? <Spinner /> : <AudioLines />}
            {audioUrl ? "Regenerate Audio" : "Generate Audio"}
          </Button>
        </DialogFooter>

        <DeleteAudioDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          entityId={entityId}
          audioUrl={audioUrl}
          onDeleted={() => {
            setAudioUrl("");
            setPreview(null);
            generation.reset();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
