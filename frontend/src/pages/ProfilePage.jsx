import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Bookmark, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import imageCompression from "browser-image-compression";
import { useNoteStore } from "@/stores/useNoteStore";
import CollectionsOption from "@/components/CollectionsOption";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { axiosInstance } from "@/lib/axios";
import ProfilePageSkeleton from "@/components/sekeletons/ProfilePageSkeleton";

const ProfilePage = () => {
  const { username } = useParams();
  const { authUser, uploadUserAvatar, isUploadingAvatar } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState(null);
  const { getAllCollections } = useNoteStore();
  const [pinnedCollections, setPinnedCollections] = useState([]);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = authUser?._id === user?._id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/user/${username}`);
        setUser(response.data);

        const collectionsData = await getAllCollections({
          userId: response.data?._id,
          guest: true,
        });
        setCollections(collectionsData || []);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setUser(null);
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, getAllCollections]);

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const option = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      const compressedFile = await imageCompression(file, option);
      await uploadUserAvatar(compressedFile);
      setPreviewUrl(null);
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error("Error compressing or uploading avatar:\n", error);
    } finally {
      e.target.value = null;
    }
  };

  const handleRenameStart = (collectionId) => {
    console.log("Rename collection:", collectionId);
  };

  const isPinned = (collectionId) => {
    return pinnedCollections.includes(collectionId);
  };

  if (isLoading) return <ProfilePageSkeleton/>

  if (!user) {
    return (
      <div className="p-4 overflow-auto flex items-center justify-center h-full">
        <Card className="max-w-screen-md w-full mx-auto p-8 text-center">
          <h2 className="text-xl font-semibold">User not found</h2>
          <p className="text-muted-foreground mt-2">
            The user @{username} doesn't exist or you don't have permission to
            view this profile.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto">
      {/* Profile Card */}
      <Card
        className={cn(
          "max-w-screen-md mx-auto overflow-hidden shadow-sm",
          isLoading && "animate-pulse"
        )}
      >
        <div
          className="relative max-h-48 w-full overflow-hidden bg-gradient-to-r from-transparent to-black/50"
          style={{ aspectRatio: "3/1" }}
        >
          <img
            src={user?.cover}
            alt="User cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://ui.shadcn.com/placeholder.svg";
              e.currentTarget.classList.add("dark:brightness-[0.2]");
            }}
          />
        </div>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="relative shadow-md size-28 sm:size-48 shrink-0 border-4 sm:border-8 border-background -mt-14 rounded-full">
              <AvatarImage
                className="w-full h-full object-cover rounded-full bg-background"
                src={previewUrl || user?.avatar}
                alt={user?.fullName || "user profile"}
              />
              <AvatarFallback className="text-4xl">
                <img
                  className="w-full h-full object-cover dark:brightness-[0.2]"
                  src="/avatar.png"
                  alt="shadcn"
                />
              </AvatarFallback>
              {isOwner && (
                <Button
                  variant="secondary"
                  className="p-0 size-7 sm:size-8 absolute bottom-0 right-0 sm:bottom-2 sm:right-2 z-10 pointer"
                >
                  <label
                    htmlFor="upload-photo"
                    className="p-4 flex items-center space-x-2 cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Camera />
                    )}
                    <input
                      type="file"
                      hidden
                      id="upload-photo"
                      accept="image/*"
                      disabled={isUploadingAvatar}
                      onChange={handleUploadAvatar}
                    />
                  </label>
                </Button>
              )}
            </Avatar>
            <div>
              <h2 className="text-base sm:text-xl font-semibold">{user?.fullName}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">@{user?.userName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections Section */}
      <div className="max-w-screen-md mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Collections</h2>
          <div className="text-sm text-muted-foreground">
            {collections.length}{" "}
            {collections.length === 1 ? "collection" : "collections"}
          </div>
        </div>

        {collections.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-muted-foreground">No collections found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <Card
                key={collection._id}
                className={cn(
                  "group hover:shadow-md transition-all",
                  isPinned(collection._id) && "bg-input/50"
                )}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
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
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`${collection.slug}`}
                          className="hover:underline font-medium"
                        >
                          {collection.name}
                        </Link>
                        <Badge variant="secondary" className="text-xs">
                          {collection.notes.length}{" "}
                          {collection.notes.length === 1 ? "note" : "notes"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created{" "}
                        {format(new Date(collection.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  {isOwner && (
                    <CollectionsOption
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity size-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="size-4" />
                          <span className="sr-only">More</span>
                        </Button>
                      }
                      onOpenChange={setIsOptionsOpen}
                      collection={collection}
                      onRenameStart={handleRenameStart}
                      setPinnedCollections={setPinnedCollections}
                      pinnedCollections={pinnedCollections}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
