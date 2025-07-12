import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Folder, FolderOutput, Pencil, Trash2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { useNoteStore } from "@/stores/useNoteStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";

const NotesOption = ({ trigger, note, setIsRenaming }) => {
  const { collections, moveTo, deleteNote } = useNoteStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleMove = async (collectionId) => {
    await moveTo({ collectionId, noteId: note._id });
    setIsMoveDialogOpen(false);
  };

  const handleDelete = () => {
    deleteNote(note._id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <Command className="rounded-lg border-none">
              <CommandInput 
                placeholder="Search collections..." 
                autoFocus
              />
              <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No collections found</CommandEmpty>
                <CommandGroup>
                  {collections
                    .filter((c) => c._id !== note.collectionId)
                    .map((collection) => (
                      <CommandItem
                        key={collection._id}
                        value={collection.name}
                        onSelect={() => handleMove(collection._id)}
                        className="gap-2"
                      >
                        <Folder className="size-4 text-muted-foreground" />
                        {collection.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              note.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dropdown Menu */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex-shrink-0 p-1 size-6 text-muted-foreground hover:text-foreground"
          >
            {trigger}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48">
          <DropdownMenuItem
            onClick={() => {
              setIsRenaming(true);
              setDropdownOpen(false);
            }}
            className="gap-2"
          >
            <Pencil className="size-4 text-muted-foreground" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsMoveDialogOpen(true);
              setDropdownOpen(false);
            }}
            className="gap-2"
          >
            <FolderOutput className="size-4 text-muted-foreground" />
            Move to
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setIsDeleteDialogOpen(true);
              setDropdownOpen(false);
            }}
            className="gap-2 text-red-500 focus:bg-red-400/20 focus:text-red-500"
          >
            <Trash2 className="size-4" />
            Delete Note
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default NotesOption;