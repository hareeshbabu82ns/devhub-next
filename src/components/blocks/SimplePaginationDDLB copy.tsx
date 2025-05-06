import { Button } from "../ui/button";
import { ChevronLeft as BackIcon, ChevronRight as FwdIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { useDebounceCallback } from "usehooks-ts";

interface PaginationDDLBProps {
  offset: number;
  limit: number;
  totalCount: number;
  onBackClick: () => void;
  onFwdClick: () => void;
  onOffsetChange?: (offset: number) => void;
}
const PaginationDDLB = ({
  limit,
  offset,
  totalCount,
  onBackClick,
  onFwdClick,
  onOffsetChange,
}: PaginationDDLBProps) => {
  return (
    <div className="flex justify-center items-center gap-4">
      <Button
        type="button"
        variant={"outline"}
        size={"icon"}
        disabled={offset === 0}
        onClick={onBackClick}
      >
        <BackIcon />
      </Button>
      <PaginationSelect
        offset={offset}
        limit={limit}
        totalCount={totalCount}
        onOffsetChange={onOffsetChange}
      />
      <Button
        type="button"
        variant={"outline"}
        size={"icon"}
        disabled={(offset + 1) * limit >= totalCount}
        onClick={onFwdClick}
      >
        <FwdIcon />
      </Button>
    </div>
  );
};

export default PaginationDDLB;

const PaginationSelect = ({
  offset,
  limit,
  totalCount,
  onOffsetChange,
}: {
  offset: number;
  limit: number;
  totalCount: number;
  onOffsetChange?: (offset: number) => void;
}) => {
  const splits = Math.ceil(totalCount / limit);
  const onOffsetInputChange = useDebounceCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const num = Number(e.target.value);
    if (Number.isNaN(num)) return;
    onOffsetChange?.(
        Math.min(Math.floor((Math.abs(num) - 1) / limit), totalCount)
      );
  }, 500);
  //   <span className="text-sm text-muted-foreground">
  //   {Math.min(offset * limit + 1, totalCount)}-
  //   {Math.min((offset + 1) * limit, totalCount)} of {totalCount}
  //   </span>

  if (splits > 50)
    // too many pages, show range instead
    return (
      <div className="flex flex-row items-center gap-2">
        <Input
          placeholder="Index"
          defaultValue={Math.min(offset * limit + 1, totalCount)}
          onChange={onOffsetInputChange}
          className="w-[80px]"
        />
        <span className="text-sm text-muted-foreground">
          {Math.min(offset * limit + 1, totalCount)}-
          {Math.min((offset + 1) * limit, totalCount)} of {totalCount}
        </span>
      </div>
    );

  return (
    <Select
      disabled={splits <= 1}
      defaultValue={`${offset * limit}`}
      onValueChange={(v) =>
        onOffsetChange && onOffsetChange(Math.floor(Number(v) / limit))
      }
    >
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Page" />
      </SelectTrigger>
      <SelectContent className="text-right w-full">
        {Array.from({ length: splits }).map((_, i) => (
          <SelectItem key={i} value={`${i * limit}`} className="font-mono">
            {Math.min(i * limit + 1, totalCount)
              .toString()
              .padStart(3, " ") +
              " - " +
              Math.min((i + 1) * limit, totalCount)
                .toString()
                .padStart(3, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
