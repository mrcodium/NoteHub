import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ImageIcon } from "lucide-react";
import FileDropZone from "../FileDropZone";
import { useEditorStore } from "@/stores/useEditorStore";

const AddImageDialog = ({ editor }) => {
  const { openImageDialog, closeDialog, openDialog } = useEditorStore();

  const handleSetImage = useCallback(
    (url) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      closeDialog("openImageDialog");
    },
    [editor]
  );

  return (
    <Dialog
      open={openImageDialog}
      onOpenChange={(open) =>
        open ? openDialog("openImageDialog") : closeDialog("openImageDialog")
      }
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <ImageIcon />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle className="hidden">Add Image</DialogTitle>
        <FileDropZone onImageSelect={handleSetImage} />
      </DialogContent>
    </Dialog>
  );
};

export default AddImageDialog;
