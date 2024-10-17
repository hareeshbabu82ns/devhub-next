import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
// import { ScanSearch as AddIcon } from "lucide-react";
import { Entity } from "@/lib/types";
import { DialogProps } from "@radix-ui/react-dialog";
import SlokamDetails from "./SlokamDetails";

interface SlokamDisplayDlgTriggerProps extends DialogProps {
  triggerTitle?: string;
  dialogTitle?: string;
  forSlokamId: string;
  onClick?: (entity: Entity) => void | undefined;
  onDeleteClicked?: (entity: Entity) => void | undefined;
}
export default function SlokamDisplayDlgTrigger({
  triggerTitle,
  forSlokamId,
  ...rest
}: SlokamDisplayDlgTriggerProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          size="icon"
          className="text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {triggerTitle}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] max-w-none flex flex-col overflow-y-auto">
        <SlokamDetails slokamId={forSlokamId} />
      </DialogContent>
    </Dialog>
  );
}
