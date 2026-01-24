import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import Colors from "@/components/Theme/Colors";
import Radius from "@/components/Theme/Radius";

const Personalization = () => {
  return (
    <Card>
      <CardHeader className="flex justify-between flex-row">
        <div>
          <CardTitle>Cutomize Theme</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a style and color for your components.
          </p>
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



export default Personalization
