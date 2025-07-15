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

const AddNoteDrawer = ({ trigger }) => {
  const [noteName, setNoteName] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [collaborators, setCollaborators] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
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
          query,
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
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
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
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Note Name
                  </label>
                  <Input
                    placeholder="Enter note title"
                    value={noteName}
                    onChange={(e) => setNoteName(e.target.value)}
                  />
                  {!noteName.trim() && (
                    <p className="text-xs mt-1 text-red-500">
                      Note name is required
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Collection
                  </label>
                  <Select
                    value={selectedCollection?._id}
                    onValueChange={(value) => {
                      const collection = collections.find(
                        (col) => col._id === value
                      );
                      setSelectedCollection(collection);
                    }}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Visibility
                  </label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted">
                      <SelectItem
                        className="hover:bg-accent cursor-pointer"
                        value="public"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-accent cursor-pointer"
                        value="private"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Collaborators
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user._id}
                            onClick={() => addCollaborator(user)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>
                                <img src="/avatar.svg" alt={user?.fullName} />
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p>{user?.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                @{user?.userName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isSearching &&
                      searchQuery &&
                      searchResults.length === 0 && (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          No users found
                        </div>
                      )}

                    {collaborators.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded-lg">
                        {collaborators.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center gap-1 p-1 pr-2 bg-secondary rounded-full text-sm"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                <img src="/avatar.svg" alt={user?.fullName} />
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.username}</span>
                            <Button
                              variant="ghost"
                              onClick={() => removeCollaborator(user._id)}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <X />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Collection Name
                  </label>
                  <Input
                    placeholder="Enter collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Visibility
                  </label>

                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted">
                      <SelectItem
                        className="hover:bg-accent cursor-pointer"
                        value="public"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-accent cursor-pointer"
                        value="private"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">
                    Collaborators
                  </label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user._id}
                            onClick={() => addCollaborator(user)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback>
                                <img src="/avatar.svg" alt={user?.fullName} />
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p>{user?.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                @{user?.userName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isSearching &&
                      searchQuery &&
                      searchResults.length === 0 && (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          No users found
                        </div>
                      )}

                    {collaborators.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded-lg">
                        {collaborators.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center gap-1 p-1 pr-2 bg-secondary rounded-full text-sm"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                <img src="/avatar.svg" alt={user?.fullName} />
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.username}</span>
                            <Button
                              variant="ghost"
                              onClick={() => removeCollaborator(user._id)}
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <X />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
