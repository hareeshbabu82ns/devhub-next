"use client";

import { ChevronRight } from "lucide-react";
import { useMemo } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { JSX } from "react";
import { cn } from "@/lib/utils";

export type NavItemProps = {
  title: string;
  path: string;
  icon?: JSX.Element;
  isActive?: boolean;
  exact?: boolean;
  activeSearchParams?: Record<string, string | string[]>;
  items?: {
    title: string;
    path: string;
    isActive?: boolean;
    exact?: boolean;
    activeSearchParams?: Record<string, string | string[]>;
  }[];
};

export function NavMain({ items }: { items: NavItemProps[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, isMobile } = useSidebar();

  const isCollapsed = state === "collapsed";

  const checkSearchParamsMatch = (
    activeSearchParams?: Record<string, string | string[]>,
  ): boolean => {
    if (!activeSearchParams) return false;

    return Object.entries(activeSearchParams).some(([key, expectedValue]) => {
      const paramValue = searchParams.get(key);

      if (!paramValue) return false;

      if (Array.isArray(expectedValue)) {
        return expectedValue.includes(paramValue);
      }

      return paramValue === expectedValue;
    });
  };

  const itemsWithActiveState = useMemo(() => {
    return items.map((item) => {
      const isPathActive = item.exact
        ? pathname === item.path
        : pathname.startsWith(item.path);

      const isSearchParamsActive = checkSearchParamsMatch(
        item.activeSearchParams,
      );

      let isItemActive = isPathActive || isSearchParamsActive;

      if (item.items && item.items.length > 0) {
        const hasActiveSubItem = item.items.some((subItem) => {
          const isSubPathActive = subItem.exact
            ? pathname === subItem.path
            : pathname.startsWith(subItem.path);

          const isSubSearchParamsActive = checkSearchParamsMatch(
            subItem.activeSearchParams,
          );

          return isSubPathActive || isSubSearchParamsActive;
        });

        isItemActive = isItemActive || hasActiveSubItem;
      }

      return {
        ...item,
        isActive: isItemActive,
        items: item.items?.map((subItem) => {
          const isSubPathActive = subItem.exact
            ? pathname === subItem.path
            : pathname.startsWith(subItem.path);

          const isSubSearchParamsActive = checkSearchParamsMatch(
            subItem.activeSearchParams,
          );

          return {
            ...subItem,
            isActive: isSubPathActive || isSubSearchParamsActive,
          };
        }),
      };
    });
  }, [pathname, searchParams, items]);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {itemsWithActiveState.map((item) => {
          const hasChildren = item.items && item.items.length > 0;

          if (hasChildren && isCollapsed && !isMobile) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                      className={cn(
                        "text-sm sm:text-base min-h-11 touch-manipulation transition-all duration-300 rounded-xl",
                        item.isActive && "bg-primary/10 text-primary shadow-sm shadow-primary/10",
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center transition-transform duration-300",
                        item.isActive && "scale-110"
                      )}>
                        {item.icon}
                      </div>
                      <span className="sr-only">{item.title}</span>
                      {!isCollapsed && <ChevronRight className="ml-auto size-4 transition-transform duration-300" />}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-48 p-2 rounded-xl backdrop-blur-xl bg-sidebar/95 border-sidebar-border/50 shadow-xl">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.title}
                    </div>
                    {item.items?.map((subItem) => (
                      <DropdownMenuItem key={subItem.title} asChild>
                        <Link
                          href={subItem.path}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                            subItem.isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          {subItem.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          return hasChildren ? (
            <Collapsible
              key={item.title}
              asChild
              // defaultOpen={item.isActive}
              defaultOpen={true}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      "text-sm sm:text-base min-h-11 touch-manipulation transition-all duration-300 rounded-xl",
                      item.isActive && "bg-primary/10 text-primary shadow-sm shadow-primary/10",
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center transition-transform duration-300",
                      item.isActive && "scale-110"
                    )}>
                      {item.icon}
                    </div>
                    <span className={cn(
                      "transition-all duration-300 font-medium",
                      item.isActive && "font-semibold"
                    )}>
                      {item.title}
                    </span>
                    <ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={subItem.isActive}
                          className={cn(
                            "min-h-10 touch-manipulation transition-all duration-200 rounded-lg",
                            subItem.isActive ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <Link href={subItem.path} className="w-full">
                            <span className="truncate">{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
                className={cn(
                  "text-sm sm:text-base min-h-11 touch-manipulation transition-all duration-300 rounded-xl",
                  item.isActive && "bg-primary/10 text-primary shadow-sm shadow-primary/10",
                )}
              >
                <Link href={item.path} className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center transition-transform duration-300",
                    item.isActive && "scale-110"
                  )}>
                    {item.icon}
                  </div>
                  {isCollapsed ? <span className="sr-only">{item.title}</span> : <span className={cn(
                    "transition-all duration-300 font-medium",
                    item.isActive && "font-semibold"
                  )}>
                    {item.title}
                  </span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
