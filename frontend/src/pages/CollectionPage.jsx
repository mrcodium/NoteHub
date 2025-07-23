import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { axiosInstance } from "@/lib/axios";
import { useNoteStore } from "@/stores/useNoteStore";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  EllipsisVertical,
  FileText,
  PackageOpen,
  TriangleAlert,
  Clock,
  Calendar,
  Lock,
  Eye,
  File,
  LockOpen,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import CollectionPageSkeleton from "@/components/sekeletons/CollectionPageSkeleton";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import NotesOption from "@/components/NotesOption";
import { format } from "date-fns";
import TooltipWrapper from "@/components/TooltipWrapper";
import AddNoteDrawer from "@/components/AddNoteDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CollectionPage = () => {
  const { username, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [guestCollection, setGuestCollection] = useState(null); // Add this state
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("created");
  const [sortDirection, setSortDirection] = useState("desc");
  const { getCollection, collections: ownerCollections } = useNoteStore();
  const { authUser } = useAuthStore();

  const isOwner = authUser?.userName.toLowerCase() === username.toLowerCase();

  const collection = useMemo(() => {
    if (isOwner) {
      return ownerCollections.find((c) => c.slug === collectionSlug);
    }
    return guestCollection; // Return guest collection when not owner
  }, [isOwner, ownerCollections, collectionSlug, guestCollection]);

  const notes = useMemo(() => collection?.notes || [], [collection]);
  const sortedNotes = useMemo(() => {
    if (!notes) return [];

    const notesCopy = [...notes];
    const modifier = sortDirection === "asc" ? 1 : -1;

    const sortFunctions = {
      created: (a, b) =>
        modifier *
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      updated: (a, b) =>
        modifier *
        (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()),
      name: (a, b) => modifier * a.name.localeCompare(b.name),
    };

    return notesCopy.sort(sortFunctions[sortBy]);
  }, [notes, sortBy, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        if (!isOwner) {
          const response = await axiosInstance.get(`/user/${username}`);
          setUser(response.data);

          const collectionsData = await getCollection({
            userId: response.data?._id,
            slug: collectionSlug,
          });
          setGuestCollection(collectionsData); // Store the fetched collection
          setUser(response.data);
        } else {
          setUser(authUser);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setUser(null);
        setGuestCollection(null); // Reset guest collection on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, collectionSlug, getCollection, isOwner, authUser]);

  if (isLoading) return <CollectionPageSkeleton />;

  if (!user || (!collection && isOwner)) {
    return (
      <div className="container mx-auto mt-20 px-4 py-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <TriangleAlert className="h-12 w-12 text-yellow-500" />
          <h2 className="text-2xl font-bold">Collection Not Found</h2>
          <p className="text-muted-foreground">
            The collection you're looking for doesn't exist or may have been
            removed.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container overflow-y-auto mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                {user?.fullName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                {user?.fullName}
              </h1>
              <Link
                to={`/user/${user?.userName}`}
                className="hover:underline text-sm sm:text-base text-muted-foreground"
              >
                @{user?.userName}
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {collection.collaborators && (
              <div className="space-y-2">
                <h4 className="text-muted-foreground font-medium">
                  Collaborators
                </h4>
                <div className="flex gap-2">
                  {collection.collaborators.map((collaborator) => (
                    <TooltipWrapper
                      key={collaborator._id}
                      message={"@" + collaborator.userName}
                    >
                      <Avatar>
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback>
                          <img src="/avatar.svg" />
                        </AvatarFallback>
                      </Avatar>
                    </TooltipWrapper>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold">{collection?.name}</h2>
                <Badge variant="secondary" className="px-3 py-1 whitespace-nowrap">
                  {notes.length} {notes.length === 1 ? "Note" : "Notes"}
                </Badge>
              </div>

              {/* Add the filter dropdown here */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-end"
                    >
                      <ArrowDownUp className="h-4 w-4" />
                      <span className="capitalize">{sortBy}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortBy("created")}>
                      Created
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("updated")}>
                      Updated
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("name")}>
                      Name
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="secondary"
                  className="size-8"
                  onClick={toggleSortDirection}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Separator />

        {/* Notes Grid */}
        {sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                isOwner={isOwner}
                username={username}
                collectionSlug={collectionSlug}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <PackageOpen className="h-16 w-16 stroke-1 text-muted-foreground" />
            <h3 className="text-xl font-medium">No notes in this collection</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This collection doesn't have any notes yet. When notes are added,
              they'll appear here.
            </p>
            {isOwner && (
              <AddNoteDrawer
                trigger={<Button>Create your first note</Button>}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const NoteCard = React.memo(({ note, isOwner, username, collectionSlug }) => {
  const inputRef = useRef(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const { renameNote } = useNoteStore();

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isRenaming]);

  const handleSaveRename = useCallback(() => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsRenaming(false);
  }, [note.name, note._id, renameNote]);

  const handleKeyDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        handleSaveRename();
      } else if (e.key === "Escape") {
        if (inputRef.current) {
          inputRef.current.value = note.name;
        }
        setIsRenaming(false);
      }
    },
    [handleSaveRename, note.name]
  );

  return (
    <Card className={"h-full flex flex-col hover:shadow-md transition-shadow"}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <File className="size-4 text-muted-foreground flex-shrink-0" />
            {isRenaming ? (
              <Input
                ref={inputRef}
                defaultValue={note.name}
                className="font-medium h-8 flex-1"
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`/user/${username}/${collectionSlug}/${note.slug}`}
                    className="font-medium text-sm line-clamp-1 hover:underline flex-1"
                  >
                    {note.name}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{note.name}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {isOwner && (
            <NotesOption
              trigger={<EllipsisVertical className="size-4" />}
              note={note}
              setIsRenaming={setIsRenaming}
            />
          )}
        </div>
      </CardHeader>

      <CardFooter className="mt-auto p-4 pt-0 ">
        <div className="flex items-center justify-between w-full text-xs">
          <Badge
            variant={note.visibility === "public" ? "secondary" : "destructive"}
            className="flex items-center gap-1 h-auto"
          >
            {note.visibility === "public" ? (
              <Eye className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {note.visibility}
          </Badge>

          <TooltipWrapper
            message={`Created on ${format(
              new Date(note.createdAt),
              "MMMM d, yyyy"
            )}`}
          >
            <div className="flex gap-1 items-center text-muted-foreground">
              <Calendar className="size-3" />
              <span>{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
            </div>
          </TooltipWrapper>
        </div>
      </CardFooter>
    </Card>
  );
});

export default CollectionPage;
