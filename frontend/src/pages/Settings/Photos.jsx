import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Loader2, Trash2 } from "lucide-react";
import React, { useState } from "react";
import imageCompression from "browser-image-compression";

const Photos = () => {
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

  const [previewavatar, setPreviewavatar] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos & Cover</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Update your profile and cover photos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        {/* AVATAR SECTION  */}
        <div className="space-y-4">
          <Label>Your Photo</Label>
          <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
            <Avatar className="relative aspect-square shadow-md size-28 sm:size-44 shrink-0 border-background rounded-full">
              <AvatarImage
                size={176} 
                className="w-full h-full object-cover rounded-full bg-background"
                src={previewavatar || authUser?.avatar}
                alt={authUser?.fullName || "User Profile Photo"}
              />
              <AvatarFallback className="text-4xl">
                <img
                  className="w-full h-full object-cover dark:brightness-[0.2]"
                  src="/avatar.svg"
                  alt="user-profile"
                />
              </AvatarFallback>
            </Avatar>

            <div className="space-y-6">
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  File smaller than 10MB and at least 400px by 400px
                </p>
                <p className="text-muted-foreground text-sm">
                  This image will be shwon in your profile page if you choose to
                  share it with other memeber it will also help us recognize you
                </p>
              </div>

              <div className="flex gap-2">
                <Label htmlFor="profile-photo">
                  <input
                    type="file"
                    id="profile-photo"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingAvatar}
                    onChange={(e) =>
                      handleUploadImage(e, setPreviewavatar, uploadUserAvatar)
                    }
                  />
                  <div
                    className={`button w-32 cursor-pointer ${
                      isUploadingAvatar && "disabled"
                    }`}
                  >
                    {isUploadingAvatar ? (
                      <span className="flex items-center gap-1">
                        Uploading... <Loader2 className="animate-spin" />
                      </span>
                    ) : (
                      "Upload Photo"
                    )}
                  </div>
                </Label>

                <Button
                  onClick={() =>
                    handleRemoveImage(setPreviewavatar, removeUserAvatar)
                  }
                  size="icon"
                  disabled={isRemovingAvatar || !authUser?.avatar}
                  variant="secondary"
                  className="relative overflow-hidden"
                >
                  {isRemovingAvatar ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* COVER SECTION  */}
        <div className="space-y-4">
          <Label>Profile Page Cover</Label>
          <div className="flex flex-col sm:flex-col gap-8 items-start">
            {/* relative aspect-video shadow-md h-44 sm:h-auto sm:w-44 shrink-0 */}
            <div className="rounded-xl overflow-hidden">
              <img
                className="w-full h-full object-cover bg-background"
                src={previewCover || authUser?.cover || "/profile-cover.svg"}
                alt="background-cover-image"
                onError={(e) => {
                  e.currentTarget.src = "/profile-cover.svg";
                  e.currentTarget.classList.add("dark:brightness-[0.2]");
                }}
              />
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="font-semibold text-sm">
                  File smaller than 10MB and at least 1200px by 300px
                </p>
                <p className="text-muted-foreground text-sm">
                  This image will be shown as background banner in your profile
                  page if you choose to share it with other members.
                </p>
              </div>

              <div className="flex gap-2">
                <Label htmlFor="profile-cover">
                  <input
                    type="file"
                    id="profile-cover"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingCover}
                    onChange={(e) =>
                      handleUploadImage(e, setPreviewCover, uploadUserCover)
                    }
                  />
                  <div
                    className={`button w-32 cursor-pointer ${
                      isUploadingCover && "disabled"
                    }`}
                  >
                    {isUploadingCover ? (
                      <span className="flex items-center gap-1">
                        Uploading... <Loader2 className="animate-spin" />
                      </span>
                    ) : (
                      "Upload Photo"
                    )}
                  </div>
                </Label>

                <Button
                  onClick={() =>
                    handleRemoveImage(setPreviewCover, removeUserCover)
                  }
                  size="icon"
                  disabled={isRemovingCover || !authUser?.cover}
                  variant="secondary"
                  className="relative overflow-hidden"
                >
                  {isRemovingCover ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Photos;
