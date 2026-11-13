"use client";

import React from "react";
import DictionaryItemEdit from "../../_components/edit";

const DictionaryItemEditPage = () => {
  return (
    <div className="min-h-[calc(100vh_-_theme(spacing.20))] w-full flex flex-col">
      <DictionaryItemEdit />
    </div>
  );
};

export default DictionaryItemEditPage;
