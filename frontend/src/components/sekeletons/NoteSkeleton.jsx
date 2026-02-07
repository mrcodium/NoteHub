import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const getRandomWidth = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const NoteSkeleton = () => {
  const lists = Array(6)
    .fill(0)
    .map(() => getRandomWidth(20, 100));
  return (
    <div className="h-svh flex w-full justify-center">
      <div className="max-w-screen-md w-full">
        <div className="py-8 px-4 space-y-6 border-b border-dashed mb-6 sm:mb-12">
          <div className="flex  items-center justify-between">
            <div className="flex flex-row items-center w-max gap-3">
              <Skeleton className={"size-12 rounded-full"} />
              <div className="flex flex-col w-40 space-y-1">
                <div className=" flex gap-2">
                  <Skeleton className={"h-4 w-full"} />
                  <Skeleton className={"h-4 w-8"} />
                </div>
                <Skeleton className={"h-4 w-28"} />
              </div>
            </div>
            <Skeleton className={"h-10 w-10 sm:w-24 rounded-full"} />
          </div>

          <div className="flex justify-around gap-8">
            {/* Created Date */}
            <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
              <div className="flex gap-2 items-center">
                <Skeleton className={"h-4 w-20"} />
              </div>
              <div className="flex flex-col gap-0.5">
                <Skeleton className={"h-5 w-24"} />
              </div>
            </div>

            {/* Last Modified */}
            <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
              <div className="flex gap-2 items-center">
                <Skeleton className={"h-4 w-20"} />
              </div>
              <div className="flex flex-col gap-0.5">
                <Skeleton className={"h-5 w-24"} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4">
          <Skeleton className="h-12 w-[80%] mb-8" />
          <div className="list space-y-2 my-12">
            <Skeleton className={`h-8 w-48 mb-4`} />
            {lists.map((width, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Skeleton className="rounded-md size-6 shrink-0" />
                <Skeleton
                  className="rounded-md h-4"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>

          <div className="para space-y-2 my-12">
            <Skeleton className={`h-8 w-48 mb-4`} />
            {Array(3)
              .fill(null)
              .map((p, index) => (
                <Skeleton key={index} className={`w-full h-3`} />
              ))}
            <Skeleton className={`w-[30vw] h-4`} />
          </div>

          <div className="list space-y-2 my-8">
            {lists.map((width, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Skeleton className="rounded-full size-3 shrink-0" />
                <Skeleton
                  className="rounded-md h-4"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteSkeleton;
