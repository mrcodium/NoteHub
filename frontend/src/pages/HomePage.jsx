import React, { useEffect, useCallback, useRef } from "react";
import { useNoteStore } from "@/stores/useNoteStore";
import { ArticleCard } from "@/components/ArticleCard";
import { noteTransformer } from "@/lib/utils";
import HomePageNotesSkeleton from "@/components/sekeletons/HomePageNotesSkeleton";
import { Loader2 } from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton";

const HomePage = () => {
  const { notes, isNotesLoading, pagination, getPublicNotes } = useNoteStore();
  const loaderRef = useRef(null);

  // Transform notes with proper fallbacks
  const transformedNotes = notes.map((note) => {
    // Ensure content exists before transforming
    const content = note.content || "";
    const transformed = noteTransformer(content, {
      headings: true,
      images: true,
      description: true, // Changed from longDescription to match the transformer
    });

    // Get the best available description
    let description = "";
    if (transformed.description) {
      description = transformed.description;
    } else if (note.name) {
      description = note.name; // Fallback to note name
    }

    return {
      ...note,
      article: {
        ...transformed,
        description,
        // Ensure images array exists even if empty
        images: transformed.images || [],
      },
    };
  });

  // Infinite scroll handler
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isNotesLoading && pagination.hasMore) {
        getPublicNotes({
          page: pagination.currentPage + 1,
          limit: 10,
        });
      }
    },
    [isNotesLoading, pagination, getPublicNotes]
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
    <div className="p-2 sm:p-4 h-full overflow-y-auto">
      <div className="space-y-8 max-w-screen-lg mx-auto">
        {/* Render transformed notes */}
        {transformedNotes.map((note) => (
          <ArticleCard
            key={note._id}
            title={note.name}
            noteSlug={note.slug}
            description={note.article.description}
            images={note.article.images}
            updatedAt={note.updatedAt}
            author={note.userId}
            collection={note.collectionId}
            headings={note.article.headings}
          />
        ))}

        {((isNotesLoading )) && 
          (
            [...Array(5)].map((_, i) => <ArticleCardSkeleton key={i} />)
          )
        }

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
