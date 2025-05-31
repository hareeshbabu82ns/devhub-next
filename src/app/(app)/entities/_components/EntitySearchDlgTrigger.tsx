import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScanSearch as AddIcon } from "lucide-react";
import EntitySearchTiles from "./EntitySearchTiles";
import { Entity, EntityTypeEnum } from "@/lib/types";
import { DialogProps } from "@radix-ui/react-dialog";

interface EntitySearchDlgTriggerProps extends DialogProps {
  forTypes?: EntityTypeEnum[];
  onClick?: (entity: Entity) => void | undefined;
  onDeleteClicked?: (entity: Entity) => void | undefined;
}
export default function EntitySearchDlgTrigger({
  forTypes,
  onClick,
  onDeleteClicked,
  ...rest
}: EntitySearchDlgTriggerProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" size="icon">
          <AddIcon className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:w-5/6 sm:h-5/6 h-full sm:max-w-none flex flex-col overflow-auto">
        <DialogHeader>
          <DialogTitle>Search Entities</DialogTitle>
        </DialogHeader>
        <EntitySearchTiles
          forTypes={forTypes}
          onTileClicked={onClick}
          onDeleteClicked={onDeleteClicked}
        />
      </DialogContent>
    </Dialog>
  );
}
