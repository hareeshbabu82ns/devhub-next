import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { CopyPlusIcon as BulkCreateIcon } from "lucide-react";
import EntityBulkCreator from "./EntityBulkCreator";
import { EntityTypeEnum } from "@/lib/types";

interface EntityBulkCreatorTriggerProps extends DialogProps {
  parentId?: string;
  parentType?: EntityTypeEnum;
}

export default function EntityBulkCreatorTrigger({
  parentId,
  parentType,
  ...rest
}: EntityBulkCreatorTriggerProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" size="icon">
          <BulkCreateIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="h-full md:h-[95%] w-full md:w-5/6 max-w-none overflow-y-auto">
        {/* <DialogContent className="w-full sm:w-5/6 h-full sm:h-[95%] max-w-none flex flex-col overflow-y-auto"> */}
        <EntityBulkCreator parentId={parentId} parentType={parentType} />
      </DialogContent>
    </Dialog>
  );
}
