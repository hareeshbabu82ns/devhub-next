"use client";

import React from "react";
import { Icons } from "./icons";

const Loader = () => {
  return (
    <div className="flex size-full items-center justify-center">
      <Icons.loaderWheel className="text-primary size-8 animate-spin" />
    </div>
  );
};

export default Loader;
