"use client";

import NavbarLinks from "@/components/layout/NavbarLinks";
import NavLink from "@/components/layout/NavLink";
import { useState, useEffect } from "react";
import { isWindowAvailable } from "@/components/utils/navigation";

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
      className={`bg-muted flex flex-row items-center justify-between px-4 py-2 backdrop-blur-sm transition-all`}
    >
      <div className="ml-1">
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