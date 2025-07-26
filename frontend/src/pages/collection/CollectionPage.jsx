// src > pages > collection > CollectionPage.jsx
import CollectionPageSkeleton from "@/components/sekeletons/CollectionPageSkeleton";
import { useNavigate, useParams } from "react-router-dom";
import { CollectionHeader } from "./CollectionHeader";
import { CollectionNotesGrid } from "./CollectionNotesGrid";
import React, { useEffect, useMemo, useState } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { axiosInstance } from "@/lib/axios";
import { Forbidden, NotFound } from "./ErrorStates";
import { Separator } from "@/components/ui/separator";

const CollectionPage = () => {
  const { username, collectionSlug: rawSlug } = useParams();
  const collectionSlug = rawSlug?.toLowerCase();

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [guestCollection, setGuestCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // Track error status
  const [sortBy, setSortBy] = useState("created");
  const [sortDirection, setSortDirection] = useState("desc");
  const { isCollectionsLoading, collections: ownerCollections } =
    useNoteStore();
  const { authUser } = useAuthStore();
  const isOwner = authUser?.userName.toLowerCase() === username.toLowerCase();
  const collection = useMemo(() => {
    if (isOwner) {
      return ownerCollections.find((c) => c.slug === collectionSlug);
    }
    return guestCollection;
  }, [isOwner, ownerCollections, collectionSlug, guestCollection]);

  const notes = useMemo(() => collection?.notes || [], [collection]);
  const sortedNotes = useMemo(() => {
    if (!notes) return [];

    const notesCopy = [...notes];
    const modifier = sortDirection === "asc" ? 1 : -1;

    const sortFunctions = {
      created: (a, b) =>
        modifier *
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      updated: (a, b) =>
        modifier *
        (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()),
      name: (a, b) => modifier * a.name.localeCompare(b.name),
    };

    return notesCopy.sort(sortFunctions[sortBy]);
  }, [notes, sortBy, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const getCollection = async ({ userId, slug }) => {
    try {
      const res = await axiosInstance.get("/collection", {
        params: {
          userId,
          slug,
        },
      });
      console.log(res.data);
      const { collection } = res.data;
      return collection;
    } catch (error) {
      if (error.response) {
        setErrorStatus(error.response.status);
      }
      console.log(error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorStatus(null);

        if (!isOwner) {
          const response = await axiosInstance.get(`/user/${username}`);
          const collectionsData = await getCollection({
            userId: response.data?._id,
            slug: collectionSlug,
          });

          setGuestCollection(collectionsData);
          setUser(response.data);
        } else {
          setUser(authUser);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setUser(null);
        setGuestCollection(null);
        if (error.response) {
          setErrorStatus(error.response.status);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [username, collectionSlug, isOwner, authUser]);

  if (isCollectionsLoading || isLoading) return <CollectionPageSkeleton />;

  return (
    <div className="p-2 sm:p-4 h-full overflow-y-auto">
      <div className="max-w-screen-xl mx-auto flex flex-col gap-8">
        <CollectionHeader
          user={{ ...user, fullName: user.fullName + errorStatus }}
          collection={collection}
          isOwner={isOwner}
        />
        {errorStatus === 404 || !collection ? (
          <NotFound />
        ) : errorStatus === 403 ? (
          <Forbidden />
        ) : (
          <CollectionNotesGrid
            notes={notes}
            sortedNotes={sortedNotes}
            isOwner={isOwner}
            username={username}
            collectionSlug={collectionSlug}
            collection={collection}
          />
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
