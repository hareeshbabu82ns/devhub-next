"use client";

import { useLocalStorage } from "usehooks-ts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const QUERY_RESULT_LIMIT_KEY = "resultLimits";
export const QUERY_RESULT_LIMIT_DEFAULT = "10";
export const QUERY_RESULT_LIMITS = ["10", "25", "50", "100", "150", "200"];

export default function QueryResultsLimitSelector() {
  const [resultLimits, setResultLimits] = useLocalStorage(
    QUERY_RESULT_LIMIT_KEY,
    QUERY_RESULT_LIMIT_DEFAULT,
  );

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
