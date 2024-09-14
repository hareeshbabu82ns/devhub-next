import { IRoute } from "@/types";
import { Icons } from "./icons";

export const routes: IRoute[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <Icons.home className="size-4 stroke-2 text-inherit" />,
    collapse: false,
  },
  {
    name: "Gods",
    path: "/entities?type=GOD&offset=0",
    icon: <Icons.god className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Artists",
    path: "/entities?type=AUTHOR&offset=0",
    icon: <Icons.artist className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Dictionary",
    path: "/dictionary",
    icon: <Icons.dictionary className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Sanscript",
    path: "/sanscript",
    icon: <Icons.sanscript className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Assets",
    path: "/assets",
    icon: <Icons.assetsExplorer className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: <Icons.settings className="size-4 stroke-2 text-inherit" />,
    collapse: false,
  },
];
