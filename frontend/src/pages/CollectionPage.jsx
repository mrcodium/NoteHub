import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PackageOpen, TriangleAlert } from "lucide-react";
import { NoteCard } from "@/components/NoteCard";

const CollectionPage = () => {
  const { username, collectionName } = useParams();
  const [user, setUser] = useState(null);
  const [collection, setCollection] = useState(null);
  const { getCollection } = useNoteStore();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/user/${username}`);
        setUser(response.data);

        const collectionsData = await getCollection({
          userId: response.data?._id,
          name: collectionName,
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
  }, [username, collectionName, getCollection]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6 mt-2" />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  console.log(collection);

  if (!user || !collection) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                <img src="/avatar.png" alt={user?.fullName} />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user?.fullName}</h1>
              <p className="text-muted-foreground">@{user?.userName}</p>
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
        {console.log(notes)}
        {notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note, index) => (
              <NoteCard
                key={`${note._id}-${index}`}
                note={note}
                collectionName={note.collectionName}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <PackageOpen
              strokeWidth={1}
              className="h-16 w-16 text-muted-foreground"
            />
            <h3 className="text-xl font-medium">No notes in this collection</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This collection doesn't have any notes yet. When notes are added,
              they'll appear here.
            </p>
            <Button variant="outline" asChild>
              <Link to="/notes">Browse Notes</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
