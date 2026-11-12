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
import { PANCHANGAM_PLACES } from "@/lib/constants";

export default function PanchangamPlaceSelector() {
  const [selection, setSelection] = useAtom(panchangamPlaceAtom);

  return (
    <Select value={selection} onValueChange={setSelection}>
      <SelectTrigger>
        <SelectValue placeholder="Select Place..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {PANCHANGAM_PLACES.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
