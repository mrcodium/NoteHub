import { formatDate, formatTime } from "@/lib/utils";
import { EllipsisVertical, File } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NotesOption from "./NotesOption";
import { Link } from "react-router-dom";
import { Input } from "./ui/input";
import { Badge } from "@/components/ui/badge";
import { useNoteStore } from "@/stores/useNoteStore";



export const NoteCard = ({ note, collectionName }) => {
  const inputRef = useRef(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const { renameNote } = useNoteStore();

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isRenaming]);

  const handleSaveRename = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.value = note.name;
      }
      setIsRenaming(false);
    }
  };

  return (
    <div className="flex gap-2 bg-input/30 items-start p-4 border rounded-lg hover:bg-accent/50 transition-colors group/notecard">
      <div className="overflow-hidden pt-1 w-full">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 text-foreground flex items-center gap-1">
            <File className="flex-shrink-0 size-4" />
            {isRenaming ? (
              <Input
                ref={inputRef}
                defaultValue={note.name}
                className="font-bold h-8 flex-1"
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Link
                to={`/note/${note._id}`}
                className="font-bold text-sm truncate hover:underline flex-1"
              >
                {note.name}
              </Link>
            )}
          </div>

          <div className="opacity-1 group-hover/notecard:opacity-100 transition-opacity">
            <NotesOption
              trigger={<EllipsisVertical className="size-4" />}
              note={note}
              setIsRenaming={setIsRenaming}
            />
          </div>
        </div>
        {(collectionName) &&
          (<Badge
            variant="secondary"
            className="mb-2 hover:bg-secondary text-xs font-normal mt-1"
          >
            {collectionName}
          </Badge>)
        }

        <div className="flex gap-2 items-center text-muted-foreground text-xs justify-between">
          <p>{formatDate(note.createdAt)}</p>
          <p>{formatTime(note.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};