"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import React from "react";
import { useState, useEffect } from "react";
import { FiAlignJustify } from "react-icons/fi";
import {
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineInformationCircle,
} from "react-icons/hi2";

export default function HeaderLinks(props: { [x: string]: any }) {
  const { onOpen } = props;
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative flex min-w-max max-w-max grow items-center justify-around gap-1 rounded-lg md:p-2 md:pl-3 xl:gap-2">
      <Button
        variant="outline"
        className="flex h-9 min-w-9 cursor-pointer rounded-full  p-0 text-xl  md:min-h-10 md:min-w-10 xl:hidden"
        onClick={onOpen}
      >
        <FiAlignJustify className="size-4" />
      </Button>
      <Button
        variant="outline"
        className="flex h-9 min-w-9 cursor-pointer rounded-full  p-0 text-xl  md:min-h-10 md:min-w-10"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "light" ? (
          <HiOutlineMoon className="size-4 stroke-2" />
        ) : (
          <HiOutlineSun className="size-5 stroke-2" />
        )}
      </Button>

      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex h-9 min-w-9 cursor-pointer rounded-full border-zinc-200 p-0 text-xl md:min-h-10 md:min-w-10"
          >
            <HiOutlineInformationCircle className="size-[20px]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
          <a
            target="blank"
            href="https://horizon-ui.com/boilerplate-shadcn#pricing"
            className="w-full"
          >
            <Button variant="outline" className="mb-2 w-full">
              Pricing
            </Button>
          </a>
          <a target="blank" href="mailto:hello@horizon-ui.com">
            <Button variant="outline" className="mb-2 w-full">
              Help & Support
            </Button>
          </a>
          <a target="blank" href="/#faqs">
            <Button variant="outline" className="w-full">
              FAQs & More
            </Button>
          </a>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
