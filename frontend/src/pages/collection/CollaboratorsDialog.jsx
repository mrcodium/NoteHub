import TooltipWrapper from "@/components/TooltipWrapper";
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
import { axiosInstance } from "@/lib/axios";
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

export const CollaboratorsDialog = ({
  open,
  onOpenChange,
  collaborators,
  onSave,
}) => {
  const { updatingCollaborators } = useNoteStore();
  const [currentCollaborators, setCurrentCollaborators] =
    useState(collaborators);
  const [removedCollaborators, setRemovedCollaborators] = useState([]);
  const [addedCollaborators, setAddedCollaborators] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setCurrentCollaborators(collaborators);
    setRemovedCollaborators([]);
    setAddedCollaborators([]);
  }, [collaborators]);

  useEffect(() => {
    const hasRemovals = removedCollaborators.length > 0;
    const hasAdditions = addedCollaborators.length > 0;
    setHasChanges(hasRemovals || hasAdditions);
  }, [removedCollaborators, addedCollaborators]);

  const handleSave = () => {
    const collaboratorIds = currentCollaborators
      .filter((user) => !removedCollaborators.includes(user._id))
      .concat(addedCollaborators)
      .map((user) => user._id);

    onSave(collaboratorIds);

    // Update current collaborators after save
    setCurrentCollaborators([
      ...currentCollaborators.filter(
        (user) => !removedCollaborators.includes(user._id)
      ),
      ...addedCollaborators,
    ]);
    setRemovedCollaborators([]);
    setAddedCollaborators([]);
  };

  const handleRemoveCollaborator = (userId) => {
    if (addedCollaborators.some((user) => user._id === userId)) {
      setAddedCollaborators((prev) =>
        prev.filter((user) => user._id !== userId)
      );
    } else {
      setRemovedCollaborators((prev) => [...prev, userId]);
    }
  };

  const handleAddCollaborator = (userId) => {
    setRemovedCollaborators((prev) => prev.filter((id) => id !== userId));
  };

  const handleUserSelect = (user) => {
    const isExisting =
      currentCollaborators.some((c) => c._id === user._id) &&
      !removedCollaborators.includes(user._id);

    if (!isExisting) {
      setAddedCollaborators((prev) => [...prev, user]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
          <DialogDescription>
            Add or remove people who can access this collection
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <SearchBar
            onUserSelect={handleUserSelect}
            currentCollaborators={[
              ...currentCollaborators,
              ...addedCollaborators,
            ]}
          />
          <CollaboratorsList
            collaborators={[...currentCollaborators, ...addedCollaborators]}
            removedCollaborators={removedCollaborators}
            onRemove={handleRemoveCollaborator}
            onAdd={handleAddCollaborator}
          />
        </div>
        <CardFooter className="flex justify-end p-0 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatingCollaborators}
          >
            {updatingCollaborators ? (
              <Loader2 className="animate-spin mr-2" />
            ) : null}
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
  const { authUser } = useAuthStore();
  const { getAllUsers } = useAuthStore();

  const searchUsers = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const response = await getAllUsers({
        page: 1,
        limit: 10,
        filter: "all",
        search: query,
      });
      let { users } = response;
      users = users.filter((user) => user._id != authUser._id);
      setSearchResults(users);
      setIsSearching(false);
    },
    [currentCollaborators]
  );

  useEffect(() => {
    searchUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchUsers]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
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
          <TooltipWrapper message="clear search">
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground absolute size-8 p-0 hover:bg-transparent right-0 top-1/2 -translate-y-1/2"
              onClick={handleClearSearch}
            >
              {isSearching ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </TooltipWrapper>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="absolute z-50 top-[calc(100%+4px)] bg-background p-1 w-full border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user._id}
              className="p-2 hover:bg-muted/50 cursor-pointer rounded-sm"
              onClick={() => {
                handleClearSearch();
                onUserSelect(user);
              }}
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
  removedCollaborators,
  onRemove,
  onAdd,
}) => {
  if (collaborators.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No collaborators yet
      </div>
    );
  }

  console.log(removedCollaborators);
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {collaborators.map((user) => {
        const isRemoved = removedCollaborators.includes(user._id);
        return (
          <UserItem
            key={user._id}
            user={user}
            isRemoved={isRemoved}
            onRemove={() => onRemove(user._id)}
            onAdd={() => onAdd(user._id)}
          />
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
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.fullName[0].toUpperCase()}</AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium">{user.fullName}</div>
      <div className="text-muted-foreground text-xs">@{user.userName}</div>
    </div>
  </div>
);
