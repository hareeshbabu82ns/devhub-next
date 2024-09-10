"use client";

import NavLink from "@/components/layout/NavLink";
import { IRoute } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useCallback } from "react";
import { FaCircle } from "react-icons/fa";

interface SidebarLinksProps extends PropsWithChildren {
  routes: IRoute[];
  [x: string]: any;
}

export function SidebarLinks(props: SidebarLinksProps) {
  const pathname = usePathname();

  const { routes, onOpen } = props;

  // verifies if routeName is the one active (in browser input)
  const activeRoute = useCallback(
    (routeName: string) => {
      return pathname?.includes(routeName) && pathname?.endsWith(routeName);
    },
    [pathname],
  );

  // this function creates the links and collapses that appear in the sidebar (left menu)
  const createLinks = (routes: IRoute[]) => {
    return routes.map((route, key) => {
      if (route.disabled) {
        return (
          <li
            key={key}
            className={`flex w-full max-w-full cursor-not-allowed items-center justify-between rounded-lg py-3 pl-4 font-medium`}
          >
            <div className="flex w-full items-center justify-center gap-4">
              <div className={`text opacity-30`}>{route.icon}</div>
              <p className={`mr-auto text-sm opacity-30`}>{route.name}</p>
            </div>
          </li>
        );
      } else {
        return (
          <li
            key={key}
            className={`flex w-full max-w-full items-center justify-between rounded-lg py-3 pl-4 ${
              activeRoute(route.path.toLowerCase())
                ? "bg-accent text-accent-foreground font-semibold"
                : "font-medium"
            }`}
          >
            <NavLink
              href={route.layout ? route.layout + route.path : route.path}
              key={key}
              className="w-full"
              childNavLinks={
                route.items ? createAccordionLinks(route.items) : null
              }
            >
              <div className="flex w-full items-center justify-center gap-4">
                <div
                  className={`text ${
                    activeRoute(route.path.toLowerCase())
                      ? "text-accent-foreground font-semibold"
                      : "font-medium"
                  } `}
                >
                  {route.icon}
                </div>
                <p
                  className={`mr-auto text-sm ${
                    activeRoute(route.path.toLowerCase())
                      ? "text-accent-foreground font-semibold"
                      : "font-medium"
                  }`}
                >
                  {route.name}
                </p>
              </div>
            </NavLink>
          </li>
        );
      }
    });
  };
  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createAccordionLinks = (routes: IRoute[]) => {
    return routes.map((route: IRoute, key: number) => {
      return (
        <li
          key={key}
          className={`flex w-full max-w-full items-center justify-between rounded-lg py-3 pl-3 ${
            activeRoute(route.path.toLowerCase())
              ? "bg-accent text-accent-foreground font-semibold"
              : "font-medium"
          }`}
        >
          <NavLink
            href={route.layout + route.path}
            key={key}
            className="w-full"
          >
            <div className="flex w-full items-center justify-center gap-3">
              <div
                className={`${
                  activeRoute((route.layout + route.path).toLowerCase())
                    ? "text-accent-foreground font-semibold"
                    : "font-medium"
                } `}
              >
                {route.icon}
              </div>
              <p
                className={`mr-auto text-xs ${
                  activeRoute(route.path.toLowerCase())
                    ? "text-secondary-foreground font-semibold"
                    : "font-medium"
                }`}
              >
                {route.name}
              </p>
            </div>
          </NavLink>
        </li>
      );
    });
  };
  //  BRAND
  return <>{createLinks(routes)}</>;
}

export default SidebarLinks;
