"use client";
import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { bookmarkEntity, readEntity } from "@/app/(app)/entities/actions";
import Loader from "../utils/loader";
import SimpleAlert from "../utils/SimpleAlert";
import { cn } from "@/lib/utils";
import { ArtSlokamTile } from "./image-tiles-slokam";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TileModel } from "@/types/entities";
import {
  mapEntityToTileModel,
  mapTileModelToEntity,
} from "@/app/(app)/entities/utils";
import {
  useLanguageAtomValue,
  useMeaningLanguageAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";
import { Entity } from "@/lib/types";
import { toast } from "sonner";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { Button } from "../ui/button";

interface CompParams extends React.HTMLAttributes<HTMLDivElement> {
  slokamId: string;
}
const SlokamDetails = ({ slokamId, className }: CompParams) => {
  const language = useLanguageAtomValue();
  const defaultMeaningLanguage = useMeaningLanguageAtomValue();
  const textSize = useTextSizeAtomValue();

  // Local state for meaning language selection
  const [meaningLanguage, setMeaningLanguage] = useState(
    defaultMeaningLanguage,
  );

  // Sync with the global meaning language atom when it changes
  useEffect(() => {
    setMeaningLanguage(defaultMeaningLanguage);
  }, [defaultMeaningLanguage]);

  // Fetch current slokam details
  const {
    data: slokam,
    isFetching,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["slokamDetails", { slokamId, language, meaningLanguage }],
    queryFn: async () => {
      const slokam = await readEntity(slokamId, language!, meaningLanguage!);
      return slokam;
    },
    staleTime: QUERY_STALE_TIME_LONG,
  });

  const { mutateAsync: onBookmarkClicked } = useMutation({
    mutationKey: ["entityBookmark"],
    mutationFn: async (entity: Entity) => {
      return await bookmarkEntity(
        entity.id,
        entity.bookmarked === undefined ? true : !entity.bookmarked,
      );
    },
    onSuccess: (res) => {
      if (res?.bookmarked) toast.success("Bookmark added");
      else toast.success("Bookmark removed");
    },
  });

  if (isLoading || isFetching) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;
  if (!slokam)
    return <SimpleAlert title={`No Slokam Found with id: ${slokamId}`} />;

  const slokamTile: TileModel = mapEntityToTileModel(slokam, language);

  return (
    <div
      className={cn(
        "@container/slokamDetails flex flex-1 flex-col gap-4",
        className,
      )}
    >
      {/* Slokam & Meaning */}
      <div className="grid grid-cols-1 @5xl/slokamDetails:grid-cols-2 gap-4">
        <div className="flex flex-1 flex-col p-4 rounded-md border">
          <p className="text-secondary pb-2">Slokam:</p>
          <ArtSlokamTile
            model={slokamTile}
            onBookmarkClicked={(model) =>
              onBookmarkClicked(mapTileModelToEntity(model))
            }
            className="border-none p-0 hover:bg-transparent"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 rounded-md border">
          <div className="flex items-center justify-between pb-2">
            <p className="text-secondary">Meaning:</p>
            <div className="flex gap-1">
              {["ITRANS", "SAN", "TEL", "ENG"].map((lang) => (
                <Button
                  key={lang}
                  variant={meaningLanguage === lang ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setMeaningLanguage(lang)}
                >
                  {lang}
                </Button>
              ))}
            </div>
          </div>
          <div
            className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{slokam.meaning}</Markdown>
          </div>
        </div>
      </div>

      {/* Notes & Attributes */}
      <div className="grid grid-cols-1 @5xl/slokamDetails:grid-cols-2 gap-4 pt-6">
        <div className="flex flex-1 flex-col p-4 rounded-md border overflow-x-auto">
          <p className="text-secondary pb-2">Notes:</p>
          <div
            className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{slokam.notes}</Markdown>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4 rounded-md border overflow-x-auto">
          <p className="text-secondary pb-2">Attributes:</p>
          <div className="flex flex-col">
            {slokam.attributes?.map((attr, idx) => (
              <React.Fragment key={idx}>
                <div className="pb-2">
                  <span className="text-secondary text-xl">{attr.key}</span>
                </div>
                <div
                  className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
                >
                  <Markdown remarkPlugins={[remarkGfm]}>{attr.value}</Markdown>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlokamDetails;
