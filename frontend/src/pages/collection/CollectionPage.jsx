// src/pages/collection/CollectionPage.jsx
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

  const [collectionData, setCollectionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState({ status: null, code: null });
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  
  const { status, collections: ownerCollections } = useNoteStore();
  const { authUser } = useAuthStore();
  
  const isOwner = authUser?.userName?.toLowerCase() === username?.toLowerCase();

  // For owner, use store data (instant)
  const ownerCollection = useMemo(() => {
    if (isOwner) {
      return ownerCollections.find((c) => c.slug === collectionSlug);
    }
    return null;
  }, [isOwner, ownerCollections, collectionSlug]);

  // Use either owner data from store or fetched data for guests
  const collection = isOwner ? ownerCollection : collectionData?.collection;
  const author = isOwner ? authUser : collectionData?.author;
  
  const notes = useMemo(() => collection?.notes || [], [collection]);

  // Sort notes
  const sortedNotes = useMemo(() => {
    if (!notes.length) return [];

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

  // Single API call for non-owners
  useEffect(() => {
    const fetchCollectionData = async () => {
      // Don't fetch for owner - use store data
      if (isOwner) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError({ status: null, code: null });

        // ✅ SINGLE API CALL - gets collection + author + notes + collaborators
        const response = await axiosInstance.get(
          `/${username}/${collectionSlug}`
        );

        setCollectionData(response.data);
        
      } catch (error) {
        console.error("Error fetching collection:", error);
        if (error.response) {
          setError({ 
            status: error.response.status, 
            code: error.response.data?.code 
          });
        }
        setCollectionData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionData();
  }, [username, collectionSlug, isOwner]);

  // Show skeleton while loading
  if (status.collection.state === "loading" || isLoading) {
    return <CollectionPageSkeleton />;
  }

  // Handle errors
  if (error.status === 403) {
    return <Forbidden message={error.code === "ACCESS_DENIED" ? "This collection is private" : "Access denied"} />;
  }
  
  if (error.status === 404 || !collection) {
    const message = error.code === "USER_NOT_FOUND" ? "User not found" : "Collection not found";
    return <NotFound message={message} />;
  }

  return (
    <>
      <Helmet>
        <title>{collection?.name || "Collection"} | NoteHub</title>
        <meta
          name="description"
          content={
            collection?.description ||
            `Explore ${collection?.name || "notes"} in this collection on NoteHub.`
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
            `Explore ${collection?.name || "notes"} in this collection on NoteHub.`
          }
        />
        <meta
          property="og:url"
          content={`${window.location.origin}/${username}/${collectionSlug}`}
        />
        <meta
          name="twitter:title"
          content={`${collection?.name || "Collection"} | NoteHub`}
        />
        <meta
          name="twitter:description"
          content={
            collection?.description ||
            `Explore ${collection?.name || "notes"} in this collection on NoteHub.`
          }
        />
        <link rel="canonical" href={getCanonicalUrl()} />
      </Helmet>

      <div className="px-4 py-8 min-h-svh">
        <div className="max-w-screen-xl mx-auto flex flex-col gap-8">
          <div className="flex justify-between items-end">
            <CollectionHeader
              user={author}
              collection={collection}
              isOwner={isOwner}
            />
          </div>
          
          {notes.length > 0 && (
            <SortSelector
              sortBy={sortBy}
              sortDirection={sortDirection}
              setSortBy={setSortBy}
              toggleSortDirection={toggleSortDirection}
            />
          )}

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

          {notes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {isOwner 
                  ? "You haven't created any notes in this collection yet." 
                  : "No notes in this collection yet."}
              </p>
              {isOwner && (
                <button 
                  onClick={() => {/* Navigate to create note */}}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create your first note
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionPage;