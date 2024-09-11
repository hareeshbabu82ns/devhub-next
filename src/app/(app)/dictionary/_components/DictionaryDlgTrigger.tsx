import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { BookA as DictionaryIcon } from "lucide-react";
import DictionaryPage from "../page";

interface DictionaryTriggerProps extends DialogProps {
  showTrigger?: boolean;
}

export default function DictionaryTrigger({
  showTrigger = true,
  ...rest
}: DictionaryTriggerProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        {showTrigger && (
          <Button variant="outline" type="button" size="icon">
            <DictionaryIcon className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] max-w-none flex flex-col overflow-y-auto">
        <DictionaryPage asBrowse />
      </DialogContent>
    </Dialog>
  );
}
