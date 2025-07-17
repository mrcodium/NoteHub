import { Bookmark, MoreVertical } from "lucide-react";
import React, { useRef, useState } from "react";
import { Input } from "./ui/input";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import CollectionsOption from "./CollectionsOption";
import { Button } from "./ui/button";
import TooltipWrapper from "./TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useNoteStore } from "@/stores/useNoteStore";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function CollectionCard({ collection, isOwner, pinnedCollections }) {
  const [isCollectionRenaming, setIsCollectionRenaming] = useState(false);
  const inputRef = useRef(null);
  const { renameCollection } = useNoteStore();

  const handleRenameStart = () => {
    setIsCollectionRenaming(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleRenameSave = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== collection.name) {
      renameCollection({
        _id: collection._id,
        newName: newName,
      });
    }
    setIsCollectionRenaming(false);
  };

  const handleInputKeyDown = (e) => {
    // Stop propagation to prevent collapsible toggle
    e.stopPropagation();
    if (e.key === "Enter") {
      handleRenameSave();
    }
  };

  const handleInputBlur = () => {
    handleRenameSave();
  };

  const handleInputClick = (e) => {
    // Stop propagation to prevent collapsible toggle
    e.stopPropagation();
  };

  const isPinned = (collectionId) => {
    return pinnedCollections.includes(collectionId);
  };

  return (
    <Card
      key={collection._id}
      className={cn("group hover:shadow-md transition-all")}
    >
      <div className="flex items-center gap-2 justify-between p-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="relative">
            <Bookmark
              className={cn(
                "h-5 w-5 mt-1",
                isPinned(collection._id)
                  ? "text-foreground fill-foreground"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                {isCollectionRenaming ? (
                  <Input
                    className="font-semibold bg-input/30"
                    defaultValue={collection.name}
                    ref={inputRef}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    onClick={handleInputClick}
                  />
                ) : (
                  <Link
                    to={`${collection.slug}`}
                    className="hover:underline font-medium"
                  >
                    {collection.name}
                  </Link>
                )}
                {!isCollectionRenaming && (
                  <Badge
                    variant={
                      collection.visibility === "public"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs flex-shrink-0"
                  >
                    {collection.visibility}
                  </Badge>
                )}
              </div>

              {isOwner && (
                <CollectionsOption
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">More</span>
                    </Button>
                  }
                  collection={collection}
                  onRenameStart={handleRenameStart}
                />
              )}
            </div>
            <div className="flex gap-2 justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-1">
                  {collection.notes.length}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Created{" "}
                  {format(new Date(collection.createdAt), "MMM d, yyyy")}
                </p>
              </div>

              {Array.isArray(collection.collaborators) && (
                <div className="flex">
                  {collection.collaborators.map((collaborator) => (
                    <TooltipWrapper
                      key={collaborator._id}
                      message={"@" + collaborator.userName}
                    >
                      <Avatar className="shadow-sm border-2 -ml-2 h-6 w-6 rounded-full overflow-hidden">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          <img src="/avatar.svg" />
                        </AvatarFallback>
                      </Avatar>
                    </TooltipWrapper>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CollectionCard;
