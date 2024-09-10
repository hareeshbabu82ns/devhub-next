"use client";

import NextLink, { LinkProps as NextLinkProps } from "next/link";
import { CSSProperties, PropsWithChildren, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { cn } from "@/lib/utils";

export type NavLinkProps = NextLinkProps &
  PropsWithChildren & {
    styles?: CSSProperties;
    borderRadius?: string;
  };

function NavLink({
  className,
  children,
  styles,
  borderRadius,
  childNavLinks,
  ...props
}: any) {
  const memoizedStyles = useMemo(
    () => ({
      borderRadius: borderRadius || 0,
      ...styles,
    }),
    [borderRadius, styles],
  );

  if (!childNavLinks) {
    return (
      <NextLink className={`${className}`} style={memoizedStyles} {...props}>
        {children}
      </NextLink>
    );
  } else {
    return (
      <Accordion
        type="single"
        defaultValue={props.href}
        collapsible
        className={cn(className, "w-full")}
      >
        <AccordionItem value={props.href} className="border-none">
          <AccordionTrigger className="p-0 hover:no-underline">
            {children}
          </AccordionTrigger>
          <AccordionContent className="pb-0 pt-5">
            <ul className="ml-3">{childNavLinks}</ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }
}

export default NavLink;
