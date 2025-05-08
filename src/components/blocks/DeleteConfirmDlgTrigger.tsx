import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";

export const DeleteConfirmDlgTrigger = ( {
  onConfirm,
  children,
  title,
  description,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
} ) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? "Confirm Deletion"}</DialogTitle>
          <DialogDescription>
            {description ?? "Are you sure you want to delete this item?"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4">
          <DialogClose asChild>
            <Button onClick={onConfirm} variant="destructive" type="button">
              Delete
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button className="btn btn-secondary" type="button">
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
