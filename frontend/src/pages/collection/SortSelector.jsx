import {
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Type,
  ArrowUpAz,
  ArrowDownAZ,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const SortSelector = ({
  sortBy,
  sortDirection,
  setSortBy,
  toggleSortDirection,
}) => {
  const options = [
    {
      value: "name",
      label: "Name",
      icon: sortDirection === "asc" ? ArrowUpAz : ArrowDownAZ,
    },
    { value: "created", label: "Created", icon: Calendar },
    { value: "updated", label: "Updated", icon: Clock },
  ];

  return (
    <div className="flex gap-2 items-center">
      <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
        <SelectTrigger className="w-36" aria-label="Sort items by">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className=" px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {opt.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Sort Direction Button */}
      <Button
        tooltip={sortDirection === "asc" ? "Ascending" : "Decending"}
        size="icon"
        variant="secondary"
        onClick={toggleSortDirection}
        aria-label={
          sortDirection === "asc"
            ? "Change sort direction to descending"
            : "Change sort direction to ascending"
        }
      >
        {sortDirection === "asc" ? <ArrowUp /> : <ArrowDown />}
      </Button>
    </div>
  );
};

export default SortSelector;
