import { useCallback, useEffect, useRef, useState } from "react";
import "mathlive";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Sigma,
  Trash2,
} from "lucide-react";
import TooltipWrapper from "../TooltipWrapper";
import ToggleSwitch from "../ToggleSwitch";
import { DialogDescription } from "@radix-ui/react-dialog";

const displayModes = [
  { label: "inline", value: "inline", icon: AlignHorizontalSpaceAround },
  { label: "block", value: "block", icon: AlignVerticalSpaceAround },
];

export default function MathDialog({ editor }) {
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  const [editMode, setEditMode] = useState("inline"); // 'inline' or 'block'
  const [pos, setPos] = useState(null);

  // handler when external click (from extension) opens the dialog
  useEffect(() => {
    const handler = (e) => {
      const {
        latex: initialLatex = "",
        pos: nodePos = null,
        mode = "inline",
      } = e.detail || {};
      setLatex(initialLatex);
      setPos(nodePos);
      setEditMode(mode);
      setOpen(true);
    };

    window.addEventListener("open-math-dialog", handler);
    return () => window.removeEventListener("open-math-dialog", handler);
  }, []);

  const insertMath = () => {
    if (!latex || !editor) return;
    if (pos != null) {
      // editing an existing node
      const node = editor.state.doc.nodeAt(pos);
      const isBlock = node.type.name === "blockMath";

      if (editMode === "block") {
        if (!isBlock) {
          // replace inline math with block math
          editor
            .chain()
            .setNodeSelection(pos)
            .deleteInlineMath()
            .insertBlockMath({ latex })
            .focus()
            .run();
        } else {
          editor
            .chain()
            .setNodeSelection(pos)
            .updateBlockMath({ latex })
            .focus()
            .run();
        }
      } else if (editMode === "inline") {
        if (isBlock) {
          // replace block math with inline math
          editor
            .chain()
            .setNodeSelection(pos)
            .deleteBlockMath()
            .insertInlineMath({ latex })
            .focus()
            .run();
        } else {
          editor
            .chain()
            .setNodeSelection(pos)
            .updateInlineMath({ latex })
            .focus()
            .run();
        }
      }
    } else {
      // inserting new node
      if (editMode === "block") {
        editor.chain().focus().insertBlockMath({ latex }).run();
      } else {
        editor.chain().focus().insertInlineMath({ latex }).run();
      }
    }

    setOpen(false);
  };

  const deleteMath = () => {
    if (!editor || pos == null) return;

    const node = editor.state.doc.nodeAt(pos);
    const isBlock = node?.type.name === "blockMath";

    if (isBlock) {
      editor.chain().setNodeSelection(pos).deleteBlockMath().focus().run();
    } else {
      editor.chain().setNodeSelection(pos).deleteInlineMath().focus().run();
    }

    setOpen(false);
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      // reset after close
      setLatex("");
      setEditMode(null);
      setPos(null);
    }
  };

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>
        <TooltipWrapper message="Equation">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              // If user manually opens the dialog via button, we treat it as insert (no edit)
              setEditMode(null);
              setPos(null);
              setLatex("");
              setOpen(true);
            }}
          >
            <Sigma />
          </Button>
        </TooltipWrapper>
      </DialogTrigger>
      <DialogContent className="max-w-xl" closeButtonClassName="hidden">
        <DialogHeader
          className={"flex flex-row w-full gap-4 justify-between items-center"}
        >
          <DialogTitle>{editMode ? "Edit" : "Insert"} Equation</DialogTitle>
          <ToggleSwitch
            options={displayModes}
            value={editMode || "inline"}
            onChange={setEditMode}
          />
        </DialogHeader>

        <math-field
          onInput={(evt) => setLatex(evt.target.value)}
          class="w-full border border-border rounded-md overflow-x-auto px-3 py-2 text-2xl bg-muted/30 text-primary ring-offset-2 ring-offset-background focus-within::outline-none focus-within::ring-2 focus-within::ring-ring focus:outline-none focus:ring-2 focus:ring-ring"
          value={latex}
        >
          {latex}
        </math-field>

        <DialogFooter className={"justify-between"}>
          <Button variant="destructive" onClick={deleteMath}>
            <Trash2 /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={insertMath}>
              {editMode ? "Update" : "Insert"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
