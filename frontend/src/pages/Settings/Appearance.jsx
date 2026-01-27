import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import Colors from "@/components/Theme/Colors";
import Radius from "@/components/Theme/Radius";

const Appearance = () => {
  return (
    <Card>
      <CardHeader className="flex justify-between flex-row">
        <div className="space-y-1.5">
          <CardTitle>Cutomize Theme</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Pick a style and color for your components.
          </CardDescription>
        </div>
        <ModeToggle />
      </CardHeader>

      <CardContent className="space-y-8">
        <Colors />
        <Radius />
      </CardContent>
    </Card>
  );
};

export default Appearance;
