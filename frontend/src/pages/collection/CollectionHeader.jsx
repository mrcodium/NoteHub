// src > pages > collection > CollectionHeader
import AvatarStack from "@/components/CollaboratorAvatars";
import BadgeIcon from "@/components/icons/BadgeIcon";
import TooltipWrapper from "@/components/TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useCollaboratorManager } from "@/contex/CollaboratorManagerContext";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const CollectionHeader = ({ user, collection, isOwner }) => {
  if (!user) return null;
  const { openDialog } = useCollaboratorManager();

  const hasCollaborators = collection?.collaborators?.length > 0;
  const showCollaboratorSection = isOwner || hasCollaborators;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* User Profile Section */}
      <div className="flex items-center gap-4">
        <Dialog>
          <DialogTrigger>
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage
                src={user?.avatar}
                alt={user?.fullName || "User Profile Photo"}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {user?.fullName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DialogTrigger>
          <DialogContent
            className="rounded-full max-w-96 max-h-96 p-0 overflow-hidden"
            style={{ borderRadius: "50%" }}
          >
            <img
              className="w-full h-full"
              src={user?.avatar}
              alt={user?.fullName}
            />
          </DialogContent>
        </Dialog>
        <div>
          <Link to={`/user/${user?.userName}`}>
            <h2 className="flex gap-2.5 items-center text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
              {user?.fullName}
              {user.role === "admin" && (
                <BadgeIcon className="size-4 sm:size-5 text-blue-500" />
              )}
            </h2>
            <div
              to={`/user/${user?.userName}`}
              className="text-sm sm:text-base text-muted-foreground transition-colors"
            >
              @{user?.userName}
            </div>
          </Link>
        </div>
      </div>

      {collection && (
        <div className="space-y-6">
          {/* Collaborators Section - Only shown to owner or collaborators */}
          {showCollaboratorSection && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-muted-foreground font-medium">
                  Collaborators
                </h4>
                {isOwner && (
                  <Button
                    tooltip="Add collaborators"
                    size="sm"
                    className="rounded-full h-8 w-8 p-0"
                    onClick={() =>
                      openDialog(
                        collection?.collaborators || [],
                        collection?._id,
                        "collection",
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {hasCollaborators ? (
                <div className="flex items-center gap-3">
                  <AvatarStack
                    collaborators={collection.collaborators}
                    maxVisible={4}
                    size="lg"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Add collaborators to work together on this collection
                </p>
              )}
            </div>
          )}

          {/* Collection Title Section */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {collection?.name}
              </h1>
              <Badge
                variant="secondary"
                className="px-3 py-1 whitespace-nowrap text-sm font-medium"
              >
                {collection?.notes?.length || 0}{" "}
                {collection?.notes?.length === 1 ? "Note" : "Notes"}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
