import React, { useEffect, useCallback, useRef } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { ArticleCard } from "@/components/ArticleCard";
import { noteToArticle } from "@/lib/utils";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton";

const HomePage = () => {
  const loaderRef = useRef(null);
  const { notes, pagination, getPublicNotes, status } = useNoteStore();

  // Transform notes with proper fallbacks
  const articles = notes.map(noteToArticle);

  // Infinite scroll handler
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (
        entry.isIntersecting &&
        !status.note.state !== "loading" &&
        pagination.hasMore
      ) {
        getPublicNotes({
          page: pagination.currentPage + 1,
          limit: 10,
        });
      }
    },
    [pagination, getPublicNotes],
  );

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver]);

  // Initial load
  useEffect(() => {
    if (notes.length === 0) {
      getPublicNotes({ page: 1, limit: 10 });
    }
  }, []);

  return (
    <div className="p-2 sm:p-4 h-full overflow-y-auto bg-[#f5f5f5] dark:bg-background">
      <div className="space-y-2 sm:space-y-4 max-w-screen-lg mx-auto">
        {/* Render transformed notes */}
        {articles.map((note) => (
          <ArticleCard
            key={note._id}
            note={note}
            description={note.article.description}
            images={note.article.images}
            author={note.userId}
            collection={note.collectionId}
            headings={note.article.headings}
          />
        ))}

        {status.note.state === "loading" &&
          [...Array(5)].map((_, i) => <ArticleCardSkeleton key={i} />)}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="h-1"></div>

        {/* End of notes message */}
        {!pagination.hasMore && notes.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            You've reached the end of your notes
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
