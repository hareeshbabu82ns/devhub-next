"use client";

import React from "react";
import DictionaryItemEdit from "../_components/edit";

const DictionaryItemNewPage = () => {
  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex flex-col">
      <DictionaryItemEdit isNew />
    </div>
  );
};

export default DictionaryItemNewPage;
