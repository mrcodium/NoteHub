import { useState, useCallback, useEffect } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { useNavigate } from "react-router-dom";
import { debounce } from "lodash";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Globe,
  Lock,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import TooltipWrapper from "./TooltipWrapper";
import { LabledInput } from "./ui/labeled-input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

const AddNoteDrawer = ({ trigger }) => {
  const [noteName, setNoteName] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [collaborators, setCollaborators] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { getAllUsers, authUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    collections,
    createCollection,
    isCreatingCollection,
    createNote,
    isCreatingNote,
  } = useNoteStore();

  // Debounced user search
  const fetchUsers = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await getAllUsers({
          page: 1,
          limit: 10,
          filter: "all",
          search: query,
        });
        const users = response.users?.filter((u) => u._id != authUser._id);
        setSearchResults(users || []);
      } catch (error) {
        console.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchUsers(searchQuery);
    return () => fetchUsers.cancel();
  }, [searchQuery, fetchUsers]);

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
    }
  };

  const addCollaborator = (user) => {
    if (!collaborators.some((collab) => collab._id === user._id)) {
      setCollaborators([...collaborators, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeCollaborator = (userId) => {
    setCollaborators(collaborators.filter((user) => user._id !== userId));
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <TooltipWrapper message="Create Notes" asChild={false}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      </TooltipWrapper>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto pt-10 w-full max-w-2xl overflow-y-auto">
          <DrawerHeader className={"hidden"}>
            <DrawerTitle>Create a New Note or Collection</DrawerTitle>
            <DrawerDescription>
              Organize your thoughts by creating notes or grouping them into
              collections. Customize visibility and collaborators as needed.
            </DrawerDescription>
          </DrawerHeader>

          <Tabs defaultValue="note" className="w-full px-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="note">Note</TabsTrigger>
              <TabsTrigger value="collection">Collection</TabsTrigger>
            </TabsList>

            <TabsContent value="note" className="space-y-4 pt-4">
              <div className="space-y-3">
                <LabledInput
                  inputClassName="bg-muted/30"
                  label="Note Name"
                  placeholder="Enter note title"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  error={!noteName.trim() && "Note name is required"}
                />

                <div className="space-y-2 relative">
                  <Label className="absolute left-3 top-2 text-muted-foreground">
                    Collection
                  </Label>
                  <Select
                    value={selectedCollection?._id}
                    onValueChange={(value) => {
                      const collection = collections.find(
                        (col) => col._id === value
                      );
                      setSelectedCollection(collection);
                    }}
                  >
                    <SelectTrigger className="pt-7 bg-muted/30 h-auto rounded-lg transition-all">
                      <SelectValue placeholder="Select a collection">
                        {selectedCollection ? (
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            {selectedCollection.name}
                          </div>
                        ) : (
                          "Select a collection"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-muted">
                      {collections.map((collection) => (
                        <SelectItem
                          className="hover:bg-accent cursor-pointer"
                          key={collection._id}
                          value={collection._id}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            {collection.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <DrawerFooter className="px-0">
                <Button
                  disabled={
                    !selectedCollection || isCreatingNote || !noteName.trim()
                  }
                  onClick={handleAddNote}
                >
                  {isCreatingNote ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Note
                    </>
                  )}
                </Button>
              </DrawerFooter>
            </TabsContent>

            <TabsContent value="collection" className="space-y-4 pt-4">
              <div className="space-y-3">
                <LabledInput
                  label="Collection Name"
                  placeholder="Enter collection name"
                  inputClassName="bg-muted/30"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  error={
                    !collectionName.trim() && "Collection name is required"
                  }
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

              <DrawerFooter className="px-0">
                <Button
                  disabled={isCreatingCollection || !collectionName.trim()}
                  onClick={handleAddCollection}
                >
                  {isCreatingCollection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create Collection
                    </>
                  )}
                </Button>
              </DrawerFooter>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddNoteDrawer;
