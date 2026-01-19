// src > pages > collection > CollectionNotesGrid
import NoteCard from "./NoteCard";

// CollectionNotesGrid.jsx
export const CollectionNotesGrid = ({
  sortedNotes,
  isOwner,
  username,
  collectionSlug,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
};
