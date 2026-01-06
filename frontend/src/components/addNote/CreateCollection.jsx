import React, { useState } from "react";
import { Button } from "../ui/button";
import { ChevronLeft, Globe, Loader2, Lock } from "lucide-react";
import FolderIcon from "../ui/FolderIcon";
import { LabledInput } from "../ui/labeled-input";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useNoteStore } from "@/stores/useNoteStore";

const CreateCollection = ({ setSelectedCollection, setActiveTab }) => {
  const [collectionName, setCollectionName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const { createCollection, status } = useNoteStore();

  const handleAddCollection = async () => {
    if(!collectionName.trim() || status.collection.state === "creating") return;
    
    const collection = await createCollection({
      name: collectionName,
      visibility,
    });
    if (collection) {
      setSelectedCollection(collection);
      setCollectionName("");
      setActiveTab("add-note");
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && collectionName.trim() && !status.collection.state === "creating") {
      e.preventDefault();
      handleAddCollection();
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
            <Button
            tooltip="Back"
              variant="secondary"
              size="icon"
              onClick={() => setActiveTab("choose-collection")}
              className="h-10 w-10"
            >
              <ChevronLeft />
            </Button>
          <div className="flex gap-2 items-center">
            <FolderIcon className="size-12 opacity-70" />
            <div>
              <h3 className="text-lg font-semibold">Create Collection</h3>
              <p className="text-sm text-muted-foreground">
                Create a new collection to organize your notes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="space-y-4">
          <LabledInput
            inputClassName="bg-muted/30"
            label="Collection Name"
            placeholder="Enter collection name"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            error={!collectionName.trim() && "Collection name is required"}
            autoFocus={true}
            onKeyDown={handleKeyDown}
          />

          <div className="bg-muted/30 relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none">
            <Switch
              checked={visibility === "public"}
              onCheckedChange={(value) =>
                setVisibility(value ? "public" : "private")
              }
              id="collection-visibility"
              className="order-1 after:absolute after:inset-0"
              aria-describedby="collection-visibility-description"
            />
            <div className="w-full">
              <div className="text-sm font-medium leading-none text-muted-foreground mb-4">
                Visibility
              </div>
              <div className="w-full flex grow items-start gap-3">
                {visibility === "private" ? (
                  <Lock size="20" />
                ) : (
                  <Globe size="20" />
                )}
                <div className="grid grow gap-2">
                  <Label
                    htmlFor={"collection-visibility"}
                    className="capitalize"
                  >
                    {visibility}
                  </Label>
                  <p
                    id={`collection-visibility-description`}
                    className="text-muted-foreground text-xs"
                  >
                    {visibility === "public"
                      ? "This collection will be visible to everyone."
                      : "This collection will be private and only visible to your collaborators."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 h-12 rounded-xl"
            onClick={() => setActiveTab("choose-collection")}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2 h-12 rounded-xl"
            onClick={handleAddCollection}
            disabled={!collectionName.trim() || status.collection.state === "creating"}
          >
            {status.collection.state === "creating" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Create Collection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateCollection;
