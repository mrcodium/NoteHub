export const canAccessNote = ({ requester, ownerId, note, collection }) => {
  const isOwner = requester && String(requester._id) === String(ownerId);
  const isAdmin = requester && requester.role === "admin";
  const isNotePublic = note.visibility === "public";
  const isCollectionPublic = collection.visibility === "public";
  
  // Helper to check if requester is in collaborators array (handles both ID strings and objects with _id)
  const isUserInList = (list) => {
    if (!requester || !Array.isArray(list)) return false;
    return list.some(item => {
      const id = typeof item === 'object' && item !== null ? (item._id || item.id) : item;
      return String(id) === String(requester._id);
    });
  };

  const isNoteCollaborator = isUserInList(note.collaborators);
  const isCollectionCollaborator = isUserInList(collection.collaborators);

  if (isOwner || isAdmin) return true;
  if (isCollectionPublic  && isNotePublic)  return true;
  if (isCollectionPublic  && !isNotePublic) return isNoteCollaborator;
  if (!isCollectionPublic && isNotePublic)  return isCollectionCollaborator;
  if (!isCollectionPublic && !isNotePublic) return isNoteCollaborator && isCollectionCollaborator;

  return false;
};

