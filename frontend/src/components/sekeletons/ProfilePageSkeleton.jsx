import React from "react";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export const ProfileSkeleton = () => {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div
        className="max-h-48 w-full bg-muted"
        style={{ aspectRatio: "3/1" }}
      />
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="size-28 sm:size-48 shrink-0 border-4 sm:border-8 border-background -mt-14 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CollectionSkeleton = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <Skeleton className={"h-8 w-32"} />
          <Skeleton className="h-5 w-20" />
          <div className="text-sm text-muted-foreground"></div>
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      <div className="space-y-0">
        {Array(5)
          .fill(null)
          .map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-none bg-card mx-auto border-b-[1px] border-primary/30 overflow-hidden shadow-sm animate-pulse"
            />
          ))}
      </div>
    </div>
  );
};

export const ProfilePageSkeleton = () => {
  return (
    <div className="p-4 overflow-auto">
      <div className="max-w-screen-md space-y-8 mx-auto w-full animate-pulse">
        <ProfileSkeleton />
        <CollectionSkeleton />
      </div>
    </div>
  );
};
