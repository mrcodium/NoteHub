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
import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import CollectionPageSkeleton from "@/components/sekeletons/CollectionPageSkeleton";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import NotesOption from "@/components/NotesOption";
import { format } from "date-fns";
import TooltipWrapper from "@/components/TooltipWrapper";
import AddNoteDrawer from "@/components/AddNoteDrawer";

const CollectionPage = () => {
  const { username, collectionSlug } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [collection, setCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const { getCollection } = useNoteStore();
  const { authUser } = useAuthStore();

  const isOwner = authUser?._id === user?._id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // fetching the user
        setIsLoading(true);
        const response = await axiosInstance.get(`/user/${username}`);
        setUser(response.data);

        // fetching collection
        const collectionsData = await getCollection({
          userId: response.data?._id,
          slug: collectionSlug,
        });
        setCollection(collectionsData);
        setNotes(collectionsData?.notes || []);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setUser(null);
        setCollection(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [username, collectionSlug, getCollection]);

  if (isLoading) return <CollectionPageSkeleton />;

  if (!user || !collection) {
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
              <h1 className="text-2xl font-bold">{user?.fullName}</h1>
              <Link
                to={`/user/${user?.userName}`}
                className="hover:underline text-muted-foreground"
              >
                @{user?.userName}
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold">{collection.name}</h2>
              <Badge variant="secondary" className="px-3 py-1">
                {notes.length} {notes.length === 1 ? "Note" : "Notes"}
              </Badge>
            </div>
            {collection.description && (
              <p className="text-muted-foreground max-w-3xl">
                {collection.description}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Notes Grid */}
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notes.map((note) => (
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
            <PackageOpen
              className="h-16 w-16 stroke-1 text-muted-foreground"
            />
            <h3 className="text-xl font-medium">No notes in this collection</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This collection doesn't have any notes yet. When notes are added,
              they'll appear here.
            </p>
            {isOwner && (
              <AddNoteDrawer
                trigger={
                  <Button>
                    Create your first note
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function NoteCard({ note, isOwner, username, collectionSlug }) {
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

  const handleSaveRename = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.value = note.name;
      }
      setIsRenaming(false);
    }
  };

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
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <Badge
            variant={
              note.visibility === "private" ? "destructive" : "secondary"
            }
            className="flex items-center gap-1"
          >
            {note.visibility}
          </Badge>

          <TooltipWrapper
            message={`Created on ${format(
              new Date(note.createdAt),
              "MMMM d, yyyy"
            )}`}
          >
            <div className="flex gap-1 items-center">
              <Calendar className="size-3" />
              <span>{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
            </div>
          </TooltipWrapper>
        </div>
      </CardFooter>
    </Card>
  );
}

export default CollectionPage;
