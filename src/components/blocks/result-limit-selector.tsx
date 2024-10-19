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
import { queryLimitAtom } from "@/hooks/use-config";
import { QUERY_RESULT_LIMITS } from "@/lib/constants";

export default function QueryResultsLimitSelector() {
  const [resultLimits, setResultLimits] = useAtom(queryLimitAtom);

  return (
    <Select value={resultLimits} onValueChange={setResultLimits}>
      <SelectTrigger>
        <SelectValue placeholder="Query Page Size..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {QUERY_RESULT_LIMITS.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
