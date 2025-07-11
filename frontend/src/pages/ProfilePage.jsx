import { cn } from "@/lib/utils";

import React, { useState } from 'react';
import { DrawerDialog } from "../components/EditProfile";
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Pencil } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import imageCompression from "browser-image-compression";
import Calendar from "@/components/contributionCalendar/Calendar";

const ProfilePage = () => {
  const { authUser, uploadUserAvatar, isUploadingAvatar } = useAuthStore();
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const handleUploadAvatar = async(e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const option = {
      maxSizeMB: 0.2,
      maxWidthOrheight: 1920,
      useWebWorker: true,
    }
    try {
      // Show a preview while compressing the image
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);

      // Compressing the image
      const compressedFile = await imageCompression(file, option);
      await uploadUserAvatar(compressedFile);
      setPreviewUrl(null); 
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      console.error('Error compressing or uploading avatar:\n', error);
    } finally{
      e.target.value = null;
    }
  }

  return (
    <div className="p-4 overflow-auto">
      <Card className="max-w-screen-md mx-auto overflow-hidden">
        <div className="h-52 overflow-hidden bg-muted/50 relative">
        <Avatar>
          <AvatarImage 
            className="w-full h-full object-cover"
            src={authUser?.cover} />
          <AvatarFallback>
            <img
              className="object-cover w-full h-full dark:brightness-[0.2]"
              src="https://ui.shadcn.com/placeholder.svg"
              alt="" 
            />
          </AvatarFallback>
        </Avatar>
        </div>
        <CardContent>
          <div className="border-b pb-8 mb-8 flex items-center space-x-4">
            <Avatar className="relative shadow-md size-48 shrink-0 border-8 border-background -mt-14 rounded-full">
              <AvatarImage
                className="w-full h-full object-cover rounded-full bg-background"
                src={previewUrl || authUser?.avatar}
                alt={authUser?.fullName || "user profile"}
              />
              <AvatarFallback className="text-4xl">
                <img
                  className="w-full h-full object-cover dark:brightness-[0.2]"
                  src="/avatar.png"
                  alt="shadcn"
                />
              </AvatarFallback>
              <Button variant="secondary" size="icon" className="p-0 absolute bottom-2 right-2 z-10 pointer">
                <label htmlFor="upload-photo" className="p-4 flex items-center space-x-2 cursor-pointer">
                  {isUploadingAvatar? <Loader2 className="animate-spin" /> : <Camera />}

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
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{authUser?.fullName}</h2>
              <p className="text-gray-500">@{authUser?.userName}</p>
            </div>
          </div>

          <Calendar username={authUser?.userName}/>

        </CardContent>
      </Card>
    </div>
  );
};

function ProfileForm({ className, field, defaultValue, apiEndPoint, dataKey }) {
  const [value, setValue] = useState(defaultValue);
  const { updateUserField } = useAuthStore();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { [dataKey]: value }
    await updateUserField(apiEndPoint, data);
  }
  return (
    <form onSubmit={handleSubmit} className={cn("grid items-start gap-4", className)}>
      <div className="grid gap-2">
        <Label htmlFor={field}>{field}</Label>
        <Input
          type="text"
          id={field}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}

export default ProfilePage;
