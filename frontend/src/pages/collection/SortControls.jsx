import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";

export const SortControls = ({
  sortBy,
  sortDirection,
  onSortByChange,
  onSortDirectionToggle,
}) => {
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="justify-end">
            <ArrowDownUp className="h-4 w-4" />
            <span className="capitalize">{sortBy}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onSortByChange("created")}>
            Created
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortByChange("updated")}>
            Updated
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortByChange("name")}>
            Name
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="secondary"
        className="size-8"
        onClick={onSortDirectionToggle}
      >
        {sortDirection === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};