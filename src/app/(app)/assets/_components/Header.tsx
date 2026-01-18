"use client";

import { ChevronRight, Home, Plus, FolderPlus, Trash2, RefreshCw } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import FolderCreateDlgTrigger from "./FolderCreateDlgTrigger";
import { Fragment, useState } from "react";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import FileUploadDlgTrigger from "@/components/blocks/FileUploadDlgTrigger";
import { useMutation } from "@tanstack/react-query";
import { createFolder, deleteFolder } from "../actions";
import { useRouter } from "next/navigation";
import { UploadFileType } from "@/types";
import { cn } from "@/lib/utils";

const Header = ({
  path,
  accept,
  asSelector = false,
  onDeleted,
  refresh,
  onPathChange,
}: {
  path: string;
  accept?: UploadFileType[];
  asSelector?: boolean;
  onDeleted?: (path: string) => void;
  refresh?: () => void;
  onPathChange?: (path: string) => void;
}) => {
  const router = useRouter();
  const paths = path.split("/").filter(Boolean);

  const [openCreateDlg, setOpenCreateDlg] = useState(false);

  const { mutate: createFolderFn, isPending: loadingCreateFolder } =
    useMutation({
      mutationKey: ["createFolder", path],
      mutationFn: async (params: { name: string }) => {
        await createFolder(`${path}/${params.name}`);
      },
    });

  const { mutate: deleteFolderFn, isPending: loadingDeleteFolder } =
    useMutation({
      mutationKey: ["deleteFolder", path],
      mutationFn: async (params: { name: string }) => {
        await deleteFolder(
          params.name === path ? path : `${path}/${params.name}`,
        );
      },
    });

  const onCreateFolder = async (name: string) => {
    createFolderFn(
      { name },
      {
        onSuccess: () => {
          setOpenCreateDlg(false);
          if (asSelector) refresh?.(); else router.refresh();
        },
      },
    );
  };

  const onDeleteFolder = async () => {
    deleteFolderFn(
      { name: path },
      {
        onSuccess: () => {
          if (asSelector) {
            onDeleted?.(
              `/assets/${paths.slice(0, paths.length - 1).join("/")}`,
            );
          } else {
            router.replace(
              `/assets/${paths.slice(0, paths.length - 1).join("/")}`,
            );
          }
        },
      },
    );
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full backdrop-blur-xl bg-background/60 border-b border-border/40 transition-all",
      asSelector ? "px-1 py-2" : "px-6 py-4 rounded-xl border mb-6 shadow-sm"
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {!asSelector && <h1 className="font-bold text-2xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Assets Explorer</h1>}
          <PathNavigator path={path} onLinkClicked={onPathChange} />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <FileUploadDlgTrigger key={path} currentPath={path} accept={accept} />

          <FolderCreateDlgTrigger
            onCreate={onCreateFolder}
            loading={loadingCreateFolder}
            open={openCreateDlg}
            onOpenChange={setOpenCreateDlg}
          />

          <div className="h-6 w-px bg-border/60 mx-1" />

          <DeleteConfirmDlgTrigger
            onConfirm={onDeleteFolder}
            title={`Delete Folder: ${path}`}
            description="Are you sure you want to delete this folder and all its contents? This action cannot be undone."
          >
            {paths.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                disabled={loadingDeleteFolder}
                title="Delete Current Folder"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </DeleteConfirmDlgTrigger>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
            title="Refresh"
            onClick={() => (asSelector ? refresh && refresh() : router.refresh())}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

const PathNavigator = ({
  path,
  onLinkClicked,
}: {
  path: string;
  onLinkClicked?: (path: string) => void;
}) => {
  const paths = path.split("/").filter(Boolean);

  return (
    <nav className="flex items-center">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {paths.length === 0 ? (
              <BreadcrumbPage className="font-semibold flex items-center gap-1.5 text-primary">
                <Home className="size-3.5" />
                Root
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                onClick={onLinkClicked ? () => onLinkClicked(`/`) : undefined}
                href={onLinkClicked ? undefined : `/assets`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Home className="size-3.5" />
                Root
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {paths.map((path, index) => (
            <Fragment key={index}>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {index === paths.length - 1 ? (
                  <BreadcrumbPage className="font-semibold text-foreground/90">{path}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={
                      onLinkClicked
                        ? () =>
                          onLinkClicked(
                            `/${paths.slice(0, index + 1).join("/")}`,
                          )
                        : undefined
                    }
                    href={
                      onLinkClicked
                        ? undefined
                        : `/assets/${paths.slice(0, index + 1).join("/")}`
                    }
                    className="hover:text-primary transition-colors max-w-[100px] truncate md:max-w-none"
                  >
                    {path}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
};

export default Header;

