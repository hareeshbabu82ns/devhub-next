"use client";

import { useParams } from "next/navigation";
import { DictionaryEntryView } from "../_components/DictionaryEntryView";

const DictionaryItemDisplayPage = () => {
  const { dictionaryId } = useParams<{ dictionaryId: string }>();
  return <DictionaryEntryView id={dictionaryId} />;
};

export default DictionaryItemDisplayPage;
