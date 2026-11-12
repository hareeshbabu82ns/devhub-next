"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// the canvas is heavy; a verse page only pays for it once it is opened
const EntityPlaygroundDialog = dynamic(
  () => import("@/components/sanscript/playground/entity-playground-dialog"),
  { ssr: false },
);

/** Opens the Sanskrit playground for an entity, with its saved variations */
export default function EntityPlaygroundTrigger({
  entityId,
  text,
}: {
  entityId: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  // stays mounted after the first use, so closing does not lose unsaved work
  const [used, setUsed] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-xs"
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        title="Analyse this text in the Sanskrit playground"
      >
        <WorkflowIcon />
        Playground
      </Button>
      {used && (
        <EntityPlaygroundDialog
          open={open}
          onOpenChange={setOpen}
          entityId={entityId}
          text={text}
        />
      )}
    </>
  );
}
