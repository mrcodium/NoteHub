import { Separator } from "@/components/ui/separator";
import { EmptyState } from "./EmptyState";
import { PackageOpen, SearchX } from "lucide-react";
import NoteCard from "./NoteCard";

export const CollectionNotesGrid = ({
  notes,
  sortedNotes,
  isOwner,
  username,
  collectionSlug,
  collection,
}) => {
  if (!collection) {
    return (
      <EmptyState
        icon={<SearchX className="h-16 w-16 stroke-1 text-muted-foreground" />}
        title="Collection not found"
        description="Either the collection you're trying to access doesn't exist, or it's been marked private by the creator."
        showCreateButton={isOwner}
      />
    );
  }

  if (sortedNotes.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-16 w-16 stroke-1 text-muted-foreground" />}
        title="No notes in this collection"
        description="This collection doesn't have any notes yet. When notes are added, they'll appear here."
        showCreateButton={isOwner}
      />
    );
  }

  return (
    <>
      <Separator />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedNotes.map((note) => (
          <NoteCard
            key={note._id}
            note={note}
            isOwner={isOwner}
            username={username}
            collectionSlug={collectionSlug}
          />
        ))}
      </div>
    </>
  );
};