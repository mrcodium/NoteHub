import { ChevronRight, Folder, FolderPlus, Lock, Search } from "lucide-react";
import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from "../ui/input";
import AvatarStack from "../CollaboratorAvatars";
import { useNoteStore } from "@/stores/useNoteStore";
import FolderIcon from "../ui/FolderIcon";

const ChooseCollection = ({setActiveTab, setSelectedCollection}) => {
  const { collections } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchQuery?.trim().toLowerCase() ?? "";
  const fuzzyMatch = (text, query) => {
    let t = text.toLowerCase();
    let q = query.toLowerCase();

    let i = 0;
    for (let char of t) {
      if (char === q[i]) i++;
      if (i === q.length) return true;
    }
    return false;
  };

  const filteredCollections = collections.filter(
    ({ name }) => query === "" || fuzzyMatch(name, query)
  );

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setActiveTab("add-note");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredCollections.length > 0) {
      handleCollectionSelect(filteredCollections[0]);
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4 justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-lg bg-muted/30 pl-10"
              placeholder="Search Collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={true}
              onKeyDown={handleKeyDown}
            />
          </div>
          {collections.length !== 0 && (
            <Button
              variant=""
              onClick={() => setActiveTab("create-collection")}
              className="gap-2 h-10 rounded-lg"
            >
              <FolderPlus />
              New Collection
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[50vh]">
        <div className="px-0 py-4">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Folder className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Collections Yet</h3>
              <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                Create your first collection to group notes.
              </p>
              <Button
                onClick={() => setActiveTab("create-collection")}
                className="gap-2 h-12 rounded-xl"
              >
                <FolderPlus />
                Create First Collection
              </Button>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredCollections.map((collection) => (
                <div
                  key={collection._id}
                  onClick={() => handleCollectionSelect(collection)}
                  className="group flex cursor-pointer items-center gap-4 border-b p-4 transition-all hover:bg-muted/50 hover:shadow-sm"
                >
                  <div
                    className={
                      "flex size-12 items-center justify-center rounded-xl bg-primary/10"
                    }
                  >
                    <img
                      src="/folder.svg"
                      alt="folder"
                      className="size-8 dark:invert grayscale"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold group-hover:text-primary">
                      {collection.name}
                    </h4>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {collection.notes.length} notes
                        </Badge>
                        {collection.visibility === "private" && (
                          <Badge
                            variant={"destructive"}
                            className={
                              "size-5 p-0 flex items-center justify-center"
                            }
                          >
                            <Lock strokeWidth={3} size={15} />
                          </Badge>
                        )}
                      </div>
                      {collection.collaborators?.length > 0 && (
                        <AvatarStack
                          size="xs"
                          collaborators={collection.collaborators}
                        />
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChooseCollection;
