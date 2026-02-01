import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Button } from "../ui/button";
import AlignLeftIcon from "../icons/AlignLeftIcon";
import AlignRightIcon from "../icons/AlignRightIcon";
import AlignCenterIcon from "../icons/AlignCenterIcon";

export default function EditorBubbleMenu() {
  const { editor } = useCurrentEditor();
  if (!editor) return null;

  const setAlign = (align) => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const { align } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const { selection } = editor.state;
      const node = selection.node;

      if (node?.type.name === "image") {
        return { align: node.attrs.align ?? "center" };
      }

      return { align: null };
    },
  });

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={() => editor.isActive("image")}
      tippyOptions={{
        getReferenceClientRect: () => {
          // get the currently selected image DOM node
          const node = editor.view.dom.querySelector(
            ".ProseMirror-selectednode img",
          );
          if (!node) return editor.view.dom.getBoundingClientRect();
          return node.getBoundingClientRect();
        },
        placement: "top",
        offset: [0, 8],
        flip: true,
        appendTo: document.body, // make sure it’s not clipped by container overflow
      }}
    >
      <div className="bubble-menu bg-muted p-1 flex items-center gap-1 border rounded-xl">
        <Button
          size="icon"
          variant="secondary"
          className={align === "left" ? "is-active" : "hover:bg-primary/10"}
          tooltip="left"
          onClick={() => setAlign("left")}
        >
          <AlignLeftIcon />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className={align === "center" ? "is-active" : "hover:bg-primary/10"}
          tooltip="center"
          onClick={() => setAlign("center")}
        >
          <AlignCenterIcon />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className={align === "right" ? "is-active" : "hover:bg-primary/10"}
          tooltip="right"
          onClick={() => setAlign("right")}
        >
          <AlignRightIcon />
        </Button>
      </div>
    </BubbleMenu>
  );
}
