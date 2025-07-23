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
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { useNoteStore } from "@/stores/useNoteStore";
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
import { Label } from "./ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CollectionsOption = ({
  trigger,
  collection,
  onRenameStart,
}) => {
  const [noteName, setNoteName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInsertNoteDialogOpen, setIsInsertNoteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const { pinnedCollections, togglePinnedCollection } = useLocalStorage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    deleteCollection,
    createNote,
    isDeletingCollection,
    isCreatingNote,
    updateCollectionVisibility,
  } = useNoteStore();
  const navigate = useNavigate();

  const isPinned = pinnedCollections.includes(collection._id);

  const togglePin = useCallback(() => {
    togglePinnedCollection(collection._id);
    setDropdownOpen(false);
    toast.success(
      isPinned ? "Collection unpinned" : "Collection pinned to top"
    );
  }, [collection._id, togglePinnedCollection, isPinned]);

  const insertNote = useCallback(async () => {
    if (!noteName.trim()) return;

    const noteId = await createNote({
      name: noteName,
      collectionId: collection._id,
      content: `<h1>${noteName}</h1>`,
    });

    setNoteName("");
    setIsInsertNoteDialogOpen(false);
    setDropdownOpen(false); 
    navigate(`/note/${noteId}/editor`);
  }, [noteName, collection._id, createNote, navigate]);

  const handleRename = useCallback(() => {
    onRenameStart();
    setDropdownOpen(false);
  }, [onRenameStart]);

  const handleDelete = useCallback(async () => {
    await deleteCollection(collection._id);
    setIsDeleteDialogOpen(false);
    setDropdownOpen(false);
    setDeleteConfirmationText("");
  }, [collection._id, deleteCollection]);

  const toggleVisibility = useCallback(async () => {
    const newVisibility =
      collection.visibility === "public" ? "private" : "public";
    await updateCollectionVisibility({
      collectionId: collection._id,
      visibility: newVisibility,
    });
    setDropdownOpen(false);
  }, [collection._id, collection.visibility, updateCollectionVisibility]);

  const dropdownItems = useMemo(
    () => [
      {
        id: "pin",
        icon: isPinned ? (
          <PinOff className="size-4 text-muted-foreground" />
        ) : (
          <Pin className="size-4 text-muted-foreground" />
        ),
        label: isPinned ? "Unpin" : "Pin to top",
        onClick: togglePin,
      },
      {
        id: "insert-note",
        icon: <FilePlus2 className="size-4 text-muted-foreground" />,
        label: "Create new note",
        onClick: () => {
          setIsInsertNoteDialogOpen(true);
          setDropdownOpen(false);
        },
      },
      {
        id: "rename",
        icon: <Pencil className="size-4 text-muted-foreground" />,
        label: "Rename collection",
        onClick: handleRename,
      },
      {
        id: "visibility",
        icon:
          collection.visibility === "public" ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : (
            <LockOpen className="size-4 text-muted-foreground" />
          ),
        label:
          collection.visibility === "public" ? "Make private" : "Make public",
        onClick: toggleVisibility,
      },
      {
        id: "delete",
        icon: <Trash2 className="size-4 text-destructive" />,
        label: "Delete collection",
        onClick: () => {
          setIsDeleteDialogOpen(true);
          setDropdownOpen(false);
        },
        className: "text-destructive focus:text-destructive",
      },
    ],
    [isPinned, togglePin, handleRename, collection.visibility, toggleVisibility]
  );

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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Collection
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the
              collection and all notes within it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type{" "}
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {collection.name}
                </span>{" "}
                to confirm:
              </Label>
              <Input
                id="confirmation"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={collection.name}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 flex items-center justify-center bg-destructive/10 text-destructive rounded-full">
                !
              </div>
              <span>All notes in this collection will be deleted</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteConfirmationText !== collection.name ||
                isDeletingCollection
              }
            >
              {isDeletingCollection ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Note Dialog */}
      <Dialog
        open={isInsertNoteDialogOpen}
        onOpenChange={(open) => {
          setIsInsertNoteDialogOpen(open);
          if (!open) setNoteName("");
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new note to{" "}
              <span className="font-medium">{collection.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              insertNote();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="note-name">Note Name</Label>
              <Input
                id="note-name"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                autoFocus
                placeholder="Enter note name..."
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInsertNoteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!noteName.trim() || isCreatingNote}
              >
                {isCreatingNote ? (
                  <>
                    <Loader2 className="animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Note"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dropdown Menu */}
      <DropdownMenu 
        open={dropdownOpen} 
        onOpenChange={setDropdownOpen}
        modal={false} // Important for nested dialogs
      >
        <DropdownMenuTrigger asChild>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 rounded-lg shadow-lg border border-border"
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()} // Prevent focus issues
        >
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
            {collection.name}
          </div>
          <DropdownMenuSeparator />

          {dropdownItems.slice(0, 3).map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={item.onClick}
              className="gap-2 text-sm cursor-pointer"
              onSelect={(e) => e.preventDefault()} // Prevent default selection behavior
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={dropdownItems[3].onClick}
            className="gap-2 text-sm cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            {dropdownItems[3].icon}
            {dropdownItems[3].label}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={dropdownItems[4].onClick}
            className={cn(
              "gap-2 text-sm cursor-pointer",
              dropdownItems[4].className
            )}
            onSelect={(e) => e.preventDefault()}
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