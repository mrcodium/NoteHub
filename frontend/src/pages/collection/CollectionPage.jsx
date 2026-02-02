// src > pages > collection > CollectionPage.jsx
import CollectionPageSkeleton from "@/components/sekeletons/CollectionPageSkeleton";
import { useParams } from "react-router-dom";
import { CollectionHeader } from "./CollectionHeader";
import React, { useEffect, useMemo, useState } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { axiosInstance } from "@/lib/axios";
import { Forbidden, NotFound } from "./ErrorStates";
import SortSelector from "./SortSelector";
import { Helmet } from "react-helmet-async";
import NoteCard from "./NoteCard";
import { getCanonicalUrl } from "@/lib/utils";

const CollectionPage = () => {
  const { username, collectionSlug: rawSlug } = useParams();
  const collectionSlug = rawSlug?.toLowerCase();

  const [user, setUser] = useState(null);
  const [guestCollection, setGuestCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // Track error status
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const { status, collections: ownerCollections } = useNoteStore();
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
      const { collection } = res.data;
      return collection;
    } catch (error) {
      if (error.response) {
        setErrorStatus(error.response.status);
      }
      console.error(error);
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

  if (status.collection.state === "loading" || isLoading)
    return <CollectionPageSkeleton />;

  if (errorStatus === 403) return <Forbidden />;
  if (errorStatus === 404 || !collection) return <NotFound />;

  return (
    <>
      <Helmet>
        <title>{collection?.name || "Collection"} | NoteHub</title>
        <meta
          name="description"
          content={
            collection?.description ||
            "Explore notes in this collection on NoteHub."
          }
        />
        <meta
          property="og:title"
          content={`${collection?.name || "Collection"} | NoteHub`}
        />
        <meta
          property="og:description"
          content={
            collection?.description ||
            "Explore notes in this collection on NoteHub."
          }
        />
        <meta
          property="og:url"
          content={`https://notehub-38kp.onrender.com/${username}/${collectionSlug}`}
        />

        <meta
          name="twitter:title"
          content={`${collection?.name || "Collection"} | NoteHub`}
        />
        <meta
          name="twitter:description"
          content={
            collection?.description ||
            "Explore notes in this collection on NoteHub."
          }
        />
        <link rel="canonical" href={getCanonicalUrl()} />
      </Helmet>

      <div className="px-4 py-8 min-h-svh">
        <div className="max-w-screen-xl mx-auto flex flex-col gap-8">
          <div className="flex justify-between items-end">
            <CollectionHeader
              user={user}
              collection={collection}
              isOwner={isOwner}
            />
          </div>
          <SortSelector
            sortBy={sortBy}
            sortDirection={sortDirection}
            setSortBy={setSortBy}
            toggleSortDirection={toggleSortDirection}
          />

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
        </div>
      </div>
    </>
  );
};

export default CollectionPage;
