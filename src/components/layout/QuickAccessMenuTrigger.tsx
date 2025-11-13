import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookA as DictionaryIcon,
  FilePenLineIcon as SanscriptIcon,
} from "lucide-react";
import { SquareMenuIcon as SettingsIcon } from "lucide-react";
import { useState } from "react";
import DictionaryTrigger from "@/app/(app)/dictionary/_components/DictionaryDlgTrigger";
import SanscriptConvTrigger from "@/app/(app)/sanscript/_components/SanscriptConvTrigger";

export default function QuickAccessMenuTrigger() {
  const [dictOpen, setDictOpen] = useState(false);
  const [sansConvOpen, setSansConvOpen] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="min-h-6 min-w-6 sm:h-10 sm:w-10 touch-manipulation"
        >
          <SettingsIcon className="size-5 sm:size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setDictOpen((open) => !open)}
          className="min-h-10 touch-manipulation"
        >
          <DictionaryIcon className="mr-2 h-4 w-4 shrink-0" />
          <span>Dictionary</span>
          <DropdownMenuShortcut>^D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setSansConvOpen((open) => !open)}
          className="min-h-10 touch-manipulation"
        >
          <SanscriptIcon className="mr-2 h-4 w-4 shrink-0" />
          <span>Sanscript</span>
          <DropdownMenuShortcut>^S</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <DictionaryTrigger
        showTrigger={false}
        open={dictOpen}
        onOpenChange={setDictOpen}
      />
      <SanscriptConvTrigger
        showTrigger={false}
        open={sansConvOpen}
        onOpenChange={setSansConvOpen}
      />
    </DropdownMenu>
  );
}
