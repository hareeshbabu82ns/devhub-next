"use client";

import { useQuery } from "@tanstack/react-query";
import React from "react";
import { entityHierarchy } from "../actions";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useReadLocalStorage } from "usehooks-ts";
import { LANGUAGE_SELECT_KEY } from "@/components/blocks/language-selector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

interface CompProps {
  entityId: string;
}

const EntityBreadcrumbView = ({ entityId }: CompProps) => {
  const language = useReadLocalStorage<string>(LANGUAGE_SELECT_KEY) || "";

  const { data, error, isFetching, isLoading } = useQuery({
    queryKey: ["entityHierarchy", entityId, "en"],
    queryFn: async () => {
      return entityHierarchy({ id: entityId, language });
    },
  });

  if (error) {
    return <SimpleAlert title={error.message} />;
  }

  if (!data || isLoading || isFetching) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {data.length > 1 && (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/entities/${data[0]?.id}`} replace>
                {data[0]?.text}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}

        {/* <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <BreadcrumbEllipsis className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Documentation</DropdownMenuItem>
              <DropdownMenuItem>Themes</DropdownMenuItem>
              <DropdownMenuItem>GitHub</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem> */}

        {data.length > 1
          ? data.slice(1, -1).map((entity) => (
              <React.Fragment key={entity.id}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/entities/${entity.id}`} replace>
                      {entity.text}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </React.Fragment>
            ))
          : null}

        <React.Fragment>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{data[data.length - 1]?.text}</BreadcrumbPage>
          </BreadcrumbItem>
        </React.Fragment>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default EntityBreadcrumbView;