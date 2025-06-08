"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import SanscriptHelp from "./SanscriptHelp";
import { InfoIcon } from "lucide-react";

interface SanscriptHelpTriggerProps extends DialogProps {
  language: string;
}

export default function SanscriptHelpTrigger({
  language,
  ...rest
}: SanscriptHelpTriggerProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          size="icon"
          className="text-muted-foreground"
          title="Key Helper (CTRL + I)"
        >
          <InfoIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="h-full md:h-min w-full md:min-w-2xl overflow-y-auto">
        <DialogTitle className="hidden">Sanscript Helper Info</DialogTitle>
        {/* <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] max-w-none flex flex-col overflow-y-auto"> */}
        <SanscriptHelp language={language} />
      </DialogContent>
    </Dialog>
  );
}
