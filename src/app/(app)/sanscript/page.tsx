"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SanscriptEditor from "./_components/SanscriptEditor";
import SanscriptConvertor from "./_components/SanscriptConvertor";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SanscriptPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (newParams: Record<string, string>, replace: boolean = false) => {
      const params = new URLSearchParams(
        replace ? "" : searchParams.toString(),
      );
      for (const [key, value] of Object.entries(newParams)) {
        params.set(key, value);
      }
      return params.toString();
    },
    [searchParams],
  );

  const onTabValueChanged = (value: string) => {
    const newSearchString = createQueryString({ tab: value });
    router.replace(`${pathname}?${newSearchString}`);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 h-[calc(100vh_-_theme(spacing.20))]">
      <Tabs
        defaultValue={searchParams.get("tab") || "editor"}
        className="flex flex-col flex-1 space-y-6"
        onValueChange={onTabValueChanged}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="transConv">Convertor</TabsTrigger>
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
      </Tabs>
    </main>
  );
};

export default SanscriptPage;
