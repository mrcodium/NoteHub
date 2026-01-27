import React from "react";
import { Card } from "../ui/card";

const CollectionPageSkeleton = () => {
  return (
    <div className="container overflow-y-auto mx-auto px-4 py-8 max-w-screen-xl">
      <div className="flex flex-col gap-8 animate-pulse">
        {/* Header Section Skeleton */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              {/* Avatar Skeleton */}
              <div className="h-16 w-16 rounded-full bg-muted" />

              {/* Name/Username Skeleton */}
              <div className="space-y-2">
                <div className="h-6 w-40 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </div>

            {/* Collection Title/Description Skeleton */}
            <CollaboratorsSkeleton />
            <div className="h-8 w-48 bg-muted rounded" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-xl bg-muted" />
          <div className="h-9 w-9 rounded-xl bg-muted" />
        </div>

        {/* Separator Skeleton */}
        <div className="h-px w-full bg-border" />

        {/* Notes Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index} className="h-20 overflow-hidden shadow-sm">
              <div className="h-full w-full bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Skeleton } from "@/components/ui/skeleton";

const CollaboratorsSkeleton = () => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Avatars */}
      <div className="flex items-center gap-3">
        <div className="flex flex-row-reverse">
          {[1, 2, 3].map((_, i) => (
            <div
              key={i}
              className="h-10 w-10 bg-muted opacity-100 rounded-full border-2 -mr-3 border-background shadow-md"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectionPageSkeleton;
