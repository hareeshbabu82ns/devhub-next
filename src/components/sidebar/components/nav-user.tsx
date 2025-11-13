"use client";

import { signOut } from "@/lib/auth/actions";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { avatarAltName } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAppVersion } from "@/hooks/use-app-version";

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const session = useSession();
  const { version, isLoading } = useAppVersion();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground min-h-10 touch-manipulation"
            >
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg shrink-0 group-data-[collapsible=icon]:size-8">
                <AvatarImage
                  src={session?.data?.user.image}
                  alt={session?.data?.user.name || ""}
                />
                <AvatarFallback className="rounded-lg">
                  {avatarAltName(session?.data?.user.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-semibold">
                  {session?.data?.user.name
                    ? session?.data?.user.name
                    : "User Not Found"}
                </span>
                <span className="truncate text-xs">
                  {session?.data?.user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage
                    src={session?.data?.user.image}
                    alt={session?.data?.user.name || ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {avatarAltName(session?.data?.user.name || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold">
                    {session?.data?.user.name
                      ? session?.data?.user.name
                      : "User Not Found"}
                  </span>
                  <span className="truncate text-xs">
                    {session?.data?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="min-h-10 touch-manipulation">
                <Sparkles className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                  {isLoading ? "Loading version..." : `Version: ${version}`}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="min-h-10 touch-manipulation"
              >
                <BadgeCheck className="mr-2 h-4 w-4 shrink-0" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-10 touch-manipulation">
                <CreditCard className="mr-2 h-4 w-4 shrink-0" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-10 touch-manipulation">
                <Bell className="mr-2 h-4 w-4 shrink-0" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="min-h-10 touch-manipulation"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
