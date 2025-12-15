import React, { useState } from "react";
import TooltipWrapper from "../TooltipWrapper";
import { Button } from "../ui/button";
import { ChevronLeft, Globe, Loader2, Lock } from "lucide-react";
import { LabledInput } from "../ui/labeled-input";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useNoteStore } from "@/stores/useNoteStore";
import FileIcon from "../ui/FileIcon";
import { useNavigate } from "react-router-dom";

const AddNote = ({
  setSelectedCollection,
  selectedCollection,
  setActiveTab,
  setOpen,
}) => {
  const navigate = useNavigate();
  const [noteName, setNoteName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const { createNote, isCreatingNote } = useNoteStore();

  const handleAddNote = async () => {
    if(!noteName.trim() || isCreatingNote) return;
    
    const noteId = await createNote({
      name: noteName,
      collectionId: selectedCollection._id,
      content: `<h1>${noteName}</h1>`,
      visibility,
    });

    setNoteName("");
    setOpen(false);
    setSelectedCollection(null);
    setActiveTab("choose-collection");
    navigate(`/note/${noteId}/editor`);
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setActiveTab("choose-collection");
  };

  const handleKeyDown = (e) => {
  if (e.key === "Enter" && noteName.trim() && !isCreatingNote) {
    e.preventDefault();
    handleAddNote();
  }
};

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <TooltipWrapper message="Back to Collection">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleBackToCollections}
              className="h-10 w-10"
            >
              <ChevronLeft />
            </Button>
          </TooltipWrapper>
          <div className="flex gap-2 items-center">
            <FileIcon className="size-12 opacity-70" />

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {selectedCollection?.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Add a new note to this collection
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="space-y-4">
          <LabledInput
            inputClassName="bg-muted/30"
            label="Note Name"
            placeholder="Enter note title"
            value={noteName}
            onChange={(e) => setNoteName(e.target.value)}
            error={!noteName.trim() && "Note name is required"}
            autoFocus={true}
            onKeyDown={handleKeyDown}
          />

          <div className="bg-muted/30 relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none">
            <Switch
              checked={visibility === "public"}
              onCheckedChange={(value) =>
                setVisibility(value ? "public" : "private")
              }
              id="note-visibility"
              className="order-1 after:absolute after:inset-0"
              aria-describedby="note-visibility-description"
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
                  <Label htmlFor={"note-visibility"} className="capitalize">
                    {visibility}
                  </Label>
                  <p
                    id={`note-visibility-description`}
                    className="text-muted-foreground text-xs"
                  >
                    {visibility === "public"
                      ? "This note will be visible to everyone."
                      : "This note will be private and only visible to your collaborators."}
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
            onClick={handleBackToCollections}
          >
            Back
          </Button>
          <Button
            className="flex-1 gap-2 h-12 rounded-xl"
            onClick={handleAddNote}
            disabled={!noteName.trim() || isCreatingNote}
          >
            {isCreatingNote && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Note
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddNote;
