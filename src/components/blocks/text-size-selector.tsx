import { useLocalStorage } from "usehooks-ts";
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

export const TEXT_SIZE_SELECT_KEY = "textSize";
export const TEXT_SIZE_SELECT_DEFAULT = "md";

export default function TextSizeSelector() {
  const [textSize, setTextSize] = useLocalStorage(
    TEXT_SIZE_SELECT_KEY,
    TEXT_SIZE_SELECT_DEFAULT,
  );
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
