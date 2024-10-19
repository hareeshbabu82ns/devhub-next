"use client";

import NavbarLinks from "@/components/layout/NavbarLinks";
import { useState, useEffect } from "react";
import { isWindowAvailable } from "@/components/utils/navigation";
import AudioPlayer from "../audio-player/player";

export default function Navbar(props: {
  brandText: string;
  onOpen: (...args: any[]) => any;
  [x: string]: any;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    isWindowAvailable() && window.addEventListener("scroll", changeNavbar);

    return () => {
      isWindowAvailable() && window.removeEventListener("scroll", changeNavbar);
    };
  });

  const { brandText, userDetails, onOpen } = props;
  const changeNavbar = () => {
    if (isWindowAvailable() && window.scrollY > 1) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  return (
    <nav
      className={`bg-card border-b flex flex-row items-center justify-between px-4 py-2 h-[theme(spacing.14)]`}
    >
      <div className="ml-1">
        <AudioPlayer className="hidden md:flex xl:hidden" />
        {/* <p className="text-md shrink capitalize md:text-3xl">
          <NavLink href="#" className="font-bold capitalize">
            {brandText}
          </NavLink>
        </p> */}
      </div>
      <div className="">
        <NavbarLinks onOpen={onOpen} />
      </div>
    </nav>
  );
}
