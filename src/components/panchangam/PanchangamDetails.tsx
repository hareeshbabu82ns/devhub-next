/**
 * PanchangamDetails: the day's summary — five limbs, sun & moon,
 * calendar facts, festivals and muhurta segments.
 */

import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Moon,
  MoonStar,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { format } from "date-fns";
import type {
  PanchangElement,
  PanchangamData,
  TimedSegment,
} from "@/types/panchangam";
import { parseTime } from "@/lib/panchangam/time";
import {
  currentElementIndex,
  currentSegmentIndex,
  moonPhaseFromTithi,
  tithiNumber,
} from "@/lib/panchangam/day-model";
import { MoonPhase } from "./MoonPhase";
import { TimeText } from "./TimeText";

export interface PanchangamDetailsProps {
  date: Date | undefined;
  panchangamData: PanchangamData;
  /** minutes since local midnight, only when viewing today */
  nowMin?: number;
  /**
   * "summary": hero, festivals, limbs. "more": sun & moon, calendar,
   * segments. Lets the page interleave the timeline on narrow screens.
   */
  part?: "all" | "summary" | "more";
  className?: string;
}

export function PanchangamDetails({
  date,
  panchangamData: data,
  nowMin,
  part = "all",
  className,
}: PanchangamDetailsProps) {
  const showSummary = part !== "more";
  const showMore = part !== "summary";
  const { panchang } = data.day;
  const elements = data.elements ?? {
    tithi: [{ name: panchang.tithiToday.name, end: panchang.tithiToday.end }],
    nakshatra: [
      { name: panchang.nakshatraToday.name, end: panchang.nakshatraToday.end },
    ],
    yoga: [],
    karana: [],
  };
  const tithiNo = tithiNumber(elements.tithi[0]?.name ?? "", panchang.paksha);
  const samvatsara =
    data.calendar?.shakaSamvat?.replace(/^\d+\s*/, "") || data.year;

  return (
    <div className={cn("@container/details flex flex-col gap-4", className)}>
      {showSummary && (
        <>
          {/* Hero */}
          <section className="flex items-start gap-3">
            {tithiNo !== undefined ? (
              <MoonPhase
                phase={moonPhaseFromTithi(tithiNo)}
                className="size-12"
                title={`${panchang.paksha} ${elements.tithi[0]?.name}`}
              />
            ) : (
              <MoonStar className="size-12 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {panchang.weekday}
                {date && ` · ${format(date, "EEE, d MMM yyyy")}`}
              </div>
              <h3 className="text-lg font-semibold leading-snug sm:text-xl">
                {panchang.paksha} {elements.tithi[0]?.name}
              </h3>
              <div className="text-sm text-muted-foreground">
                {data.calendar?.amanta || data.month} Masa · {samvatsara}{" "}
                Samvatsara
              </div>
            </div>
          </section>

          {data.festivals && data.festivals.length > 0 && (
            <section
              aria-label="Festivals and events"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <Sparkles className="size-3.5" />
                Festivals &amp; Events
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {data.festivals.map((f) => (
                  <li key={f.name}>
                    <Badge
                      variant="outline"
                      className="h-auto whitespace-normal border-amber-500/40 bg-background/60 py-1 text-left font-medium"
                    >
                      {f.name}
                      {f.hint && (
                        <span className="ml-1 font-normal text-muted-foreground">
                          · {f.hint}
                        </span>
                      )}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Five limbs (Vara is in the hero) */}
          <section
            aria-label="Panchang"
            className="grid grid-cols-2 gap-2 @lg/details:grid-cols-4"
          >
            <LimbCard label="Tithi" list={elements.tithi} nowMin={nowMin} />
            <LimbCard
              label="Nakshatra"
              list={elements.nakshatra}
              nowMin={nowMin}
            />
            <LimbCard label="Yoga" list={elements.yoga} nowMin={nowMin} />
            <LimbCard label="Karana" list={elements.karana} nowMin={nowMin} />
          </section>
        </>
      )}

      {showMore && (
        <>
          {/* Sun & Moon */}
          <section
            aria-label="Sun and moon"
            className="grid grid-cols-2 gap-x-2 gap-y-3 rounded-lg border p-3 @lg/details:grid-cols-4"
          >
            <CelestialRow
              icon={<Sunrise className="size-4 text-amber-500" />}
              label="Sunrise"
              value={data.day.sun.start}
            />
            <CelestialRow
              icon={<Sunset className="size-4 text-orange-500" />}
              label="Sunset"
              value={data.day.sun.end}
            />
            <CelestialRow
              icon={<Moon className="size-4 text-sky-500" />}
              label="Moonrise"
              value={data.day.moon.start}
            />
            <CelestialRow
              icon={<Moon className="size-4 text-indigo-400 opacity-70" />}
              label="Moonset"
              value={data.day.moon.end}
            />
            {(data.dayLength?.dinamana || data.dayLength?.ratrimana) && (
              <div className="col-span-full flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
                {data.dayLength?.dinamana && (
                  <span className="flex items-center gap-1">
                    <Sun className="size-3.5" /> Day{" "}
                    <b className="font-medium text-foreground">
                      {shortDuration(data.dayLength.dinamana)}
                    </b>
                  </span>
                )}
                {data.dayLength?.ratrimana && (
                  <span className="flex items-center gap-1">
                    <MoonStar className="size-3.5" /> Night{" "}
                    <b className="font-medium text-foreground">
                      {shortDuration(data.dayLength.ratrimana)}
                    </b>
                  </span>
                )}
                {data.dayLength?.madhyahna && (
                  <span>
                    Madhyahna{" "}
                    <b className="font-medium text-foreground">
                      {data.dayLength.madhyahna}
                    </b>
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Calendar facts */}
          <section aria-label="Calendar">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm @lg/details:grid-cols-3">
              <Fact label="Vara" value={panchang.weekday} />
              <Fact label="Paksha" value={panchang.paksha} />
              <Fact
                label="Masa"
                value={data.calendar?.amanta || data.month}
                hint={
                  data.calendar?.purnimanta &&
                  data.calendar.purnimanta !== data.calendar.amanta
                    ? `${data.calendar.purnimanta} (Purnimanta)`
                    : "Amanta"
                }
              />
              <Fact
                label="Samvatsara"
                value={samvatsara}
                hint={[
                  data.calendar?.shakaSamvat &&
                    `Shaka ${data.calendar.shakaSamvat.split(" ")[0]}`,
                  data.calendar?.vikramSamvat &&
                    `Vikram ${data.calendar.vikramSamvat.split(" ")[0]}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Fact
                label="Ayana"
                value={data.calendar?.drikAyana || data.ayana}
              />
              <Fact
                label="Ritu"
                value={data.calendar?.drikRitu || data.ritu}
                hint={
                  data.calendar?.vedicRitu &&
                  `Vedic: ${data.calendar.vedicRitu}`
                }
              />
              <Fact label="Moon sign" value={data.rashi?.moonsign} />
              <Fact
                label="Sun sign"
                value={data.rashi?.sunsign}
                hint={
                  data.rashi?.suryaNakshatra &&
                  `in ${data.rashi.suryaNakshatra} Nakshatra`
                }
              />
              <Fact label="Disha Shool" value={data.dishaShool} />
            </dl>
          </section>

          {/* Segments */}
          {((data.panchaka?.length ?? 0) > 0 ||
            (data.lagna?.length ?? 0) > 0) && (
            <Accordion type="multiple" className="rounded-lg border px-3">
              {data.panchaka && data.panchaka.length > 0 && (
                <AccordionItem value="panchaka">
                  <AccordionTrigger className="min-h-11 py-3 text-sm">
                    Panchaka Rahita Muhurta
                  </AccordionTrigger>
                  <AccordionContent>
                    <SegmentList segments={data.panchaka} nowMin={nowMin} />
                  </AccordionContent>
                </AccordionItem>
              )}
              {data.lagna && data.lagna.length > 0 && (
                <AccordionItem value="lagna" className="border-b-0">
                  <AccordionTrigger className="min-h-11 py-3 text-sm">
                    Udaya Lagna
                  </AccordionTrigger>
                  <AccordionContent>
                    <SegmentList
                      segments={data.lagna}
                      nowMin={nowMin}
                      neutral
                    />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </>
      )}
    </div>
  );
}

function LimbCard({
  label,
  list,
  nowMin,
}: {
  label: string;
  list: PanchangElement[];
  nowMin?: number;
}) {
  if (!list.length) return null;
  const current = nowMin !== undefined ? currentElementIndex(list, nowMin) : -1;

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ol className="mt-1 space-y-1">
        {list.map((el, i) => (
          <li
            key={`${el.name}-${i}`}
            className={cn(
              "flex flex-wrap items-baseline gap-x-1.5 leading-tight",
              i > 0 && "text-sm",
              current >= 0 && i !== current && "opacity-60",
            )}
          >
            {i > 0 && (
              <ArrowRight className="size-3 shrink-0 self-center text-muted-foreground" />
            )}
            <span className={cn(i === 0 ? "font-semibold" : "font-medium")}>
              {el.name}
            </span>
            {i === current && (
              <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold uppercase text-primary">
                now
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {el.fullNight ? (
                "full night"
              ) : el.endMin !== undefined ? (
                <>
                  till <TimeText min={el.endMin} />
                </>
              ) : el.end ? (
                `till ${el.end}`
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CelestialRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const t = parseTime(value);
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="leading-tight">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">
          {t ? <TimeText min={t.min} /> : value || "—"}
        </div>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string | false;
}) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium leading-tight">{value}</dd>
      {hint && (
        <dd className="text-xs leading-tight text-muted-foreground">{hint}</dd>
      )}
    </div>
  );
}

function SegmentList({
  segments,
  nowMin,
  neutral,
}: {
  segments: TimedSegment[];
  nowMin?: number;
  neutral?: boolean;
}) {
  const current =
    nowMin !== undefined ? currentSegmentIndex(segments, nowMin) : -1;
  return (
    <ul className="space-y-1">
      {segments.map((s, i) => (
        <li
          key={`${s.name}-${i}`}
          className={cn(
            "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
            !neutral &&
              (s.good
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "text-muted-foreground"),
            i === current && "ring-2 ring-primary/60",
          )}
        >
          <span className="font-medium">
            {s.name}
            {i === current && (
              <span className="ml-1.5 rounded bg-primary/15 px-1 text-[10px] font-semibold uppercase text-primary">
                now
              </span>
            )}
          </span>
          <span className="text-xs">
            <TimeText min={s.startMin} /> – <TimeText min={s.endMin} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "09 Hours 04 Mins 17 Secs" -> "9h 04m" */
function shortDuration(value: string) {
  const h = /(\d+)\s*Hour/i.exec(value)?.[1];
  const m = /(\d+)\s*Min/i.exec(value)?.[1];
  if (!h && !m) return value;
  return `${Number(h ?? 0)}h ${String(Number(m ?? 0)).padStart(2, "0")}m`;
}
