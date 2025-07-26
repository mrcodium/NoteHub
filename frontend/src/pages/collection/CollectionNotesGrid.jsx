// src > pages > collection > CollectionNotesGrid
import { useState } from "react";
import { CollaboratorsDialog } from "./CollaboratorsDialog";
import NoteCard from "./NoteCard";
import { useNoteStore } from "@/stores/useNoteStore";
import { useCollaboratorManager } from "@/contex/CollaboratorManagerContext";

// CollectionNotesGrid.jsx
export const CollectionNotesGrid = ({
  sortedNotes,
  isOwner,
  username,
  collectionSlug,
}) => {
  return (
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
  );
};
