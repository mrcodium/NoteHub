import AvatarStack from "@/components/CollaboratorAvatars";
import NotesOption from "@/components/NotesOption";
import TooltipWrapper from "@/components/TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNoteStore } from "@/stores/useNoteStore";
import { format } from "date-fns";
import { Calendar, EllipsisVertical, Eye, File, Lock } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const NoteCard = ({ note, isOwner, username, collectionSlug }) => {
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

  const handleSaveRename = useCallback(() => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsRenaming(false);
  }, [note.name, note._id, renameNote]);

  const handleKeyDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        handleSaveRename();
      } else if (e.key === "Escape") {
        if (inputRef.current) {
          inputRef.current.value = note.name;
        }
        setIsRenaming(false);
      }
    },
    [handleSaveRename, note.name]
  );

  return (
    <Card className={"h-full flex flex-col hover:shadow-md transition-shadow"}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <File className="size-4 text-muted-foreground flex-shrink-0" />
            {isRenaming ? (
              <Input
                ref={inputRef}
                defaultValue={note.name}
                className="font-medium h-8 flex-1"
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <TooltipWrapper message={note.name}>
                  <Link
                    to={`/user/${username}/${collectionSlug}/${note.slug}`}
                    className="font-medium text-sm line-clamp-1 hover:underline flex-1"
                  >
                    {note.name}
                  </Link>
                </TooltipWrapper>
              </>
            )}
          </div>
          {isOwner && (
            <NotesOption
              trigger={<EllipsisVertical className="size-4" />}
              note={note}
              setIsRenaming={setIsRenaming}
            />
          )}
        </div>
      </CardHeader>

      <CardFooter className="mt-auto p-4 pt-0 ">
        <div className="flex items-center justify-between w-full text-xs">
          <TooltipWrapper
            message={`Created on ${format(
              new Date(note.createdAt),
              "MMMM d, yyyy"
            )}`}
          >
            <div className="flex gap-1 items-center text-muted-foreground">
              <Calendar className="size-3" />
              <span>{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
            </div>
          </TooltipWrapper>
          <div className="flex justify-between items-center gap-4">
            {Array.isArray(note.collaborators) && (
              <AvatarStack
                collaborators={note.collaborators}
                maxVisible={2}
                size="sm"
              />
            )}
            <Badge
              variant={
                note.visibility === "public" ? "secondary" : "destructive"
              }
              className="flex items-center gap-1 h-auto"
            >
              {note.visibility === "public" ? (
                <Eye className="size-3.5" />
              ) : (
                <Lock className="size-3.5" />
              )}
              {note.visibility}
            </Badge>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default NoteCard;
