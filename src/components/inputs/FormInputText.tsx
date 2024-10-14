import { Control } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input, InputProps } from "../ui/input";
import { cn } from "@/lib/utils";

const handleMaxLengthChange = (
  event: { target: { value: string } },
  maxLength: number,
  originalOnChange: (value: string) => void,
) => {
  const inputValue = event.target.value;
  // Check if the input value length is less than or equal to 10
  if (inputValue.length <= maxLength) {
    originalOnChange(inputValue);
  }
};

interface FormInputTextProps extends InputProps {
  name: string;
  label: string;
  maxLength?: number;
  description?: string;
  control: Control<any>;
  className?: string;
}

const FormInputText = ({
  name,
  control,
  label,
  description,
  maxLength,
  className,
  type,
}: FormInputTextProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const { onChange } = field;

        const customOnChange = maxLength
          ? (e: never) => handleMaxLengthChange(e, maxLength, onChange)
          : (e: any) =>
              onChange(
                type === "number" ? e.target.valueAsNumber : e.target.value,
              );

        return (
          <FormItem className={cn("", className)}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                placeholder={label}
                type={type}
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

export default FormInputText;
