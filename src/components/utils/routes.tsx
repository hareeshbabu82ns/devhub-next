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
    path: "/gods",
    icon: <Icons.god className="size-4 stroke-2 text-inherit" />,
  },
  {
    name: "Artists",
    path: "/artists",
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
    name: "Settings",
    path: "/settings",
    icon: <Icons.settings className="size-4 stroke-2 text-inherit" />,
    collapse: false,
  },
];
