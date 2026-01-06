import React from "react";
import { useCurrentEditor } from "@tiptap/react";
import { useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { Button } from "../ui/button";
import {
  UploadCloudIcon,
  Loader2,
  HighlighterIcon,
  Palette,
  TableIcon,
  Ellipsis,
  EllipsisVertical,
  CloudDownloadIcon,
} from "lucide-react";
import TooltipWrapper from "../TooltipWrapper";
import { SelectHeading } from "./SelectHeading";
import { ColorPicker } from "./ColorPicker";
import { TablePopover } from "./TablePopover";
import {
  FORMATTING_BUTTONS,
  LIST_BUTTONS,
  LIST_CONTROL_BUTTONS,
  BLOCK_BUTTONS,
  CONTROL_BUTTONS,
  ALIGNMENT_BUTTONS,
  TABLE_BUTTONS,
  TABLE_ROW_CONTROLS,
  TABLE_COLUMN_CONTROLS,
  COLORS,
} from "./config/menu.config";
import { LinkDialog } from "./LinkDialog";
import MathDialog from "./MathDialog";
import AddImageDialog from "./AddImageDialog";

export const MenuBar = ({ noteId }) => {
  const { editor } = useCurrentEditor();
  const navigate = useNavigate();
  const { updateContent, status, getNoteContent } = useNoteStore();

  if (!editor) {
    return null;
  }

  const isEmptyContent = (html) => {
    // text
    if (html.replace(/<[^>]*>/g, "").trim().length > 0) return false;

    // images
    if (/<img\s/i.test(html)) return false;

    // latex (inline or block)
    if (/data-type="(inline-math|block-math)"/.test(html)) return false;

    return true;
  };

  const handleContentSave = async () => {
    let content = editor
      .getHTML()
      .replace(/[^\S\r\n]/g, " ")
      .replace(/<table/g, '<div class="tableWrapper"><table')
      .replace(/<\/table>/g, "</table></div>")
      .replace(/<pre/g, "<div class='relative pre-wrapper'><pre")
      .replace(/<\/pre>/g, "</pre></div>");

    console.log(content);

    if (isEmptyContent(content)) content = "";
    await updateContent({
      content,
      noteId: noteId,
    });

    // navigate(`/note/${noteId}`);
    navigate(-1, { replace: true });
  };

  if (!editor) {
    return (
      <div className="controll-group mb-2 sticky top-0 z-10 bg-background border-b border-input" />
    );
  }

  const handleRevert = async () => {
    if (!noteId) return;

    // 1. Clear the local storage for this note
    localStorage.removeItem("noteContent");

    // 2. Fetch fresh content from store (server or store cache)
    const freshContent = await getNoteContent(noteId); // use your store function
    if (freshContent !== null) {
      editor.commands.setContent(freshContent, false); // replace editor content
    } else {
      editor.commands.clearContent(); // fallback if note not found
    }
  };

  return (
    <div className="controll-group mb-2 sticky top-0 z-10 bg-background border-b border-input">
      <div className="Button-group flex flex-wrap gap-1">
        {FORMATTING_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            size="icon"
            onClick={() => editor.chain().focus()[command]().run()}
            disabled={!editor.can().chain().focus()[command]().run()}
            variant={editor.isActive(name) ? "secondary" : "ghost"}
          >
            {icon}
          </Button>
        ))}
        {BLOCK_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            size="icon"
            onClick={() => editor.chain().focus()[command]().run()}
            variant={editor.isActive(name) ? "secondary" : "ghost"}
            disabled={
              name === "code" && !editor.can().chain().focus()[command]().run()
            }
          >
            {icon}
          </Button>
        ))}

        {LIST_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            size="icon"
            onClick={() => editor.chain().focus()[command]().run()}
            variant={editor.isActive(name) ? "secondary" : "ghost"}
          >
            {icon}
          </Button>
        ))}

        {LIST_CONTROL_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            size="icon"
            variant="ghost"
            onClick={() => {
              if (editor.can()[command](name[0])) {
                editor.chain().focus()[command](name[0]).run();
              } else if (editor.can()[command](name[1])) {
                editor.chain().focus()[command](name[1]).run();
              }
            }}
            disabled={
              !editor.can()[command](name[0]) && !editor.can()[command](name[1])
            }
          >
            {icon}
          </Button>
        ))}

        {CONTROL_BUTTONS.map(({ icon, command, tooltip }, index) => (
          <Button
            message={tooltip}
            size="icon"
            variant="ghost"
            onClick={() => editor.chain().focus()[command]().run()}
            disabled={!editor.can().chain().focus()[command]().run()}
          >
            {icon}
          </Button>
        ))}

        {ALIGNMENT_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            size="icon"
            onClick={() => editor.chain().focus()[command](name).run()}
            variant={
              editor.isActive({ textAlign: name }) ? "secondary" : "ghost"
            }
          >
            {icon}
          </Button>
        ))}
        <SelectHeading editor={editor} />

        <ColorPicker
          icon={HighlighterIcon}
          tooltipMessage="Highlighter"
          colors={COLORS}
          activeColor={COLORS.find((color) =>
            editor.isActive("highlight", { color })
          )}
          onColorSelect={(color) =>
            editor.chain().focus().setHighlight({ color }).run()
          }
          onUnsetColor={() => editor.chain().focus().unsetHighlight().run()}
          isActive={(color) => editor.isActive("highlight", { color })}
        />

        <ColorPicker
          icon={Palette}
          tooltipMessage="Set Color"
          colors={COLORS}
          activeColor={COLORS.find((color) =>
            editor.isActive("textStyle", { color })
          )}
          onColorSelect={(color) =>
            editor.chain().focus().setColor(color).run()
          }
          onUnsetColor={() => editor.chain().focus().unsetColor().run()}
          isActive={(color) => editor.isActive("textStyle", { color })}
        />

        <div className="border rounded-lg">
          <TablePopover
            editor={editor}
            controllers={TABLE_BUTTONS}
            triggerIcon={<TableIcon />}
          />
          <TablePopover
            editor={editor}
            controllers={TABLE_COLUMN_CONTROLS}
            triggerIcon={<Ellipsis />}
          />
          <TablePopover
            editor={editor}
            controllers={TABLE_ROW_CONTROLS}
            triggerIcon={<EllipsisVertical />}
          />
        </div>

        <AddImageDialog editor={editor} />
        <MathDialog editor={editor} />
        <LinkDialog editor={editor} />

        <Button
          tooltip={"Save Content"}
          disabled={!noteId || status.noteContent.state === "saving"}
          onClick={handleContentSave}
        >
          {status.noteContent.state === "saving" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <UploadCloudIcon />
              Save
            </>
          )}
        </Button>
        <Button
          tooltip={"Revert Back"}
          size="icon"
          variant="outline"
          onClick={handleRevert}
        >
          <CloudDownloadIcon />
        </Button>
      </div>
    </div>
  );
};
