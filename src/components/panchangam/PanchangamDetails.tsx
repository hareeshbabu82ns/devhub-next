/**
 * PanchangamDetails component for displaying day details and panchang information
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon } from "lucide-react";
import { format } from "date-fns";
import type { PanchangamData } from "@/types/panchangam";

export interface PanchangamDetailsProps {
  date: Date | undefined;
  panchangamData: PanchangamData;
  className?: string;
}

/**
 * Component to display detailed Panchangam information including panchang,
 * tithi, nakshatra, and celestial times
 */
export function PanchangamDetails({
  date,
  panchangamData,
  className,
}: PanchangamDetailsProps) {
  const { day, month, year, ayana, ritu } = panchangamData;
  const { panchang, sun, moon } = day;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Day Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Info */}
        <div className="space-y-2 flex flex-row gap-2">
          <div className="text-sm font-medium text-muted-foreground">Date:</div>
          <div className="text-base font-semibold">
            {date ? format(date, "EEEE, MMMM d, yyyy") : ""}
          </div>
        </div>

        <Separator />

        {/* Panchang Info */}
        <div className="space-y-3">
          <div className="text-sm space-y-1">
            <PanchangInfoRow label="Varam" value={panchang.weekday} />
            <PanchangInfoRow label="Paksham" value={panchang.paksha} />
            <PanchangInfoRow label="Masam" value={month} />
            <PanchangInfoRow label="Ayana" value={ayana} />
            <PanchangInfoRow label="Ritu" value={ritu} />
            <PanchangInfoRow label="Samvatsaram" value={year} />
          </div>
        </div>

        <Separator />

        {/* Tithi */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Tithi</div>
          <div className="flex items-baseline gap-2">
            <Badge className="text-xs">{panchang.tithiToday.name}</Badge>
            <span className="text-xs text-muted-foreground">
              until {panchang.tithiToday.end}
            </span>
          </div>
          {panchang.tithiNext && (
            <div className="text-xs text-muted-foreground">
              Then: {panchang.tithiNext.name}
            </div>
          )}
        </div>

        <Separator />

        {/* Nakshatra */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Nakshatra
          </div>
          <div className="flex items-baseline gap-2">
            <Badge variant="secondary" className="text-xs">
              {panchang.nakshatraToday.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              until {panchang.nakshatraToday.end}
            </span>
          </div>
          {panchang.nakshatraNext && (
            <div className="text-xs text-muted-foreground">
              Then: {panchang.nakshatraNext.name}
            </div>
          )}
        </div>

        <Separator />

        {/* Celestial Times */}
        <div className="space-y-3">
          <CelestialTimeDisplay
            icon={<Sun className="h-5 w-5 text-orange-500 mt-0.5" />}
            title="Surya (Sun)"
            rise={sun.start}
            set={sun.end}
          />

          <CelestialTimeDisplay
            icon={<Moon className="h-5 w-5 text-blue-400 mt-0.5" />}
            title="Chandra (Moon)"
            rise={moon.start}
            set={moon.end}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper component for displaying a single panchang info row
 */
function PanchangInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-row gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/**
 * Helper component for displaying celestial times (sun/moon rise and set)
 */
function CelestialTimeDisplay({
  icon,
  title,
  rise,
  set,
}: {
  icon: React.ReactNode;
  title: string;
  rise: string;
  set: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">
          Rise: {rise} • Set: {set}
        </div>
      </div>
    </div>
  );
}
