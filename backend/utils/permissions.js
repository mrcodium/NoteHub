export const canAccessNote = ({ requester, ownerId, note, collection }) => {
  const isOwner = requester && requester._id.equals(ownerId);
  const isNotePublic = note.visibility === "public";
  const isCollectionPublic = collection.visibility === "public";
  const isNoteCollaborator = requester && note.collaborators?.some(id => id.equals(requester._id));
  const isCollectionCollaborator = requester && collection.collaborators?.some(id => id.equals(requester._id));

  if (isOwner) return true;
  if (isCollectionPublic  && isNotePublic)  return true;
  if (isCollectionPublic  && !isNotePublic) return isNoteCollaborator;
  if (!isCollectionPublic && isNotePublic)  return isCollectionCollaborator;
  if (!isCollectionPublic && !isNotePublic) return isNoteCollaborator && isCollectionCollaborator;

  return false;
};
