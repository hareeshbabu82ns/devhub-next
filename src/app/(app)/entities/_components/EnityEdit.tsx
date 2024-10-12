"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParamsUpdater } from '@/hooks/use-search-params-updater';
import React from 'react'
import EntityDetailsAsText from './EntityDetailsAsText';
import { EntityWithRelations } from '@/lib/types';

interface CompProps {
  entityData?: EntityWithRelations;
}

const EntityEdit = ( { entityData }: CompProps ) => {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();
  const currentTab = searchParams.tab || "details";

  const onTabValueChanged = ( value: string ) =>
    updateSearchParams( {
      tab: value,
      offset: "0",
    } );


  return (
    <div className="space-y-2 flex flex-col flex-1">
      <Tabs
        defaultValue={currentTab}
        className="flex flex-col flex-1 space-y-6"
        onValueChange={onTabValueChanged}
      >
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-20 sm:h-10 gap-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
        </TabsList>
        <TabsContent
          value="details"
          className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
        >
          <EntityDetailsAsText type={searchParams.type}
            parentId={searchParams.parent}
            entityId={entityData?.id}
            entityData={entityData}
          />
        </TabsContent>
        <TabsContent
          value="parents"
          className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
        >
          parents
        </TabsContent>
        <TabsContent
          value="children"
          className="hidden data-[state='active']:flex flex-1 flex-col md:flex-row gap-4 overflow-y-auto"
        >
          children
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EntityEdit