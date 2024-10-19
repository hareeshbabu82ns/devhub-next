"use client";

import { TEXT_SIZE_DDLB } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { textSizeAtom } from "@/hooks/use-config";
import { useAtom } from "jotai";

export default function TextSizeSelector() {
  const [textSize, setTextSize] = useAtom(textSizeAtom);

  const selectedTextSize = TEXT_SIZE_DDLB.find(
    (lang) => lang.value === textSize,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-30">
          {selectedTextSize?.label || "TextSize..."}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-50" align="end">
        <DropdownMenuLabel>TextSize</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={textSize} onValueChange={setTextSize}>
          {TEXT_SIZE_DDLB.map((lang) => (
            <DropdownMenuRadioItem key={lang.value} value={lang.value}>
              {lang.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
