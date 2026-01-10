import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { toast } from "sonner";

export const useNoteStore = create((set, get) => {
  const setStatus = (key, value) =>
    set((state) => ({
      status: { ...state.status, [key]: value },
    }));
  const updateCollectionInNotesArray = (collectionId, updatedCollection) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.collectionId?._id === collectionId
          ? {
              ...note,
              collectionId: {
                ...note.collectionId,
                ...updatedCollection,
              },
            }
          : note
      ),
    }));
  };

  const updateNoteInNotesArray = (noteId, updates) => {
    set((state) => {
      const index = state.notes.findIndex((note) => note._id === noteId);
      if (index === -1) return state;

      const newNotes = [...state.notes];
      newNotes[index] = {
        ...newNotes[index],
        ...updates,
      };
      return { notes: newNotes };
    });
  };

  return {
    // 'idle' | 'loading' | 'saving' | 'error'
    status: {
      note: { state: "idle", error: null },
      collection: { state: "idle", error: null },
      noteContent: { state: "idle", error: null },
      collaborator: { state: "idle", error: null },
    },

    selectedNote: null,
    noteNotFound: false,
    setNoteNotFound: false,

    // Stores
    collections: [],
    notesCache: {
      //noteId : {}
    },
    notes: [],

    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalNotes: 0,
      notesPerPage: 10,
      hasMore: false,
    },

    getPublicNotes: async ({ page, limit, user }) => {
      setStatus("note", { state: "loading", error: null });
      try {
        const res = await axiosInstance.get("/note", {
          params: {
            page,
            limit,
            user: user ? "true" : undefined,
          },
        });

        const { data } = res;
        const newNotes = data.data.notes;
        set({
          notes: page === 1 ? newNotes : [...get().notes, ...newNotes],
          pagination: data.data.pagination, // Use pagination directly from API
        });

        return data.data;
      } catch (error) {
        throw error;
      } finally {
        setStatus("note", { state: "idle", error: null });
      }
    },

    getNoteContent: async (noteId) => {
      const { notesCache } = get();

      if (noteId in notesCache) {
        return notesCache[noteId];
      }

      setStatus("noteContent", { state: "loading", error: null });

      try {
        const res = await axiosInstance.get(`note/${noteId}`);
        const note = res.data.note;

        set({
          notesCache: {
            ...notesCache,
            [noteId]: note,
          },
          noteNotFound: false,
        });

        return note; 
      } catch (error) {
        console.error("Error fetching note content", error);
        set({ noteNotFound: true });
        return null;
      } finally {
        setStatus("noteContent", { state: "idle", error: null });
      }
    },

    getNoteName: (noteId) => {
      const { collections } = get();
      for (const collection of collections) {
        const note = collection.notes.find((note) => note._id === noteId);
        if (note) {
          set({ noteNotFound: false });
          return note.name;
        }
      }
      set({ noteNotFound: true });
      return null;
    },

    updateContent: async (data) => {
      setStatus("noteContent", { state: "saving", error: null });
      try {
        const res = await axiosInstance.put("/note/", data);

        const { note, message } = res.data;
        set((state) => ({
          notesContent: {
            ...state.notesContent,
            [note._id]: note.content,
          },
        }));

        // Update the note in collections (for updatedAt)
        get().replaceNoteFromCollection(note);
        // Update the note in notes array (if present)
        updateNoteInNotesArray(note._id, {
          content: note.content,
          updatedAt: note.updatedAt,
        });

        toast.success(message);
      } catch (error) {
        console.log("Error in updating content", error);
        toast.error(error.response.data.message);
      } finally {
        setStatus("noteContent", { state: "idle", error: null });
      }
    },

    setselectedNote: (noteId) => {
      set({ selectedNote: noteId });
    },

    // ======= Utility methods for collections =======

    insertNoteInCollection: (collectionId, note) => {
      set((state) => ({
        collections: state.collections.map((collection) =>
          collection._id === collectionId
            ? { ...collection, notes: [...collection.notes, note] }
            : collection
        ),
      }));
    },

    deleteNoteFromCollection: (noteId) => {
      set((state) => ({
        collections: state.collections.map((collection) => ({
          ...collection,
          notes: collection.notes.filter((note) => note._id !== noteId),
        })),
      }));
    },

    replaceNoteFromCollection: (updatedNote) => {
      set((state) => ({
        collections: state.collections.map((collection) => ({
          ...collection,
          notes: collection.notes.map((note) =>
            note._id === updatedNote._id ? updatedNote : note
          ),
        })),
      }));
    },

    // ======= Utility methods for collections =======

    createCollection: async (data) => {
      setStatus("collection", { state: "creating", error: null });
      try {
        const res = await axiosInstance.post("/collection", data);
        const { collection, message } = res.data;
        set((state) => ({
          collections: [...state.collections, collection],
        }));
        toast.success(message);
        return collection;
      } catch (error) {
        toast.error(error.response.data.message);
      } finally {
        setStatus("collection", { state: "idle", error: null });
      }
    },

    deleteCollection: async (collectionId) => {
      setStatus("collection", { state: "deleting", error: null });
      try {
        const res = await axiosInstance.delete(`/collection/${collectionId}`);
        set((state) => ({
          collections: state.collections.filter(
            (collection) => collection._id !== collectionId
          ),
        }));
        toast.success(res.data.message);
      } catch (error) {
        toast.error(error.response.data.message);
      } finally {
        setStatus("collection", { state: "idle", error: null });
      }
    },

    getAllCollections: async ({ userId, guest = false }) => {
      if (!guest) setStatus("collection", { state: "loading", error: null });

      try {
        const res = await axiosInstance.get("collection/all-collections", {
          params: { userId },
        });
        const { collections } = res.data;
        if (!guest) {
          set({ collections });
          // count no of notes
          localStorage.setItem(
            "collectionLength",
            JSON.stringify(collections.length)
          );
        }
        return collections;
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
        return null;
      } finally {
        setStatus("collection", { state: "idle", error: null });
      }
    },

    renameCollection: async (data) => {
      try {
        const res = await axiosInstance.put("collection/", data);
        const { collection, message } = res.data;
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c._id === collection._id) {
              return {
                ...c,
                name: collection.name,
                updatedAt: collection.updatedAt,
              };
            }
            return c;
          }),
        }));
        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      }
    },

    createNote: async (data) => {
      setStatus("note", { state: "creating", error: null });
      const { collectionId } = data;
      try {
        const res = await axiosInstance.post("note/", data);
        const { note, message } = res.data;

        // Add note to the appropriate collection
        get().insertNoteInCollection(collectionId, note);

        toast.success(message);
        return note._id;
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
        return null;
      } finally {
        setStatus("note", { state: "idle", error: null });
      }
    },

    deleteNote: async (noteId) => {
      try {
        const res = await axiosInstance.delete(`note/${noteId}`);

        // Remove the deleted note from collections
        get().deleteNoteFromCollection(noteId);
        // Remove the deleted note from notes array (if present)
        set((state) => ({
          notes: state.notes.filter((note) => note._id !== noteId),
        }));

        toast.success(res.data.message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      }
    },

    renameNote: async (data) => {
      try {
        const res = await axiosInstance.put("note/rename", data);
        const { note, message } = res.data;

        // Replace note with updated note in collections
        get().replaceNoteFromCollection(note);
        // Update the note in notes array (if present)
        updateNoteInNotesArray(note._id, {
          slug: note.slug,
          name: note.name,
          updatedAt: note.updatedAt,
        });

        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      }
    },

    moveTo: async (data) => {
      try {
        setStatus("note", { state: "moving", error: null });
        const res = await axiosInstance.post("/note/move-to", data);
        const { collection, note, message } = res.data;
        // Remove the note from the old collection and add it to the new collection
        get().deleteNoteFromCollection(note._id);
        get().insertNoteInCollection(collection._id, note);

        // Update the note in notes array (if present) because the note's collectionId changed
        updateNoteInNotesArray(note._id, {
          collectionId: collection,
          updatedAt: note.updatedAt,
        });

        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      } finally {
        setStatus("note", { state: "idle", error: null });
      }
    },

    updateCollectionVisibility: async ({ visibility, collectionId }) => {
      try {
        const res = await axiosInstance.put("collection/update-visibility", {
          visibility,
          collectionId,
        });
        const { collection, message } = res.data;
        updateCollectionInNotesArray(collection._id, {
          visibility: collection.visibility,
        });
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c._id === collection._id) {
              return {
                ...c,
                visibility: collection.visibility,
                updatedAt: collection.updatedAt,
              };
            }
            return c;
          }),
        }));
        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(
          error.response.data.message || "Failed to update visibility"
        );
      }
    },

    updateCollectionCollaborators: async ({ collectionId, collaborators }) => {
      setStatus("collaborator", { state: "saving", error: null });
      try {
        const res = await axiosInstance.put("collection/update-collaborators", {
          collectionId,
          collaborators,
        });
        const { collection, message } = res.data;

        // Replace note with updated note
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c._id === collection._id) {
              return {
                ...c,
                collaborators: collection.collaborators,
                updatedAt: collection.updatedAt,
              };
            }
            return c;
          }),
        }));

        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      } finally {
        setStatus("collaborator", { state: "idle", error: null });
      }
    },

    updateNoteCollaborators: async ({ noteId, collaborators }) => {
      setStatus("collaborator", { state: "saving", error: null });
      try {
        const res = await axiosInstance.put("note/update-collaborators", {
          noteId,
          collaborators,
        });
        const { note: updatedNote, message } = res.data;
        // Replace note with updated note in collections
        get().replaceNoteFromCollection(updatedNote);
        // no need to update note array beacuse there is no collabs in note array schema.

        toast.success(message);
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      } finally {
        setStatus("collaborator", { state: "idle", error: null });
      }
    },

    updateNoteVisibility: async ({ noteId, visibility }) => {
      try {
        const res = await axiosInstance.put("note/update-visibility", {
          noteId,
          visibility,
        });
        const { note: updatedNote, message } = res.data;

        // only update visibility of the matched note in collections
        set((state) => ({
          collections: state.collections.map((collection) => ({
            ...collection,
            notes: collection.notes.map((note) =>
              note._id === updatedNote._id
                ? { ...note, visibility: updatedNote.visibility }
                : note
            ),
          })),
        }));

        // Update the note in notes array (if present)
        updateNoteInNotesArray(updatedNote._id, {
          visibility: updatedNote.visibility,
          updatedAt: updatedNote.updatedAt,
        });

        toast.success(message);

        return updatedNote.visibility;
      } catch (error) {
        console.log(error);
        toast.error(error.response.data.message);
      }
    },
  };
});
