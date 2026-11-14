import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { Dialog as DialogPrimitive } from "radix-ui";

type DialogProps = DialogPrimitive.DialogProps;
import { BookA as DictionaryIcon } from "lucide-react";
import DictionaryView from "./DictionaryView";

interface DictionaryTriggerProps extends DialogProps {
  showTrigger?: boolean;
}

export default function DictionaryTrigger( {
  showTrigger = true,
  ...rest
}: DictionaryTriggerProps ) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        {showTrigger && (
          <Button variant="outline" type="button" size="icon">
            <DictionaryIcon className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] sm:max-w-none flex flex-col overflow-y-auto">
        <DictionaryView asBrowse />
      </DialogContent>
    </Dialog>
  );
}
