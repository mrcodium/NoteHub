// src/context/CollaboratorManagerContext.jsx
import { createContext, useContext, useState } from 'react';

const CollaboratorManagerContext = createContext();

export const CollaboratorManagerProvider = ({ children }) => {
  const [currentCollaborators, setCurrentCollaborators] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [type, setType] = useState(null); // 'collection' or 'note'
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = (collaborators, id, dialogType) => {
    setCurrentCollaborators(collaborators || []);
    setTargetId(id);
    setType(dialogType);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    // Small delay to allow animations to complete before resetting
    setTimeout(() => {
      setCurrentCollaborators([]);
      setTargetId(null);
      setType(null);
    }, 300);
  };

  return (
    <CollaboratorManagerContext.Provider
      value={{
        currentCollaborators,
        targetId,
        type,
        isDialogOpen,
        openDialog,
        closeDialog,
      }}
    >
      {children}
    </CollaboratorManagerContext.Provider>
  );
};

export const useCollaboratorManager = () => {
  const context = useContext(CollaboratorManagerContext);
  if (!context) {
    throw new Error("useCollaboratorManager must be used within a CollaboratorManagerProvider.");
  }
  return context;
};