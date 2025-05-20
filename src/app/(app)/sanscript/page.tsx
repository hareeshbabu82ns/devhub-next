"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SanscriptEditor from "./_components/SanscriptEditor";
import SanscriptConvertor from "./_components/SanscriptConvertor";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import SanscriptUtils from "@/components/sanscript/sanscript-utils";

const SanscriptPage = () => {
  const { searchParams, updateSearchParams } = useSearchParamsUpdater();

  const onTabValueChanged = ( value: string ) => {
    updateSearchParams( { tab: value } );
  };

  return (
    <main className="flex flex-1 flex-col gap-4 h-[calc(100vh_-_theme(spacing.20))]">
      <Tabs
        defaultValue={searchParams.get( "tab" ) || "editor"}
        className="flex flex-col flex-1 space-y-6"
        onValueChange={onTabValueChanged}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="transConv">Convertor</TabsTrigger>
          <TabsTrigger value="utils">Sanskrit Utils</TabsTrigger>
        </TabsList>

        <TabsContent
          value="editor"
          className="hidden data-[state='active']:flex flex-1"
        >
          <SanscriptEditor />
        </TabsContent>
        <TabsContent
          value="transConv"
          className="hidden data-[state='active']:flex flex-1"
        >
          <SanscriptConvertor />
        </TabsContent>
        <TabsContent
          value="utils"
          className="hidden data-[state='active']:flex flex-1 overflow-y-auto"
        >
          <SanscriptUtils />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default SanscriptPage;
