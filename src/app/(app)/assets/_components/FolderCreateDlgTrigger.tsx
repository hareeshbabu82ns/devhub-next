import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogProps } from "@radix-ui/react-dialog";
import { FolderPlus as FolderCreateIcon } from "lucide-react";
import { useState } from "react";

interface FolderCreateDlgTriggerProps extends DialogProps {
  path?: string;
  loading?: boolean;
  onCreate?: ( name: string ) => void;
}

export default function FolderCreateDlgTrigger( {
  path,
  loading,
  onCreate,
  ...rest
}: FolderCreateDlgTriggerProps ) {
  const [ name, setName ] = useState( "New Folder" );
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button variant="ghost" type="button" size="icon" disabled={loading} title="Create Folder">
          <FolderCreateIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
          <DialogDescription>
            create folder at path <code>{path}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              type="search"
              value={name}
              onChange={( e ) => setName( e.target.value )}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onCreate && onCreate( name )}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
