"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtom } from "jotai";
import { panchangamTimelineViewAtom } from "@/hooks/use-config";
import { PANCHANGAM_TIMELINE_VIEW_MODES } from "@/lib/constants";
import { Monitor, Clock } from "lucide-react";

export default function PanchangamTimelineViewSelector() {
  const [selection, setSelection] = useAtom(panchangamTimelineViewAtom);

  const viewIcons = {
    advanced: <Monitor className="h-4 w-4" />,
    legacy: <Clock className="h-4 w-4" />,
  };

  const viewLabels = {
    advanced: "Advanced View",
    legacy: "Legacy View",
  };

  const handleChange = (value: string) => {
    if (value === "advanced" || value === "legacy") {
      setSelection(value);
    }
  };

  return (
    <Select value={selection} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Timeline View..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {PANCHANGAM_TIMELINE_VIEW_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              <div className="flex items-center gap-2">
                {viewIcons[mode]}
                <span className="capitalize">{viewLabels[mode]}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
