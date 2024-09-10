import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

type LocalConfig = {
  pageSize: number;
};

const configAtom = atomWithStorage<LocalConfig>("config", {
  pageSize: 20,
});

export function useLocalConfig() {
  return useAtom(configAtom);
}
