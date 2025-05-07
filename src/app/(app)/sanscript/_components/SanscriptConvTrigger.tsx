import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { InfoIcon } from "lucide-react";
import SanscriptConvertor from "./SanscriptConvertor";

interface SanscriptConvTriggerProps extends DialogProps {
  showTrigger?: boolean;
}

export default function SanscriptConvTrigger( {
  showTrigger = true,
  ...rest
}: SanscriptConvTriggerProps ) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        {showTrigger && (
          <Button
            variant="ghost"
            type="button"
            size="icon"
            className="text-muted-foreground"
          >
            <InfoIcon className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      {/* <DialogContent className="h-full md:h-min w-full md:w-5/6 max-w-none overflow-y-auto"> */}
      <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] sm:max-w-none flex flex-col overflow-y-auto">
        <SanscriptConvertor />
      </DialogContent>
    </Dialog>
  );
}
