import React from "react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pilcrow, Heading1, Heading2, Heading3, Heading } from "lucide-react";

export const SelectHeading = ({ editor }) => {
  const headers = [1, 2, 3];

  return (
    <Select>
      <SelectTrigger className="w-16">
        <SelectValue
          placeholder={
            editor.isActive("heading", { level: 1 }) ? (
              <Heading1 className="size-5" />
            ) : editor.isActive("heading", { level: 2 }) ? (
              <Heading2 className="size-5" />
            ) : editor.isActive("heading", { level: 3 }) ? (
              <Heading3 className="size-5" />
            ) : editor.isActive("paragraph") ? (
              <Pilcrow className="size-4" />
            ) : (
              <Heading className="size-4" />
            )
          }
        />
      </SelectTrigger>
      <SelectContent className="flex-col">
        {headers.map((level, index) => (
          <Button
            key={index}
            tooltip={`Heading ${level}`}
            disabled={editor.isActive("heading", { level })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
            variant={
              editor.isActive("heading", { level }) ? "secondary" : "ghost"
            }
          >
            H{level}
          </Button>
        ))}
        <Button
          onClick={() => editor.chain().focus().setParagraph().run()}
          variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
        >
          <Pilcrow />
        </Button>
      </SelectContent>
    </Select>
  );
};
