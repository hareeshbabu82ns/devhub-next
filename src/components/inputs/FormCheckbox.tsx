import { Control, FieldValues } from "react-hook-form";
import { widenControl } from "@/components/inputs/widen-control";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Checkbox } from "../ui/checkbox";

interface FormCheckboxProps<T extends FieldValues> {
  name: string;
  label: string;
  description?: string;
  control: Control<T>;
}

const FormCheckbox = <T extends FieldValues>( {
  name,
  control: typedControl,
  label,
  description,
}: FormCheckboxProps<T>) => {
  const control = widenControl(typedControl);
  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormCheckbox;
