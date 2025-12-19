import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ExternalLink, LinkIcon, Trash2 } from "lucide-react";
import { Input } from "../ui/input";
import TooltipWrapper from "../TooltipWrapper";
import { useEditorStore } from "@/stores/useEditorStore";

export function LinkDialog({ editor }) {
  const { openLinkDialog, closeDialog, openDialog } = useEditorStore();

  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef(null);

  // Set initial link value when dialog opens
  useEffect(() => {
    if (openLinkDialog && editor) {
      const currentLink = editor.getAttributes("link").href || "";
      setLinkUrl(currentLink);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [openLinkDialog, editor]);

  const handleSetLink = () => {
    if (!editor) return;
    let finalUrl = linkUrl.trim();
    if (finalUrl && !finalUrl.match(/^https?:\/\//i)) {
      if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
        finalUrl = `https://${finalUrl}`;
      }
    }

    if (finalUrl) {
      editor.chain().focus().setLink({ href: finalUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    closeDialog("openLinkDialog");
  };

  const handleRemoveLink = () => {
    if (!editor) return;

    editor.chain().focus().unsetLink().run();
    setLinkUrl("");
    closeDialog("openLinkDialog");
  };

  const handleOpenLink = () => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!editor) return null;

  return (
    <Dialog
      open={openLinkDialog}
      onOpenChange={(open) =>
        open ? openDialog("openLinkDialog") : closeDialog("openLinkDialog")
      }
    >
      <DialogTrigger asChild>
        <TooltipWrapper message="Insert Link">
          <Button
            size="icon"
            variant="outline"
            onClick={() => openDialog("openLinkDialog")}
            disabled={!editor.can().setLink({ href: "" })}
          >
            <LinkIcon />
          </Button>
        </TooltipWrapper>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Link</DialogTitle>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Paste link"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSetLink();
              if (e.key === "Escape") closeDialog("openLinkDialog");
            }}
            onBlur={handleSetLink}
          />
          <div className="flex gap-1">
            <TooltipWrapper message="Open Link">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleOpenLink}
                disabled={!linkUrl}
              >
                <ExternalLink />
              </Button>
            </TooltipWrapper>
            <TooltipWrapper message="Remove Link">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleRemoveLink}
                disabled={!editor.getAttributes("link").href}
              >
                <Trash2 />
              </Button>
            </TooltipWrapper>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
