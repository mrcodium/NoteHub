import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Folders, Files } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";

// Sub-components
const ProfileTab = ({ user }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-muted-foreground">
            Username
          </Label>
          <Input id="username" value={user.userName} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="userId" className="text-muted-foreground">
            User ID
          </Label>
          <Input id="userId" value={user._id} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="createdAt" className="text-muted-foreground">
            Account Created
          </Label>
          <Input
            id="createdAt"
            value={new Date(user.createdAt).toLocaleString()}
            readOnly
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastLogin" className="text-muted-foreground">
            Last Login
          </Label>
          <Input
            id="lastLogin"
            value={
              user.lastLogin
                ? new Date(user.lastLogin.date).toLocaleString()
                : "Never"
            }
            readOnly
          />
        </div>
      </div>


      <div className="space-y-2">
        <Label className="text-muted-foreground">Statistics</Label>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4" />
            <span>{user.notesCount || 0} notes</span>
          </div>
          <div className="flex items-center gap-2">
            <Folders className="h-4 w-4" />
            <span>{user.collectionsCount || 0} collections</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
export function UserDetailDrawer({ user, open, onOpenChange }) {
  const { onlineUsers } = useAuthStore();
  if (!user) return null;
  const isOnline = onlineUsers.includes(user._id);

  return (
    <Drawer
      open={open}
      onOpenChange={(open) => {
        console.log(open);
        onOpenChange(open);
      }}
    >
      <DrawerContent className="h-[80vh]">
        <DrawerHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar} referrerPolicy="no-referrer" />
                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <div className="absolute bottom-0.5 right-0.5 size-3 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-left">{user.fullName}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant={isOnline ? "default" : "secondary"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
                <Badge variant={user.hasGoogleAuth ? "default" : "outline"}>
                  {user.hasGoogleAuth ? "Google Auth" : "Email Auth"}
                </Badge>
              </div>
            </div>
          </div>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          <ProfileTab user={user} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
