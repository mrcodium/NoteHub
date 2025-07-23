"use client";

import {
  ChevronRight,
  EllipsisVertical,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pin,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useNoteStore } from "@/stores/useNoteStore";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SidebarSkeleton from "../sekeletons/SidebarSkeleton";
import NotesOption from "../NotesOption";
import CollectionsOption from "../CollectionsOption";
import { useLocalStorage } from "@/stores/useLocalStorage";

const highlightMatch = (text, query) => {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} className="bg-yellow-200 text-black">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const NoteItem = ({ note }) => {
  const [isNoteRenaming, setIsNoteRenaming] = useState(false);
  const inputRef = useRef(null);
  const { selectedNote, setselectedNote, renameNote } = useNoteStore();

  useEffect(() => {
    if (isNoteRenaming && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [isNoteRenaming]);

  const handleSaveRename = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== note.name) {
      renameNote({
        noteId: note._id,
        newName: newName,
      });
    }
    setIsNoteRenaming(false);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.value = note.name;
      }
      setIsNoteRenaming(false);
    }
  };

  return (
    <SidebarMenuSubItem className="group/note">
      <SidebarMenuSubButton
        asChild
        onClick={() => !isNoteRenaming && setselectedNote(note._id)}
      >
        <div
          className={`flex items-center gap-0 w-full hover:bg-sidebar-accent rounded-md p-1 ${
            selectedNote === note._id && "bg-accent"
          }`}
        >
          {isNoteRenaming ? (
            <Input
              ref={inputRef}
              defaultValue={note.name}
              className="h-6 flex-1 min-w-0 p-1"
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Link
              to={`/note/${note._id}`}
              className="truncate flex-1 text-sidebar-foreground/70"
            >
              {note.name}
            </Link>
          )}

          {!isNoteRenaming && (
            <div className="ml-auto opacity-0 group-hover/note:opacity-100 transition-opacity">
              <NotesOption
                trigger={<EllipsisVertical className="size-4" />}
                setIsRenaming={setIsNoteRenaming}
                note={note}
              />
            </div>
          )}
        </div>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
};

const FolderCollapsible = ({
  collection,
  pinnedCollections,
  searchQuery,
}) => {
  const [isCollectionRenaming, setIsCollectionRenaming] = useState(false);
  const inputRef = useRef(null);
  const { renameCollection } = useNoteStore();

  const handleRenameStart = () => {
    setIsCollectionRenaming(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleRenameSave = () => {
    const newName = inputRef.current?.value.trim();
    if (newName && newName !== collection.name) {
      renameCollection({
        _id: collection._id,
        newName: newName,
      });
    }
    setIsCollectionRenaming(false);
  };

  const handleInputKeyDown = (e) => {
    // Stop propagation to prevent collapsible toggle
    e.stopPropagation();
    if (e.key === "Enter") {
      handleRenameSave();
    }
  };

  const handleInputBlur = () => {
    handleRenameSave();
  };

  const handleInputClick = (e) => {
    // Stop propagation to prevent collapsible toggle
    e.stopPropagation();
  };

  const { openedCollections, toggleCollection } = useLocalStorage();

  return (
    <Collapsible
      asChild
      open={searchQuery || openedCollections[collection._id] || false}
      className="group/collapsible"
      onOpenChange={(isExpanded) =>
        toggleCollection(collection._id, isExpanded)
      }
    >
      <SidebarMenuItem>
        <div className={`relative`}>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={collection.name}>
              <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 size-4" />
              {searchQuery || openedCollections[collection._id] || false ? (
                <FolderOpen className="size-4" />
              ) : (
                <Folder className="size-4" />
              )}
              <div className="flex-1 min-w-0">
                {isCollectionRenaming ? (
                  <Input
                    className="font-semibold h-auto px-1 py-0 text-sm border-none focus-visible:ring-1"
                    defaultValue={collection.name}
                    ref={inputRef}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    onClick={handleInputClick}
                  />
                ) : (
                  <span className="font-semibold truncate p-1">
                    {collection.name}
                  </span>
                )}
              </div>
              {pinnedCollections.includes(collection._id) && (
                <Pin className="ml-auto size-4" />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>

          <CollectionsOption
            trigger={
              <SidebarMenuAction>
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More</span>
              </SidebarMenuAction>
            }
            collection={collection}
            onRenameStart={handleRenameStart}
          />
        </div>

        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 pr-0">
            {collection.notes?.map((note) => (
              <NoteItem key={note._id} note={note} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavMain = ({ collections, searchQuery }) => {
  const { isCollectionsLoading } = useNoteStore();
  const { pinnedCollections } = useLocalStorage();

  const filteredCollections = collections
    .map((collection) => {
      // Only filter notes if there's a search query
      const processedNotes = searchQuery
        ? collection.notes
            .filter((note) =>
              note.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((note) => ({
              ...note,
              name: highlightMatch(note.name, searchQuery),
            }))
        : collection.notes; // Return all notes when not searching

      return {
        ...collection,
        notes: processedNotes,
      };
    })
    // Only filter out empty collections when searching
    .filter((collection) => !searchQuery || collection.notes.length > 0)
    .sort((a, b) => {
      const aPinned = pinnedCollections.includes(a._id);
      const bPinned = pinnedCollections.includes(b._id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  if (isCollectionsLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Collections</SidebarGroupLabel>
      <SidebarMenu>
        {filteredCollections.map((collection) => (
          <FolderCollapsible
            key={collection._id}
            collection={collection}
            pinnedCollections={pinnedCollections}
            searchQuery={searchQuery}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default NavMain;
