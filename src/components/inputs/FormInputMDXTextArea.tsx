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
import { useTextSizeAtomValue } from "@/hooks/use-config";

interface FormInputMDXTextAreaProps {
  name: string;
  label?: string;
  description?: string;
  className?: string;
  control: Control<any>;
}

const FormInputMDXTextArea = ( {
  name,
  control,
  label,
  description,
  className,
}: FormInputMDXTextAreaProps ) => {
  const textSize = useTextSizeAtomValue();
  return (
    <FormField
      control={control}
      name={name}
      render={( { field } ) => {
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
                      className={`flex-1 px-3 py-2 h-1 text-${textSize} subpixel-antialiased leading-loose tracking-widest markdown-content`}
                    >
                      <Markdown
                        remarkPlugins={[ remarkGfm ]}
                      >
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
