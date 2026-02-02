import {
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDraftStore } from "@/stores/useDraftStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "./ui/alert-dialog";
import { useState } from "react";

const DraftsSection = () => {
  const { authUser } = useAuthStore();
  const { drafts, clearUserDrafts } = useDraftStore();
  const { closeSidebar, isMobile } = useSidebar();
  const [open, setOpen] = useState(false);

  // ✅ Get drafts for current user only
  const userDrafts = drafts[authUser._id] || {};
  const entries = Object.entries(userDrafts); // [[noteId, draft]]

  if (entries.length === 0) return null;

  const handleClearDrafts = () => {
    clearUserDrafts(authUser._id); // only clear this user's drafts
    setOpen(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex justify-between items-center h-auto mb-2">
        Unsaved Drafts
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              className="size-6 bg-primary/10 text-muted-foreground hover:text-primary hover:bg-primary/20"
              variant="secondary"
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Drafts?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete all your unsaved drafts. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearDrafts}>
                Clear All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarGroupLabel>

      <div className="space-y-1 px-1">
        {entries.map(([noteId, draft]) => (
          <Link
            key={noteId}
            to={`/note/${noteId}/editor`} 
            onClick={() => isMobile && closeSidebar()}
            className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            {draft.name || "Untitled draft"}
          </Link>
        ))}
      </div>
    </SidebarGroup>
  );
};

export default DraftsSection;
