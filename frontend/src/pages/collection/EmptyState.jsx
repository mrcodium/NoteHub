import AddNoteDrawer from "@/components/AddNoteDrawer";
import { Button } from "@/components/ui/button";

export const EmptyState = ({ icon, title, description, showCreateButton }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      {icon}
      <h3 className="text-xl font-medium">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md">
        {description}
      </p>
      {showCreateButton && (
        <AddNoteDrawer
          trigger={
            <Button tooltip="Create Notes">Create your first note</Button>
          }
        />
      )}
    </div>
  );
};
