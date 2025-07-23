import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/stores/useAuthStore";
import imageCompression from "browser-image-compression";
import { useNoteStore } from "@/stores/useNoteStore";
import { useParams } from "react-router-dom";
import { axiosInstance } from "@/lib/axios";
import {
  CollectionSkeleton,
  ProfilePageSkeleton,
} from "@/components/sekeletons/ProfilePageSkeleton";
import { useLocalStorage } from "@/stores/useLocalStorage";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CollectionCard from "@/components/CollectionCard";

const ProfilePage = () => {
  const { username } = useParams();
  const {
    authUser,
    uploadUserAvatar,
    removeUserAvatar,
    isUploadingAvatar,
    isRemovingAvatar,
    isUploadingCover,
    isRemovingCover,
    uploadUserCover,
    removeUserCover,
  } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState(null);
  const {
    getAllCollections,
    collections: ownerCollections,
    isCollectionsLoading: isOwnerCollectionsLoading,
  } = useNoteStore();
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pinnedCollections } = useLocalStorage();
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [currentImageType, setCurrentImageType] = useState(null); // 'avatar' or 'cover'
  const [previewavatar, setPreviewavatar] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);

  const isOwner = authUser?.userName === username;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        if (isOwner) {
          // Use store data for owner
          setUser(authUser);
          setCollections(ownerCollections || []);
        } else {
          // Fetch data for other users
          const response = await axiosInstance.get(`/user/${username}`);
          setUser(response.data);

          const collectionsData = await getAllCollections({
            userId: response.data?._id,
            guest: true,
          });
          setCollections(collectionsData || []);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setUser(null);
        setCollections([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, authUser, ownerCollections, isOwner, getAllCollections]);

  const handleUploadImage = async (e, setPreview, onUpload) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Set image preview (optional)
      const previewURL = URL.createObjectURL(file);
      setPreview(previewURL);

      let finalFile = file;

      // 🗜️ Compress only if size > 1MB
      if (file.size > 1024 * 1024) {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        finalFile = await imageCompression(file, options);
      }
      await onUpload(finalFile);
      setPreview(null);
    } catch (error) {
      console.error("Error compressing or uploading:\n", error);
    } finally {
      e.target.value = null; // Reset file input
    }
  };

  const handleRemoveImage = async (setPreview, onRemove) => {
    const result = await onRemove();
    if (result) {
      setPreview(null);
    }
  };

  const filteredCollections = collections.sort((a, b) => {
    const aPinned = pinnedCollections.includes(a._id);
    const bPinned = pinnedCollections.includes(b._id);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  if (isLoading) return <ProfilePageSkeleton />;

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

  const disableImageRemove =
    currentImageType === "avatar"
      ? isRemovingAvatar || !user?.avatar // disable for avatar
      : isRemovingCover || !user?.cover; // disable for cover

  const disableImageUpload =
    currentImageType === "avatar" ? isUploadingAvatar : isUploadingCover;

  const noPhoto =
    currentImageType === "avatar"
      ? !Boolean(user?.avatar) && !previewCover
      : !Boolean(user?.cover) && !previewavatar;

  return (
    <div className="p-4 overflow-auto">
      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-[100vw] sm:max-w-none w-auto">
          <DialogHeader className="p-0 hidden">
            <DialogTitle>
              {currentImageType === "avatar" ? "Profile Photo" : "Cover Photo"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col p-0">
            {noPhoto ? (
              <div className="relative w-[300px] h-[300px] p-4">
                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground h-full">
                  <div className="p-8 rounded-full bg-input/30">
                    <ImageOff className="size-16 stroke-1" />
                  </div>
                  <p className="text-center text-sm">No {currentImageType}</p>
                </div>
              </div>
            ) : (
              <div className="bg-accent flex justify-center items-center">
                <img
                  src={
                    (currentImageType === "avatar"
                      ? user?.avatar
                      : user?.cover) || "/avatar.svg"
                  }
                  alt={`user ${currentImageType}`}
                  className="max-w-[100vw] max-h-[80vh] object-contain"
                  style={{
                    width:
                      currentImageType === "avatar"
                        ? "min(400px, 100vw)"
                        : "min(800px, 100vw)",
                    height: "auto",
                  }}
                />
              </div>
            )}

            {isOwner && (
              <DialogFooter className="p-4 border-t sticky bottom-0 bg-background">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Label htmlFor={currentImageType} className="contents">
                    <input
                      type="file"
                      id={currentImageType}
                      accept="image/*"
                      className="hidden"
                      disabled={disableImageUpload}
                      onChange={(e) =>
                        handleUploadImage(
                          e,
                          currentImageType === "avatar"
                            ? setPreviewavatar
                            : setPreviewCover,
                          currentImageType === "avatar"
                            ? uploadUserAvatar
                            : uploadUserCover
                        )
                      }
                    />
                    <div
                      className={cn(
                        "button cursor-pointer w-full",
                        disableImageUpload && "disabled"
                      )}
                    >
                      {disableImageUpload ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading
                        </>
                      ) : (
                        "Upload"
                      )}
                    </div>
                  </Label>

                  <Button
                    onClick={() =>
                      handleRemoveImage(
                        currentImageType === "avatar"
                          ? setPreviewavatar
                          : setPreviewCover,
                        currentImageType === "avatar"
                          ? removeUserAvatar
                          : removeUserCover
                      )
                    }
                    disabled={disableImageRemove}
                    variant="secondary"
                    className="w-full"
                  >
                    {isRemovingAvatar || isRemovingCover ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Card */}
      <Card
        className={cn(
          "max-w-screen-md mx-auto overflow-hidden shadow-sm",
          isLoading && "animate-pulse"
        )}
      >
        <Avatar
          className="relative rounded-none max-h-48 h-full w-full overflow-hidden cursor-pointer"
          style={{ aspectRatio: "3/1" }}
          onClick={() => {
            setCurrentImageType("cover");
            setIsImageDialogOpen(true);
          }}
        >
          <AvatarImage
            src={user?.cover}
            alt="User cover"
            className="w-full h-full max-h-48 object-cover"
            style={{ aspectRatio: "3/1" }}
          />
          <AvatarFallback className="rounded-none brightness-[0.2]">
            <img
              src="/placeholder.svg"
              alt="placeholder"
              className="w-full h-full object-cover"
              style={{ aspectRatio: "3/1" }}
            />
          </AvatarFallback>
        </Avatar>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar
              className="relative shadow-md size-28 sm:size-48 shrink-0 border-4 sm:border-8 border-background -mt-14 rounded-full cursor-pointer"
              onClick={() => {
                setCurrentImageType("avatar");
                setIsImageDialogOpen(true);
              }}
            >
              <AvatarImage
                className="w-full h-full object-cover rounded-full bg-background"
                src={previewUrl || user?.avatar}
                alt={user?.fullName || "user profile"}
              />
              <AvatarFallback className="text-4xl">
                <img
                  className="w-full h-full object-cover dark:brightness-[0.2]"
                  src="/avatar.svg"
                  alt="user-profile"
                />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-base sm:text-xl font-semibold">
                {user?.fullName}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                @{user?.userName}
              </p>
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

        {isOwnerCollectionsLoading ? (
          <CollectionSkeleton />
        ) : collections.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-muted-foreground">No collections found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCollections.map((collection) => (
              <CollectionCard
                key={collection._id}
                collection={collection}
                isOwner={isOwner}
                pinnedCollections={pinnedCollections}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
