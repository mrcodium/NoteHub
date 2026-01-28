import {
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDraftStore } from "@/stores/useDraftStore";
import { Link } from "react-router-dom";

const DraftsSection = () => {
  const drafts = useDraftStore((state) => state.drafts);
  const { closeSidebar, isMobile } = useSidebar();

  const entries = Object.entries(drafts);

  if (entries.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Unsaved Drafts</SidebarGroupLabel>

      <div className="space-y-1 px-1">
        {entries.map(([noteId, draft]) => (
          <Link
            key={noteId}
            to={`/note/${noteId}/editor`}
            onClick={() => isMobile && closeSidebar()}
            className="flex bg-muted/50 flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            {draft.name || "Untitled draft"}
          </Link>
        ))}
      </div>
    </SidebarGroup>
  );
};

export default DraftsSection;
