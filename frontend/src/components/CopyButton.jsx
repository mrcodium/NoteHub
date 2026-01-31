import { useState } from "react";
import { Copy, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const CopyButton = ({ codeElement }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const codeContent = codeElement?.innerText || "";
    await navigator.clipboard.writeText(codeContent);
    toast.success("Content copied to clipboard!");
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      disabled={copied}
      className="gap-2 size-7"
    >
      {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
};