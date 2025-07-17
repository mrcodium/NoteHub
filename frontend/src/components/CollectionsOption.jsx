import React, { useState, useCallback, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  FilePlus2,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { useNoteStore } from "@/stores/useNoteStore";
import { Separator } from "./ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { useLocalStorage } from "@/stores/useLocalStorage";
import { Input } from "./ui/input";
import { Command, CommandInput, CommandList, CommandItem } from "./ui/command";

const CollectionsOption = ({
  trigger,
  collection,
  onOpenChange,
  onRenameStart,
}) => {
  const [noteName, setNoteName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInsertNoteDialogOpen, setIsInsertNoteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const { pinnedCollections, togglePinnedCollection } = useLocalStorage();
  const { deleteCollection, createNote, updateCollectionVisibility } =
    useNoteStore();
  const navigate = useNavigate();

  const isPinned = pinnedCollections.includes(collection._id);

  const togglePin = useCallback(() => {
    togglePinnedCollection(collection._id);
    onOpenChange?.(false);
  }, [collection._id, togglePinnedCollection, onOpenChange]);

  const insertNote = useCallback(async () => {
    if (!noteName.trim()) return;

    const noteId = await createNote({
      name: noteName,
      collectionId: collection._id,
      content: `<h1>${noteName}</h1>`,
    });
    setNoteName("");
    navigate(`/note/${noteId}/editor`);
    setIsInsertNoteDialogOpen(false);
    onOpenChange?.(false);
  }, [noteName, collection._id, createNote, navigate, onOpenChange]);

  const handleRename = useCallback(() => {
    onRenameStart();
    onOpenChange?.(false);
  }, [onRenameStart, onOpenChange]);

  const handleDelete = useCallback(() => {
    deleteCollection(collection._id);
    setIsDeleteDialogOpen(false);
    onOpenChange?.(false);
    setDeleteConfirmationText("");
  }, [collection._id, deleteCollection, onOpenChange]);

  const toggleVisibility = useCallback(() => {
    const newVisibility =
      collection.visibility === "public" ? "private" : "public";
    updateCollectionVisibility({
      collectionId: collection._id,
      visibility: newVisibility,
    });
    onOpenChange?.(false);
  }, [collection._id, collection.visibility, updateCollectionVisibility, onOpenChange]);

  const dropdownItems = useMemo(() => [
    {
      id: "pin",
      icon: isPinned ? (
        <PinOff className="size-4 text-muted-foreground" />
      ) : (
        <Pin className="size-4 text-muted-foreground" />
      ),
      label: isPinned ? "Unpin" : "Pin Top",
      onClick: togglePin,
    },
    {
      id: "insert-note",
      icon: <FilePlus2 className="size-4 text-muted-foreground" />,
      label: "Insert Note",
      onClick: () => setIsInsertNoteDialogOpen(true),
    },
    {
      id: "rename",
      icon: <Pencil className="size-4 text-muted-foreground" />,
      label: "Rename",
      onClick: handleRename,
    },
    {
      id: "visibility",
      icon: collection.visibility === "public" ? (
        <Lock className="size-4 text-muted-foreground" />
      ) : (
        <LockOpen className="size-4 text-muted-foreground" />
      ),
      label: collection.visibility === "public" ? "Make Private" : "Make Public",
      onClick: toggleVisibility,
    },
    {
      id: "delete",
      icon: <Trash2 className="size-4" />,
      label: "Delete Collection",
      onClick: () => setIsDeleteDialogOpen(true),
      className: "text-red-500 hover:bg-red-400/20 hover:text-red-500",
    },
  ], [isPinned, togglePin, handleRename, collection.visibility, toggleVisibility]);

  return (
    <>
      {/* Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmationText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader className={"text-left"}>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              collection and all notes within it.
              <div className="mt-4 space-y-2">
                <p>Type the collection name to confirm:</p>
                <Input
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder={collection.name}
                  className="mt-2"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={"flex flex-row gap-2 ml-auto"}>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmationText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmationText !== collection.name}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Note Dialog */}
      <Dialog
        open={isInsertNoteDialogOpen}
        onOpenChange={setIsInsertNoteDialogOpen}
      >
        <DialogContent className="p-0 overflow-hidden">
          <Command className="rounded-lg">
            <CommandInput
              placeholder="Note name..."
              value={noteName}
              onValueChange={setNoteName}
            />
            <CommandList>
              <CommandItem
                onSelect={insertNote}
                disabled={!noteName.trim()}
                className="gap-2"
              >
                <Plus className="size-4" />
                <span>Create "{noteName}"</span>
              </CommandItem>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Dropdown Menu */}
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {dropdownItems.slice(0, 3).map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={item.onClick}
              className="gap-2"
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={dropdownItems[3].onClick}
            className="gap-2"
          >
            {dropdownItems[3].icon}
            {dropdownItems[3].label}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={dropdownItems[4].onClick}
            className={`gap-2 ${dropdownItems[4].className}`}
          >
            {dropdownItems[4].icon}
            {dropdownItems[4].label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default CollectionsOption;