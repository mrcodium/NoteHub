import { useState, useEffect } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Folder,
  FolderPlus,
  Loader2,
  Globe,
  Lock,
  ChevronLeft,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import TooltipWrapper from "./TooltipWrapper";
import { LabledInput } from "./ui/labeled-input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import AvatarStack from "./CollaboratorAvatars";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

const AddNoteDrawer = ({ trigger }) => {
  const {
    collections,
    createCollection,
    isCreatingCollection,
    createNote,
    isCreatingNote,
  } = useNoteStore();
  const [noteName, setNoteName] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [collaborators, setCollaborators] = useState([]);
  const [activeTab, setActiveTab] = useState("choose-collection");
  const navigate = useNavigate();
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

  const handleAddNote = async () => {
    const noteId = await createNote({
      name: noteName,
      collectionId: selectedCollection._id,
      content: `<h1>${noteName}</h1>`,
      visibility,
      collaborators: collaborators.map((user) => user._id),
    });

    setNoteName("");
    setOpen(false);
    setSelectedCollection(null);
    setActiveTab("choose-collection");
    navigate(`/note/${noteId}/editor`);
  };

  const handleAddCollection = async () => {
    const collection = await createCollection({
      name: collectionName,
      visibility,
      collaborators: collaborators.map((user) => user._id),
    });
    if (collection) {
      setSelectedCollection(collection);
      setCollectionName("");
      setCollaborators([]);
      setActiveTab("add-note");
    }
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setActiveTab("add-note");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredCollections.length > 0) {
      handleCollectionSelect(filteredCollections[0]);
    }
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setActiveTab("choose-collection");
  };

  useEffect(() => {
    if (!open) {
      // Reset state when drawer closes
      setSelectedCollection(null);
      setActiveTab("choose-collection");
      setNoteName("");
      setCollectionName("");
    }
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <TooltipWrapper message="Create Notes" asChild={false}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      </TooltipWrapper>
      <DrawerContent className="">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto">
          {activeTab === "choose-collection" ? (
            <>
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
                      <h3 className="mb-2 text-lg font-semibold">
                        No Collections Yet
                      </h3>
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
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"
                            )}
                          >
                            <img
                              src="/folder.svg"
                              alt="folder"
                              className="h-6 w-6 dark:invert grayscale"
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
                          <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary rotate-180 group-hover:translate-x-2 transition-transform" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : activeTab === "create-collection" ? (
            <>
              <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
                <div className="flex items-center gap-4">
                  <TooltipWrapper message="Back">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setActiveTab("choose-collection")}
                      className="h-10 w-10"
                    >
                      <ChevronLeft />
                    </Button>
                  </TooltipWrapper>
                  <div>
                    <h3 className="text-lg font-semibold">Create Collection</h3>
                    <p className="text-sm text-muted-foreground">
                      Create a new collection to organize your notes
                    </p>
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
                    error={
                      !collectionName.trim() && "Collection name is required"
                    }
                    autoFocus={true}
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
                    disabled={!collectionName.trim() || isCreatingCollection}
                  >
                    {isCreatingCollection && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create Collection
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Add Note Tab
            <>
              <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleBackToCollections}
                    className="h-10 w-10"
                  >
                    <ChevronLeft />
                  </Button>
                  <div className="flex gap-2 items-center">
                    <div className="size-12">
                      <img
                        src="/folder.svg"
                        alt="folder"
                        className="dark:invert grayscale w-full h-full object-contain"
                      />
                    </div>
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
                          <Label
                            htmlFor={"note-visibility"}
                            className="capitalize"
                          >
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
                    {isCreatingNote && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create Note
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddNoteDrawer;
