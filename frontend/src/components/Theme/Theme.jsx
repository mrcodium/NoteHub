import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Colors from "./Colors";
import Radius from "./Radius";
import { ModeToggle } from "../mode-toggle";

const Theme = () => {
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

export default Theme;
