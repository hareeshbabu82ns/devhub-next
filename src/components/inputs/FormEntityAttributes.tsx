import { PlusIcon as AddIcon, Trash2Icon as DeleteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Control } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form";
import { AttributeValueInput } from "@/lib/types";

interface FormEntityAttributesProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

export default function FormEntityAttributes({
  name,
  control,
}: FormEntityAttributesProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const attributes = field.value as AttributeValueInput[];
        return (
          <div className="grid flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sm:w-[250px]">Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-10 p-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => {
                        field.onChange([
                          { key: "", value: "" },
                          ...field.value,
                        ]);
                      }}
                    >
                      <AddIcon className="size-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attr, index) => (
                  <TableRow key={`attrs-${index}`}>
                    <TableCell className="p-2">
                      <Input
                        name={`attr-key-${index}`}
                        placeholder="Key"
                        value={attr.key}
                        onChange={(e) => {
                          field.onChange(
                            attributes.map((_, i) => {
                              if (i === index) {
                                return {
                                  key: e.target.value,
                                  value: attr.value,
                                };
                              }
                              return _;
                            })
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Textarea
                        name={`attr-value-${index}`}
                        value={attr.value}
                        placeholder="Value"
                        onChange={(e) => {
                          field.onChange(
                            attributes.map((_, i) => {
                              if (i === index) {
                                return { key: attr.key, value: e.target.value };
                              }
                              return _;
                            })
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          field.onChange(
                            attributes.filter((_, i) => i !== index)
                          );
                        }}
                      >
                        <DeleteIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }}
    />
  );
}
