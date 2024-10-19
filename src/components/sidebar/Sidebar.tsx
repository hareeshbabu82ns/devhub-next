"use client";

import { Button } from "../ui/button";
import Links from "@/components/sidebar/components/Links";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { IRoute } from "@/types";
import { useRouter } from "next/navigation";
import React, { PropsWithChildren, useEffect } from "react";
import { HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import { useSession } from "next-auth/react";
import { signOut } from "@/lib/auth/actions";
import { Icons } from "@/components/utils/icons";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import AudioPlayer from "../audio-player/player";

export interface SidebarProps extends PropsWithChildren {
  routes: IRoute[];
  [x: string]: any;
}
interface SidebarLinksProps extends PropsWithChildren {
  routes: IRoute[];
  [x: string]: any;
}

function Sidebar(props: SidebarProps) {
  const router = useRouter();
  const session = useSession();
  const { routes } = props;

  const fixedSidebar = useMediaQuery("(min-width: 1280px)");
  const [open, setOpen] = React.useState(props.open);

  useEffect(() => {
    setOpen(props.open);
  }, [props.open]);

  // SIDEBAR
  return fixedSidebar ? (
    <div className="fixed left-0 top-0 min-h-full w-72">
      <SidebarContent {...props} routes={routes} />
    </div>
  ) : (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="hidden">
          <SheetTitle>DevHub</SheetTitle>
        </SheetHeader>
        <SidebarContent {...props} routes={routes} />
      </SheetContent>
    </Sheet>
  );
}

function SidebarContent(props: SidebarProps) {
  const router = useRouter();
  const session = useSession();
  const { routes } = props;

  // SIDEBAR
  return (
    <Card className={`h-svh w-full overflow-y-auto rounded-none`}>
      <div className="flex h-full flex-col justify-between">
        <div>
          <div
            className={`flex items-center h-[theme(spacing.14)] border-b pl-4`}
          >
            <div className="bg-primary text-primary-foreground me-2 flex size-8 items-center justify-center rounded-md">
              <Icons.logo className="size-5" />
            </div>
            <h5 className="text-card-foreground me-2 text-2xl font-bold leading-5">
              DevHub
            </h5>
          </div>
          {/* Nav item */}
          <ul className="mt-6 px-2">
            <Links routes={routes} />
          </ul>
        </div>
        {/* Free Horizon Card    */}
        <div className="mb-2 mt-4">
          {/* <div className="flex justify-center">
              <SidebarCard />
            </div> */}
          <AudioPlayer className="hidden xl:flex" />
          {/* Sidebar profile info */}
          <div className="flex items-center rounded-none border-t px-4 h-[theme(spacing.14)]">
            <a href="/settings">
              <Avatar className="min-h-10 min-w-10">
                <AvatarImage src={session?.data?.user.image ?? ""} />
                <AvatarFallback className="font-bold">US</AvatarFallback>
              </Avatar>
            </a>
            <a href="/settings">
              <p className="ml-2 mr-3 flex items-center text-sm font-semibold leading-none">
                {session?.data?.user.name
                  ? session?.data?.user.name
                  : "User Not Found"}
              </p>
            </a>
            <Button
              variant="ghost"
              className="ml-auto flex size-[40px] cursor-pointer items-center justify-center p-0 text-center text-sm font-medium"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              <HiOutlineArrowRightOnRectangle
                className="size-4 stroke-2"
                width="16px"
                height="16px"
                color="inherit"
              />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default Sidebar;
