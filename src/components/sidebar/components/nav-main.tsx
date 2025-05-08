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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { JSX } from "react";

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

export function NavMain( {
  items,
}: {
  items: NavItemProps[];
} ) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkSearchParamsMatch = ( activeSearchParams?: Record<string, string | string[]> ): boolean => {
    if ( !activeSearchParams ) return false;

    return Object.entries( activeSearchParams ).some( ( [ key, expectedValue ] ) => {
      const paramValue = searchParams.get( key );

      if ( !paramValue ) return false;

      if ( Array.isArray( expectedValue ) ) {
        return expectedValue.includes( paramValue );
      }

      return paramValue === expectedValue;
    } );
  };

  const itemsWithActiveState = useMemo( () => {
    return items.map( item => {
      let isPathActive = item.exact
        ? pathname === item.path
        : pathname.startsWith( item.path );

      const isSearchParamsActive = checkSearchParamsMatch( item.activeSearchParams );

      let isItemActive = isPathActive || isSearchParamsActive;

      if ( item.items && item.items.length > 0 ) {
        const hasActiveSubItem = item.items.some( subItem => {
          const isSubPathActive = subItem.exact
            ? pathname === subItem.path
            : pathname.startsWith( subItem.path );

          const isSubSearchParamsActive = checkSearchParamsMatch( subItem.activeSearchParams );

          return isSubPathActive || isSubSearchParamsActive;
        } );

        isItemActive = isItemActive || hasActiveSubItem;
      }

      return {
        ...item,
        isActive: isItemActive,
        items: item.items?.map( subItem => {
          const isSubPathActive = subItem.exact
            ? pathname === subItem.path
            : pathname.startsWith( subItem.path );

          const isSubSearchParamsActive = checkSearchParamsMatch( subItem.activeSearchParams );

          return {
            ...subItem,
            isActive: isSubPathActive || isSubSearchParamsActive,
          };
        } ),
      };
    } );
  }, [ pathname, searchParams, items ] );

  return (
    <SidebarGroup>
      <SidebarMenu>
        {itemsWithActiveState.map( ( item ) =>
          item.items && item.items.length > 0 ? (
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
                    className="text-md"
                  // isActive={item.isActive}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map( ( subItem ) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={subItem.isActive}
                        >
                          <Link href={subItem.path}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ) )}
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
                className="text-md"
              >
                <Link href={item.path}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
