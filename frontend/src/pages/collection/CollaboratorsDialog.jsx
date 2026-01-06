// src > pages > collection > CollaboratorsDialog
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollaboratorManager } from "@/contex/CollaboratorManagerContext";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNoteStore } from "@/stores/useNoteStore";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Loader2, Search, X } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const CollaboratorsDialog = () => {
  const { currentCollaborators, targetId, type, isDialogOpen, closeDialog } =
    useCollaboratorManager();

  const { updateNoteCollaborators, updateCollectionCollaborators, status } =
    useNoteStore();
  const [workingCollaborators, setWorkingCollaborators] = useState([]);
  const [removedIds, setRemovedIds] = useState(new Set());

  // Initialize when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setWorkingCollaborators([...currentCollaborators]);
      setRemovedIds(new Set());
    }
  }, [isDialogOpen, currentCollaborators]);

  const handleSave = useCallback(async () => {
    if (!targetId || !type) return;

    try {
      const finalCollaborators = workingCollaborators
        .filter((user) => !removedIds.has(user._id))
        .map((user) => user._id);

      if (type === "note") {
        await updateNoteCollaborators({
          noteId: targetId,
          collaborators: finalCollaborators,
        });
      } else {
        await updateCollectionCollaborators({
          collectionId: targetId,
          collaborators: finalCollaborators,
        });
      }
      closeDialog();
    } catch (error) {
      console.error("Failed to update collaborators:", error);
    }
  }, [
    workingCollaborators,
    removedIds,
    type,
    targetId,
    updateNoteCollaborators,
    updateCollectionCollaborators,
    closeDialog,
  ]);

  const hasChanges =
    removedIds.size > 0 ||
    workingCollaborators.length !== currentCollaborators.length;

  return (
    <BaseCollaboratorsDialog
      open={isDialogOpen}
      onOpenChange={closeDialog}
      collaborators={workingCollaborators}
      removedIds={removedIds}
      onSave={handleSave}
      onAddCollaborator={(user) => {
        setWorkingCollaborators((prev) => [user, ...prev]);
        setRemovedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(user._id);
          return newSet;
        });
      }}
      onRemoveCollaborator={(userId) => {
        setRemovedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
      }}
      onRestoreCollaborator={(userId) => {
        setRemovedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }}
      isSaving={status.collaborator.state === "saving"}
      hasChanges={hasChanges}
    />
  );
};

const BaseCollaboratorsDialog = ({
  open,
  onOpenChange,
  collaborators,
  removedIds,
  onSave,
  onAddCollaborator,
  onRemoveCollaborator,
  onRestoreCollaborator,
  isSaving,
  hasChanges,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
          <DialogDescription>
            Add or remove people who can access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SearchBar
            onUserSelect={onAddCollaborator}
            currentCollaborators={collaborators}
          />

          <CollaboratorsList
            collaborators={collaborators}
            removedIds={removedIds}
            onRemove={onRemoveCollaborator}
            onRestore={onRestoreCollaborator}
          />
        </div>

        <CardFooter className="flex justify-end p-0 pt-4">
          <Button onClick={onSave} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </CardFooter>
      </DialogContent>
    </Dialog>
  );
};

const SearchBar = ({ onUserSelect, currentCollaborators }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { authUser, getAllUsers } = useAuthStore();

  const searchUsers = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await getAllUsers({
          page: 1,
          limit: 10,
          filter: "all",
          search: query,
        });

        // Filter out current collaborators and auth user
        const filteredUsers = response.users.filter(
          (user) =>
            user._id !== authUser._id &&
            !currentCollaborators.some((c) => c._id === user._id)
        );

        setSearchResults(filteredUsers);
      } finally {
        setIsSearching(false);
      }
    },
    [currentCollaborators, authUser._id, getAllUsers]
  );

  useEffect(() => {
    searchUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchUsers]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUserSelect = (user) => {
    onUserSelect(user);
    handleClearSearch();
  };

  return (
    <div className="relative">
      <Label>Search by username, full name, or email</Label>
      <div className="relative">
        <Search className="text-muted-foreground absolute size-4 left-2 top-1/2 -translate-y-1/2" />
        <Input
          className="px-8"
          placeholder="Find people"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {(searchQuery || isSearching) && (
          <Button
            tooltip="clear search"
            size="icon"
            variant="ghost"
            className="text-muted-foreground absolute size-8 p-0 hover:bg-transparent right-0 top-1/2 -translate-y-1/2"
            disabled={isSearching}
            onClick={handleClearSearch}
          >
            {isSearching ? (
              <Loader2 className="animate-spin size-4" />
            ) : (
              <X className="size-4" />
            )}
          </Button>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="absolute z-50 top-[calc(100%+4px)] bg-background p-1 w-full border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user._id}
              className="p-2 hover:bg-muted/50 cursor-pointer rounded-sm"
              onClick={() => handleUserSelect(user)}
            >
              <UserInfo user={user} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CollaboratorsList = ({
  collaborators,
  removedIds,
  onRemove,
  onRestore,
}) => {
  if (collaborators.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No collaborators yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {collaborators.map((user) => {
        const isRemoved = removedIds.has(user._id);
        return (
          <Card
            key={user._id}
            className="p-2 flex items-center justify-between"
          >
            <UserInfo user={user} className={isRemoved ? "opacity-50" : ""} />
            <Button
              size="sm"
              variant={isRemoved ? "default" : "secondary"}
              onClick={() =>
                isRemoved ? onRestore(user._id) : onRemove(user._id)
              }
            >
              {isRemoved ? "Undo" : "Remove"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
};

const UserItem = ({ user, isRemoved, onRemove, onAdd }) => {
  return (
    <Card className={`p-2 flex items-center justify-between`}>
      <UserInfo user={user} className={`${isRemoved ? "opacity-50" : ""}`} />
      <div>
        <Button
          size="sm"
          variant={isRemoved ? "default" : "secondary"}
          onClick={isRemoved ? onAdd : onRemove}
        >
          {isRemoved ? "Add" : "Remove"}
        </Button>
      </div>
    </Card>
  );
};

const UserInfo = ({ user, className = "" }) => (
  <div className={cn("flex gap-2 items-center", className)}>
    <Avatar>
      <AvatarImage src={user?.avatar} />
      <AvatarFallback>{user?.fullName[0].toUpperCase()}</AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium">{user.fullName}</div>
      <div className="text-muted-foreground text-xs">@{user.userName}</div>
    </div>
  </div>
);
