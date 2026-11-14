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
import { Textarea } from "../ui/textarea";

const handleMaxLengthChange = (
  event: { target: { value: string } },
  maxLength: number,
  originalOnChange: ( value: string ) => void
) => {
  const inputValue = event.target.value;
  // Check if the input value length is less than or equal to 10
  if ( inputValue.length <= maxLength ) {
    originalOnChange( inputValue );
  }
};

interface FormInputTextAreaProps<T extends FieldValues> {
  name: string;
  label: string;
  maxLength?: number;
  description?: string;
  className?: string;
  control: Control<T>;
}

const FormInputTextArea = <T extends FieldValues>( {
  name,
  control: typedControl,
  label,
  description,
  className,
  maxLength,
}: FormInputTextAreaProps<T>) => {
  const control = widenControl(typedControl);
  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => {
        const { onChange } = field;

        const customOnChange = maxLength
          ? ( e: never ) => handleMaxLengthChange( e, maxLength, onChange )
          : onChange;

        return (
          <FormItem className="flex flex-1 flex-col">
            <FormLabel>{label}</FormLabel>
            <FormControl className="flex-1">
              <Textarea
                className={className}
                placeholder={label}
                {...field}
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

export default FormInputTextArea;
