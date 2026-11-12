"use client";

import { usePathname, useRouter } from "next/navigation";
import AssetBrowser from "@/components/assets/AssetBrowser";
import { normalizeAssetPath } from "@/lib/assets/shared";

const BASE = "/assets";

/** The Assets page: the folder shown lives in the URL, so it can be linked. */
export default function AssetsExplorer() {
  const router = useRouter();
  const pathname = usePathname() ?? BASE;

  const path = normalizeAssetPath(
    pathname
      .slice(BASE.length)
      .split("/")
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })
      .join("/"),
  );

  return (
    <div className="flex w-full flex-1 flex-col">
      <AssetBrowser
        path={path}
        onPathChange={(next) =>
          router.push(
            next
              ? `${BASE}/${next.split("/").map(encodeURIComponent).join("/")}`
              : BASE,
          )
        }
      />
    </div>
  );
}
