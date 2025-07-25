import { Button } from "@/components/ui/button";
import { Lock, TriangleAlert } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

export const Forbidden = () => {
  return (
    <div className="container mx-auto mt-20 px-4 py-8 text-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Private Collection</h2>
        <p className="text-muted-foreground">
          This collection is private. You need permission from the owner to view
          it.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export const NotFound = () => {
  return (
    <div className="container mx-auto mt-20 px-4 py-8 text-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <TriangleAlert className="h-12 w-12 text-yellow-500" />
        <h2 className="text-2xl font-bold">Collection Not Found</h2>
        <p className="text-muted-foreground">
          The collection you're looking for doesn't exist or may have been
          removed.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    </div>
  );
};
