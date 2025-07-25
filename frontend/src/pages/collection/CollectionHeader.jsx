import TooltipWrapper from "@/components/TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const CollectionHeader = ({
  user,
  collection,
  isOwner,
  onAddCollaborator,
}) => {
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
                    <CollaboratorAvatars
                      collaborators={collection.collaborators}
                    />
                  )}
                {isOwner && (
                  <Button
                    className="size-10 text-xl rounded-full"
                    onClick={onAddCollaborator}
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

const CollaboratorAvatars = ({ collaborators }) => (
  <div className="flex flex-row-reverse">
    {collaborators.length > 5 && (
      <TooltipWrapper
        message={`${collaborators.length - 5} more collaborators`}
      >
        <Avatar className="relative border-2 -mr-3 shadow-md">
          <AvatarImage src={collaborators[5].avatar} />
          <div className="absolute bg-black/70 inset-0 flex items-center justify-center">
            <span className="text-white text-xs">
              +{collaborators.length - 5}
            </span>
          </div>
        </Avatar>
      </TooltipWrapper>
    )}
    {collaborators.slice(0, 5).map((collaborator) => (
      <TooltipWrapper
        key={collaborator._id}
        message={"@" + collaborator.userName}
      >
        <Avatar className="border-2 -mr-2 shadow-md">
          <AvatarImage src={collaborator.avatar} />
          <AvatarFallback>
            {collaborator.fullName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </TooltipWrapper>
    ))}
  </div>
);
