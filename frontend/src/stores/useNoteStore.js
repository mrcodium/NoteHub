import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { toast } from "sonner";

export const useNoteStore = create((set, get) => {
  // Helper to wrap async functions with loading state and error handling
  const withLoading = (key, fn) => async (...args) => {
    set({ [key]: true });
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in ${key}:`, error);
      toast.error(error?.response?.data?.message || "Something went wrong");
      throw error;
    } finally {
      set({ [key]: false });
    }
  };

  return {
    // BOOLEANS
    isCollectionsLoading: false,
    isCreatingCollection: false,
    isDeletingCollection: false,
    isCreatingNote: false,
    selectedNote: null,
    isContentLoading: false,
    isContentUploading: false,
    noteNotFound: false,
    setNoteNotFound: false,
    collections: [],
    notesContent: {
      //noteId : 'content'
    },
    isNotesLoading: false,
    notes: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalNotes: 0,
      notesPerPage: 10,
      hasMore: false,
    },
    updatingCollaborators: false,
    noteById: {},

    getPublicNotes: withLoading("isNotesLoading", async ({ page, limit, user }) => {
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
        pagination: data.data.pagination,
      });

      return data.data;
    }),

    resetNotes: () =>
      set({
        notes: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalNotes: 0,
          notesPerPage: 10,
          hasMore: false,
        },
      }),

    getNoteContent: async (noteId) => {
      const { notesContent } = get();
      if (noteId in notesContent) {
        return notesContent[noteId] || "";
      }

      // ondemand loading with withLoading helper
      return withLoading("isContentLoading", async () => {
        const res = await axiosInstance.get(`note/${noteId}`);
        const { content } = res.data.note;
        set({
          notesContent: {
            ...notesContent,
            [noteId]: content,
          },
          noteNotFound: false,
        });
        return content || "";
      })().catch(() => {
        set({ noteNotFound: true });
        return null;
      });
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

    updateContent: withLoading("isContentUploading", async (data) => {
      const now = new Date();
      const offsetMinutes = now.getTimezoneOffset();

      const res = await axiosInstance.put("/note/", {
        ...data,
        userLocalDateTime: now.toISOString(),
        offsetMinutes,
      });

      const { note, message } = res.data;
      set((state) => ({
        notesContent: {
          ...state.notesContent,
          [note._id]: note.content,
        },
      }));
      toast.success(message);
    }),

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

    // ======= Collection CRUD operations =======

    createCollection: withLoading("isCreatingCollection", async (data) => {
      const res = await axiosInstance.post("/collection", data);
      const { collection, message } = res.data;
      set((state) => ({
        collections: [...state.collections, collection],
      }));
      toast.success(message);
      return collection;
    }),

    deleteCollection: withLoading("isDeletingCollection", async (collectionId) => {
      const res = await axiosInstance.delete(`/collection/${collectionId}`);
      set((state) => ({
        collections: state.collections.filter(
          (collection) => collection._id !== collectionId
        ),
      }));
      toast.success(res.data.message);
    }),

    getAllCollections: async ({ userId, guest = false }) => {
      if (guest) {
        // Skip loading state for guest requests
        try {
          const res = await axiosInstance.get("collection/all-collections", {
            params: { userId },
          });
          return res.data.collections;
        } catch (error) {
          console.error("Error fetching collections:", error);
          toast.error(error?.response?.data?.message || "Failed to fetch collections");
          return null;
        }
      }

      return withLoading("isCollectionsLoading", async () => {
        const res = await axiosInstance.get("collection/all-collections", {
          params: { userId },
        });
        const { collections } = res.data;
        set({ collections });
        localStorage.setItem(
          "collectionLength",
          JSON.stringify(collections.length)
        );
        return collections;
      })().catch(() => null);
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
        console.error("Error renaming collection:", error);
        toast.error(error?.response?.data?.message || "Failed to rename collection");
      }
    },

    // ======= Note CRUD operations =======

    createNote: withLoading("isCreatingNote", async (data) => {
      const { collectionId } = data;
      const res = await axiosInstance.post("note/", data);
      const { note, message } = res.data;

      get().insertNoteInCollection(collectionId, note);
      toast.success(message);
      return note._id;
    }),

    deleteNote: async (noteId) => {
      try {
        const res = await axiosInstance.delete(`note/${noteId}`);
        get().deleteNoteFromCollection(noteId);
        toast.success(res.data.message);
      } catch (error) {
        console.error("Error deleting note:", error);
        toast.error(error?.response?.data?.message || "Failed to delete note");
      }
    },

    renameNote: async (data) => {
      try {
        const res = await axiosInstance.put("note/rename", data);
        const { note: updatedNote, message } = res.data;
        get().replaceNoteFromCollection(updatedNote);
        toast.success(message);
      } catch (error) {
        console.error("Error renaming note:", error);
        toast.error(error?.response?.data?.message || "Failed to rename note");
      }
    },

    moveTo: async (data) => {
      try {
        const res = await axiosInstance.post("/note/move-to", data);
        const { note: updatedNote, message } = res.data;

        get().deleteNoteFromCollection(updatedNote._id);
        get().insertNoteInCollection(updatedNote.collectionId, updatedNote);
        toast.success(message);
      } catch (error) {
        console.error("Error moving note:", error);
        toast.error(error?.response?.data?.message || "Failed to move note");
      }
    },

    // ======= Visibility and Collaboration =======

    updateCollectionVisibility: async ({ visibility, collectionId }) => {
      try {
        const res = await axiosInstance.put("collection/update-visibility", {
          visibility,
          collectionId,
        });
        const { collection, message } = res.data;
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
        console.error("Error updating visibility:", error);
        toast.error(error?.response?.data?.message || "Failed to update visibility");
      }
    },

    updateCollectionCollaborators: withLoading(
      "updatingCollaborators",
      async ({ collectionId, collaborators }) => {
        const res = await axiosInstance.put("collection/update-collaborators", {
          collectionId,
          collaborators,
        });
        const { collection, message } = res.data;

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
      }
    ),

    updateNoteCollaborators: withLoading(
      "updatingCollaborators",
      async ({ noteId, collaborators }) => {
        const res = await axiosInstance.put("note/update-collaborators", {
          noteId,
          collaborators,
        });
        const { note: updatedNote, message } = res.data;

        get().replaceNoteFromCollection(updatedNote);
        toast.success(message);
      }
    ),

    updateNoteVisibility: async ({ noteId, visibility }) => {
      try {
        const res = await axiosInstance.put("note/update-visibility", {
          noteId,
          visibility,
        });
        const { note: updatedNote, message } = res.data;

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

        toast.success(message);
        return updatedNote.visibility;
      } catch (error) {
        console.error("Error updating note visibility:", error);
        toast.error(error?.response?.data?.message || "Failed to update visibility");
      }
    },
  };
});