import React, { useCallback, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  Folder,
  FolderOutput,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  UserPlus2,
  Users2,
} from "lucide-react";
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
} from "./ui/dialog";
import { Separator } from "./ui/separator";
import { useCollaboratorManager } from "@/contex/CollaboratorManagerContext";
import { cn } from "@/lib/utils";

const NotesOption = React.memo(({ trigger, note, setIsRenaming, className }) => {
  const { collections, moveTo, deleteNote, updateNoteVisibility } =
    useNoteStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { openDialog } = useCollaboratorManager();

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => c._id !== note.collectionId);
  }, [collections, note.collectionId]);

  const handleMove = useCallback(
    async (collectionId) => {
      await moveTo({ collectionId, noteId: note._id });
      setIsMoveDialogOpen(false);
    },
    [moveTo, note._id]
  );

  const handleDelete = useCallback(() => {
    deleteNote(note._id);
    setIsDeleteDialogOpen(false);
  }, [deleteNote, note._id]);

  const toggleVisibility = useCallback(() => {
    const newVisibility = note.visibility === "public" ? "private" : "public";
    updateNoteVisibility({
      visibility: newVisibility,
      noteId: note._id,
    });
  }, [note.visibility, note._id, updateNoteVisibility]);

  const dropdownItems = useMemo(
    () => [
      {
        id: "rename",
        icon: <Pencil className="size-4 text-muted-foreground" />,
        label: "Rename",
        onClick: () => {
          setIsRenaming(true);
          setDropdownOpen(false);
        },
      },
      {
        id: "visibility",
        icon:
          note.visibility === "public" ? (
            <Lock className="size-4 text-muted-foreground" />
          ) : (
            <LockOpen className="size-4 text-muted-foreground" />
          ),
        label: note.visibility === "public" ? "Make Private" : "Make Public",
        onClick: toggleVisibility,
      },
      {
        id: "move",
        icon: <FolderOutput className="size-4 text-muted-foreground" />,
        label: "Move to",
        onClick: () => {
          setIsMoveDialogOpen(true);
          setDropdownOpen(false);
        },
      },
      {
        id: "collaborators",
        icon: <UserPlus2 className="size-4 text-muted-foreground" />,
        label: "Collaborators",
        onClick: () => {
          openDialog(note?.collaborators || [], note?._id, "note"),
            setDropdownOpen(false);
        },
      },
      {
        id: "delete",
        icon: <Trash2 className="size-4" />,
        label: "Delete Note",
        onClick: () => {
          setIsDeleteDialogOpen(true);
          setDropdownOpen(false);
        },
        className:
          "font-normal p-2 h-auto w-full justify-start gap-2 text-red-500 hover:bg-red-400/20 hover:text-red-500",
      },
    ],
    [note.visibility, note._id, note.collaborators, openDialog, toggleVisibility, setIsRenaming]
  );

  return (
    <>
      {/* Move Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <Command className="rounded-lg border-none">
              <CommandInput placeholder="Search collections..." autoFocus />
              <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No collections found</CommandEmpty>
                <CommandGroup>
                  {filteredCollections.map((collection) => (
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
          <DialogHeader className={"text-left"}>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              note.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={"flex flex-row gap-2 ml-auto"}>
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
            className={cn("flex-shrink-0 p-1 size-6 text-muted-foreground hover:text-foreground", className)}
          >
            {trigger}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48">
          {dropdownItems.slice(0, 4).map((item) => (
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
          <Separator orientation="horizontal" className="my-1" />

          <DropdownMenuItem
            onClick={dropdownItems[4].onClick}
            className={dropdownItems[4].className}
          >
            {dropdownItems[4].icon}
            {dropdownItems[4].label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
});

export default NotesOption;
