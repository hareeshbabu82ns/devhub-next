import { Control } from "react-hook-form";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Textarea } from "../ui/textarea";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { useReadLocalStorage } from "usehooks-ts";
import { TEXT_SIZE_SELECT_KEY } from "../blocks/text-size-selector";

interface FormInputMDXTextAreaProps {
  name: string;
  label?: string;
  description?: string;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

const FormInputMDXTextArea = ({
  name,
  control,
  label,
  description,
  className,
}: FormInputMDXTextAreaProps) => {
  const textSize = useReadLocalStorage(TEXT_SIZE_SELECT_KEY);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem className="flex flex-1 flex-col">
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl className="flex flex-1">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={50} minSize={5}>
                  <Textarea
                    className={className}
                    placeholder={label}
                    {...field}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel minSize={5}>
                  <div className="flex h-full overflow-y-auto border rounded-md">
                    <div
                      className={`flex-1 px-3 py-2 h-1 text-${textSize} antialiased leading-8 tracking-wider`}
                    >
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {field.value}
                      </Markdown>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FormInputMDXTextArea;
