import TooltipWrapper from "./TooltipWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility

const AvatarStack = ({ collaborators = [], maxVisible = 5, size = "md" }) => {
  if (collaborators.length === 0) return null;

  const visibleAvatars = Math.min(collaborators.length, maxVisible);
  const hiddenCount = Math.max(collaborators.length - maxVisible, 0);

  // Size configuration
  const sizeConfig = {
    sm: {
      avatar: "h-6 w-6",
      text: "text-[10px]",
      margin: "-mr-1.5",
      border: "border",
    },
    md: {
      avatar: "h-8 w-8",
      text: "text-xs",
      margin: "-mr-3",
      border: "border-2",
    },
    lg: {
      avatar: "h-10 w-10",
      text: "text-sm",
      margin: "-mr-3",
      border: "border-2",
    },
  };

  const currentSize = sizeConfig[size] || sizeConfig.md;
  return (
    <div className="flex flex-row-reverse">
      {hiddenCount > 0 && (
        <TooltipWrapper
          message={`${hiddenCount} more collaborator${hiddenCount > 1 ? 's' : ''}`}
        >
          <Avatar className={cn(
            "relative shadow-md",
            currentSize.avatar,
            currentSize.border,
            currentSize.margin,
            "border-background"
          )}>
            <AvatarImage src={collaborators[maxVisible]?.avatar} />
            <div className="absolute bg-black/50 inset-0 flex items-center justify-center rounded-full">
              <span className={cn(
                "text-white font-medium",
                currentSize.text
              )}>
                +{hiddenCount}
              </span>
            </div>
          </Avatar>
        </TooltipWrapper>
      )}

      {collaborators.slice(0, visibleAvatars).reverse().map((collaborator) => (
        <TooltipWrapper
          key={collaborator._id}
          message={`${collaborator.fullName} (@${collaborator.userName})`}
        >
          <Avatar className={cn(
            "shadow-md",
            currentSize.avatar,
            currentSize.border,
            currentSize.margin,
            "border-background"
          )}>
            <AvatarImage
              src={collaborator.avatar}
              alt={collaborator.fullName}
            />
            <AvatarFallback className={cn("bg-muted", currentSize.text)}>
              {collaborator.fullName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </TooltipWrapper>
      ))}
    </div>
  );
};

export default AvatarStack;