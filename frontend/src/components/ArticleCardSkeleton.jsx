import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ArticleCardSkeleton() {
  return (
    <Card className="w-full rounded-none sm:rounded-2xl border-t border-border lg:border p-4 lg:p-6">
      <CardHeader className="p-0 pb-3">
        <div className="flex flex-row items-center w-max gap-3">
          {/* User avatar skeleton */}
          <Skeleton className="w-10 h-10 rounded-full" />
          
          {/* User info skeleton */}
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col items-start md:flex-row gap-4">
          {/* Text content skeleton */}
          <div className="flex-1 space-y-4 w-full">
            {/* Title skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
            
            {/* Read more link skeleton */}
            <Skeleton className="h-4 w-16 mt-2" />
          </div>

          {/* Image carousel skeleton */}
          <div className="w-full md:w-[40%]">
            <Skeleton className="aspect-video rounded-lg w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}