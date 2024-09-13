"use client";

import { Slash } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import FolderCreateDlgTrigger from "./FolderCreateDlgTrigger";
import { Fragment, useState } from "react";
import { FolderX as FolderDeleteIcon } from "lucide-react";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import FileUploadDlgTrigger from "@/components/blocks/FileUploadDlgTrigger";
import { useMutation } from "@tanstack/react-query";
import { createFolder, deleteFolder } from "../actions";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/utils/icons";

const Header = ({ path }: { path: string }) => {
  const router = useRouter();
  const paths = path.split("/").filter(Boolean);

  const [openCreateDlg, setOpenCreateDlg] = useState(false);
  // const [createFolder, { loading: loadingCreateFolder }] =
  //   useMutation(CREATE_FOLDER);
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

  // const [deleteFolder, { loading: loadingDeleteFolder }] =
  //   useMutation(DELETE_FOLDER);

  const onCreateFolder = async (name: string) => {
    createFolderFn(
      { name },
      {
        onSuccess: () => {
          setOpenCreateDlg(false);
          router.refresh();
        },
      },
    );
  };

  const onDeleteFolder = async () => {
    deleteFolderFn(
      { name: path },
      {
        onSuccess: () => {
          router.replace(
            `/assets/${paths.slice(0, paths.length - 1).join("/")}`,
          );
        },
      },
    );

    // const res = await deleteFolder({
    //   variables: { path: `${path}` },
    // });
    // if (res.data?.deleteFolder) {
    //   setParams((params) =>
    //     updateSearchParams(params, {
    //       path: paths.slice(0, paths.length - 1).join("/"),
    //     }),
    //   );
    // } else
    //   toast({
    //     title: "Failed to delete folder",
    //     variant: "destructive",
    //   });
  };

  return (
    <header className="flex items-center justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-xl">Assets Explorer</h1>
        <PathNavigator path={path} />
      </div>

      <div className="px-5 flex space-x-2 items-center">
        <FileUploadDlgTrigger key={path} currentPath={path} />

        <FolderCreateDlgTrigger
          onCreate={onCreateFolder}
          loading={loadingCreateFolder}
          open={openCreateDlg}
          onOpenChange={setOpenCreateDlg}
        />
        <DeleteConfirmDlgTrigger
          onConfirm={onDeleteFolder}
          title={`Delete Folder: ${path}`}
          description="Are you sure you want to delete this folder?"
        >
          {paths.length > 0 && (
            <Button
              variant="ghost"
              type="button"
              size="icon"
              disabled={loadingDeleteFolder}
            >
              <FolderDeleteIcon className="size-5" />
            </Button>
          )}
        </DeleteConfirmDlgTrigger>
        <Button
          variant="ghost"
          type="button"
          size="icon"
          onClick={() => router.refresh()}
        >
          <Icons.refresh className="size-5" />
        </Button>
      </div>
    </header>
  );
};

const PathNavigator = ({ path }: { path: string }) => {
  // const searchParams = useSearchParams();
  // const paths = (searchParams?.get("path") || "/").split("/").filter(Boolean);
  const paths = path.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem key={"/"}>
            {paths.length === 0 ? (
              <p className="font-bold text-secondary">Root</p>
            ) : (
              <BreadcrumbLink href={`/assets`}>Root</BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {paths.map((path, index) => (
            <Fragment key={index}>
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
              <BreadcrumbItem key={index}>
                {index === paths.length - 1 ? (
                  <p className="font-bold text-secondary">{path}</p>
                ) : (
                  <BreadcrumbLink
                    href={`/assets/${paths.slice(0, index + 1).join("/")}`}
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
