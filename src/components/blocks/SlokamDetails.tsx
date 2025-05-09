"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { readEntity } from "@/app/(app)/entities/actions";
import Loader from "../utils/loader";
import SimpleAlert from "../utils/SimpleAlert";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Icons } from "../utils/icons";
import { ArtSlokamTile } from "./image-tiles-slokam";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TileModel } from "@/types/entities";
import { mapEntityToTileModel } from "@/app/(app)/entities/utils";
import {
  useLanguageAtomValue,
  useMeaningLanguageAtomValue,
  useTextSizeAtomValue,
} from "@/hooks/use-config";

interface CompParams extends React.HTMLAttributes<HTMLDivElement> {
  slokamId: string;
}
const SlokamDetails = ( { slokamId, className }: CompParams ) => {
  const language = useLanguageAtomValue();
  const meaningLanguage = useMeaningLanguageAtomValue();
  const textSize = useTextSizeAtomValue();

  const {
    data: slokam,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useQuery( {
    queryKey: [ "slokamDetails", { slokamId, language, meaningLanguage } ],
    queryFn: async () => {
      const slokam = await readEntity( slokamId, language! );
      return slokam;
    },
  } );

  if ( isFetching || isLoading ) return <Loader />;
  if ( error ) return <SimpleAlert title={error.message} />;
  if ( !slokam )
    return <SimpleAlert title={`No Slokam Found with id: ${slokamId}`} />;

  const slokamTile: TileModel = mapEntityToTileModel( slokam );

  return (
    <div className={cn( "flex flex-1 flex-col gap-4", className )}>
      <div className="flex flex-row items-center justify-between">
        <div>
          <Button
            onClick={() => refetch()}
            type="button"
            variant="outline"
            size="icon"
          >
            <Icons.refresh className="size-4" />
          </Button>
        </div>
      </div>
      {/* Slokam & Meaning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-1 flex-col p-4 rounded-md border">
          <p className="text-secondary pb-2">Slokam:</p>
          <ArtSlokamTile
            model={slokamTile}
            className="border-none p-0 hover:bg-transparent"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 rounded-md border">
          <p className="text-secondary pb-2">Meaning:</p>
          <div
            className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
          >
            <Markdown remarkPlugins={[ remarkGfm ]}>{slokam.meaning}</Markdown>
          </div>
        </div>
      </div>

      {/* Notes & Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-6">
        <div className="flex flex-1 flex-col p-4 rounded-md border">
          <p className="text-secondary pb-2">Notes:</p>
          <div
            className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
          >
            <Markdown remarkPlugins={[ remarkGfm ]}>{slokam.notes}</Markdown>
          </div>
        </div>
        <div className="flex flex-1 flex-col  p-4 rounded-md border">
          <p className="text-secondary pb-2">Attributes:</p>
          <div className="flex flex-col">
            {slokam.attributes?.map( ( attr, idx ) => (
              <React.Fragment key={idx}>
                <div className="pb-2">
                  <span className="text-secondary text-xl">{attr.key}</span>
                </div>
                <div
                  className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
                >
                  <Markdown remarkPlugins={[ remarkGfm ]}>{attr.value}</Markdown>
                </div>
              </React.Fragment>
            ) )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlokamDetails;
