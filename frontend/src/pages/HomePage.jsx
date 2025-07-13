import React, { useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Bold,
  Code2,
  Hash,
  ListChecksIcon,
  Plus,
  Table,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import HomePageNotesSkeleton from "@/components/sekeletons/HomePageNotesSkeleton";
import { useNoteStore } from "@/stores/useNoteStore";
import AddNoteDialog from "@/components/AddNoteDialog";
import { NoteCard } from "@/components/NoteCard";

// Feature card data
const featureCards = [
  {
    title: "Formatting",
    description:
      "Enhance the presentation of your text using various formatting options to create clear and structured documents.",
    icon: <Bold />,
  },
  {
    title: "Markdown Shortcuts",
    description:
      "Quickly apply formatting to your text with Markdown shortcuts, streamlining the editing process.",
    icon: <Hash />,
  },
  {
    title: "Tables",
    description:
      "Create and customize tables to organize data efficiently and present information in a structured format.",
    icon: <Table />,
  },
  {
    title: "Syntax Highlighting",
    description:
      "Highlight your code with syntax highlighting, making it easier to read and debug.",
    icon: <Code2 />,
  },
  {
    title: "Tasks",
    description:
      "Keep track of your tasks effectively using the built-in task management features.",
    icon: <ListChecksIcon />,
  },
];

const FeatureCard = ({ title, description, icon }) => (
  <div className="flex gap-2 items-start p-4 border rounded-lg">
    <Button className="size-8" variant="secondary" disabled>
      {icon}
    </Button>
    <div className="overflow-hidden w-full">
      <strong>{title}</strong>
      <p className="line-clamp-2 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
);


const EmptyState = () => (
  <div className="mx-auto mb-12 w-[200px] space-y-4 text-center">
    <img
      className="grayscale-[100] opacity-50"
      src="/empty-note-state.svg"
      alt="Empty state"
    />
    <p className="w-52 text-muted-foreground">
      No notes yet? Start capturing your ideas now.
    </p>
    <AddNoteDialog
      trigger={
        <Button size="lg">
          <Plus /> Add Note
        </Button>
      }
    />
  </div>
);

// Main component
const HomePage = () => {
  const { authUser } = useAuthStore();
  const { collections, isCollectionsLoading } = useNoteStore();

  const NOTES_LIMIT = 10;
  const totalNotesCount = useMemo(() => {
    return collections.reduce(
      (total, collection) => total + (collection.notes?.length || 0),
      0
    );
  }, [collections]);
  const latestNotes = useMemo(() => {
    if (!collections || collections.length === 0) return [];

    // Flatten all notes from all collections
    const allNotes = collections.flatMap((collection) =>
      collection.notes.map((note) => ({
        ...note,
        collectionId: collection._id,
        collectionName: collection.name,
      }))
    );

    return allNotes
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, NOTES_LIMIT);
  }, [collections]);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="space-y-8 max-w-screen-lg mx-auto">
        <div className="mb-8 text-2xl font-bold">
          <span>Welcome </span>
          <span>
            {authUser?.fullName?.trim()?.split(/\s+/)[0] || "To Notehub"}
          </span>
        </div>
        {isCollectionsLoading ? (
          <HomePageNotesSkeleton />
        ) : totalNotesCount === 0 ? (
          <>
            <EmptyState />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featureCards.map(({ icon, title, description }, index) => (
                <FeatureCard
                  key={index}
                  icon={icon}
                  title={title}
                  description={description}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestNotes.map((note, index) => (
              <NoteCard
                key={`${note._id}-${index}`}
                note={note}
                collectionName={note.collectionName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
