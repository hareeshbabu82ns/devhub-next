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
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

const handleMaxLengthChange = (
  event: { target: { value: string } },
  maxLength: number,
  originalOnChange: ( value: string ) => void,
) => {
  const inputValue = event.target.value;
  // Check if the input value length is less than or equal to 10
  if ( inputValue.length <= maxLength ) {
    originalOnChange( inputValue );
  }
};

interface FormInputTextProps<T extends FieldValues> extends React.ComponentProps<"input"> {
  name: string;
  label: string;
  maxLength?: number;
  description?: string;
  control: Control<T>;
  className?: string;
}

const FormInputText = <T extends FieldValues>( {
  name,
  control: typedControl,
  label,
  description,
  maxLength,
  className,
  type,
  placeholder,
}: FormInputTextProps<T>) => {
  const control = widenControl(typedControl);
  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => {
        const { onChange } = field;

        const customOnChange = maxLength
          ? ( e: never ) => handleMaxLengthChange( e, maxLength, onChange )
          : ( e: any ) =>
            onChange(
              type === "number"
                ? // an emptied number field means "not set", not NaN
                  Number.isNaN( e.target.valueAsNumber )
                  ? undefined
                  : e.target.valueAsNumber
                : e.target.value,
            );

        return (
          <FormItem className={cn( "", className )}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                placeholder={placeholder ?? label}
                type={type}
                {...field}
                value={field.value ?? ""}
                onChange={customOnChange}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FormInputText;
