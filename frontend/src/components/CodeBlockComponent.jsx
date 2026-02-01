import React, { useRef, useState } from "react";
import { Check, ChevronsUpDown, Copy, CopyCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";

export default ({
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  extension,
}) => {
  const languages = extension.options.lowlight.listLanguages();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultLanguage);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  const handleCopy = async () => {
    const codeContent = codeRef.current.textContent;
    await navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <NodeViewWrapper className="code-block relative rounded-2xl overflow-hidden">
      <header className="rounded-t-lg w-full flex items-center justify-between py-2 px-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="min-w-32 justify-between h-7"
              contentEditable={false}
            >
              {value
                ? languages.find((language) => language === value)
                : "Select Language..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] bg-zinc-800 border-zinc-800 p-0 " size="top" align="start">
            <Command className="bg-transparent text-zinc-50 border-zinc-800">
              <CommandInput placeholder="Search language..." className="h-9 placeholder:text-zinc-400" />
              <CommandList>
                <CommandEmpty>No language found.</CommandEmpty>
                <CommandGroup>
                  {languages.map((lang, index) => (
                    <CommandItem
                      key={index}
                      value={lang}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue);
                        updateAttributes({ language: currentValue });
                        setOpen(false);
                      }}
                      style={{color: "white"}}
                    >
                      {lang}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === lang ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          disabled={copied}
          className="gap-2 size-7"
          aria-label={copied ? "Code copied" : "Copy code to clipboard"}
        >
          {copied ? (
            <CopyCheck className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </header>

      <pre
        ref={codeRef}
        className="p-4 overflow-x-auto bg-[#09090b]"
        style={{
          tabSize: 4,
          whiteSpace: "pre",
          fontFamily: "monospace",
        }}
      >
        <NodeViewContent as="code" className={`language-${value}`} />
      </pre>
    </NodeViewWrapper>
  );
};
