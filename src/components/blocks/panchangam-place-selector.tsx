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
import { panchangamPlaceAtom } from "@/hooks/use-config";
import { PANCHANGAM_PLACE_IDS } from "@/lib/constants";

export default function PanchangamPlaceSelector() {
  const [selection, setSelection] = useAtom(panchangamPlaceAtom);

  return (
    <Select value={selection} onValueChange={setSelection}>
      <SelectTrigger>
        <SelectValue placeholder="Select Place..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {PANCHANGAM_PLACE_IDS.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
