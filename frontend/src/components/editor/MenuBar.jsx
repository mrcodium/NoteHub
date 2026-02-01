import React, { Suspense, useEffect } from "react";
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
const MathDialog = React.lazy(() => import("./MathDialog"));
import AddImageDialog from "./AddImageDialog";
import { useDraftStore } from "@/stores/useDraftStore";

export const MenuBar = ({ noteId }) => {
  const { editor } = useCurrentEditor();
  const navigate = useNavigate();
  const { updateContent, status, getNoteContent } = useNoteStore();
  const { clearDraft } = useDraftStore();

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault(); // stop browser save
        if (noteId && status.noteContent.state !== "saving") {
          handleContentSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [noteId, status.noteContent.state, editor]);

  const handleContentSave = async () => {
    let content = editor
      .getHTML()
      .replace(/[^\S\r\n]/g, " ")
      .replace(/<table/g, '<div class="tableWrapper"><table')
      .replace(/<\/table>/g, "</table></div>")
      .replace(/<pre/g, "<div class='relative pre-wrapper'><pre")
      .replace(/<\/pre>/g, "</pre></div>");

    if (isEmptyContent(content)) content = "";
    await updateContent({
      content,
      noteId: noteId,
    });

    // ✅ Clear draft ONLY after successful save
    clearDraft(noteId);

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

    // 1. Fetch fresh content from store (server or store cache)
    const note = await getNoteContent(noteId); // use your store function
    if (note !== null) {
      editor.commands.setContent(note.content, false); // replace editor content
    } else {
      editor.commands.clearContent(); // fallback if note not found
    }

    // 2. Clear the local storage for this note
    // clearing content or reverting to new content also create a new draft with fresh data,  so we are clearing the draft after reverting.
    setTimeout(() => {
      clearDraft(noteId);
    }, 500);
  };

  return (
    <div className="controll-group p-2 mb-2 sticky top-0 z-10 bg-background border-b border-input">
      <div className="Button-group flex flex-wrap gap-1">
        {FORMATTING_BUTTONS.map(({ icon, command, tooltip, name }, index) => (
          <Button
            message={tooltip}
            key={index}
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
            key={index}
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
            key={index}
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
            key={index}
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
            key={index}
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
            key={index}
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
            editor.isActive("highlight", { color }),
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
            editor.isActive("textStyle", { color }),
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
        <Suspense fallback={null}>
          <MathDialog editor={editor} />
        </Suspense>
        <LinkDialog editor={editor} />

        <Button
          tooltip={"Ctrl + S"}
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
