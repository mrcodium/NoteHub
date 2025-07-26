// src > pages > collection > CollectionHeader
import AvatarStack from "@/components/CollaboratorAvatars";
import TooltipWrapper from "@/components/TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollaboratorManager } from "@/contex/CollaboratorManagerContext";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const CollectionHeader = ({ user, collection, isOwner }) => {
  const { openDialog } = useCollaboratorManager();
  
  const hasCollaborators = collection?.collaborators?.length > 0;
  const showCollaboratorSection = isOwner || hasCollaborators;
  
  return (
    <div className="flex flex-col gap-6">
      {/* User Profile Section */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {user?.fullName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
            {user?.fullName}
          </h1>
          <Link
            to={`/user/${user?.userName}`}
            className="hover:underline text-sm sm:text-base text-muted-foreground transition-colors"
          >
            @{user?.userName}
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
                  <TooltipWrapper message="Add collaborators">
                    <Button
                      size="sm"
                      className="rounded-full h-8 w-8 p-0"
                      onClick={() =>
                        openDialog(
                          collection?.collaborators || [],
                          collection?._id,
                          "collection"
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
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
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {collection?.name}
              </h2>
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