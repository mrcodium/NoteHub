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
  return (
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
      {collection && (
        <div className="space-y-4">
          {collection?.collaborators?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-muted-foreground font-medium">
                Collaborators
              </h4>
              <div className="flex gap-5">
                {collection?.collaborators &&
                  collection.collaborators.length > 0 && (
                    <AvatarStack
                      collaborators={collection.collaborators}
                      maxVisible={4}
                      size="lg"
                    />
                  )}
                {isOwner && (
                  <Button
                    className="size-10 text-xl rounded-full"
                    onClick={() =>
                      openDialog(
                        collection?.collaborators || [],
                        collection?._id,
                        "collection"
                      )
                    }
                  >
                    <Plus />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold">
                {collection?.name}
              </h2>
              <Badge
                variant="secondary"
                className="px-3 py-1 whitespace-nowrap"
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

