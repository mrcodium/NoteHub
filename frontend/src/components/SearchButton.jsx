"use client";

import * as React from "react";
import {
  Search,
  Telescope,
  User,
  Clock,
  X,
  Trash2,
  Ghost,
  ArrowLeft,
  FileText,
  Lock,
  Users,
  Globe,
  ChevronRight,
} from "lucide-react";
import { debounce } from "lodash";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocalStorage } from "@/stores/useLocalStorage";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "./ui/separator";
import { axiosInstance } from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { EmptyState } from "@/pages/collection/EmptyState";
import { Badge } from "./ui/badge";

export function SearchButton() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState({
    notes: [],
    users: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);
  const { authUser, getAllUsers } = useAuthStore();
  const [isTyping, setIsTyping] = React.useState(false);
  const {
    searchHistory,
    addSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
  } = useLocalStorage();

  // Debounced search for both notes and users
  const fetchSearchResults = React.useCallback(
    debounce(async (query) => {
      setIsTyping(false);
      if (!query.trim()) {
        setSearchResults({ notes: [], users: [] });
        return;
      }

      try {
        setIsSearching(true);

        // Fetch both notes and users in parallel
        const [notesResponse, usersResponse] = await Promise.all([
          axiosInstance.get(`/note/search?q=${encodeURIComponent(query)}`),
          getAllUsers({
            page: 1,
            limit: 10,
            filter: "all",
            search: query,
          }),
        ]);
        console.log(notesResponse);

        setSearchResults({
          notes: notesResponse.data || [],
          users: usersResponse.users || [],
        });
      } catch (error) {
        console.error("Failed to search:", error);
        setSearchResults({ notes: [], users: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [getAllUsers, authUser],
  );

  // Handle search input changes
  React.useEffect(() => {
    fetchSearchResults(searchQuery);
    return () => fetchSearchResults.cancel();
  }, [searchQuery, fetchSearchResults]);

  // Keyboard shortcut
  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-3 w-3" />;
      case "private":
        return <Lock className="h-3 w-3" />;
      case "shared":
        return <Users className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Square search button */}
      <Button
        toolip="Ctrl + K"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeButtonClassName="hidden"
          className="max-w-3xl !rounded-tl-none !rounded-tr-none gap-0 top-0 -translate-x-1/2 translate-y-0 bg-muted p-0 overflow-hidden"
        >
          <DialogHeader>
            <div className="relative flex items-center border-b">
              <DialogClose asChild>
                <Button variant="ghost" className="h-full rounded-none">
                  <ArrowLeft />
                </Button>
              </DialogClose>
              <Input
                placeholder="Search notes and users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsTyping(true);
                }}
                autoFocus
                className="py-3 border-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                disabled={searchQuery.trim() === ""}
                variant="ghost"
                className="h-full rounded-none"
                onClick={() => setSearchQuery("")}
              >
                <X />
              </Button>
              {isSearching && (
                <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
                  <div className="absolute left-0 w-1/2 h-full bg-primary/30 animate-slide" />
                  <style jsx>{`
                    @keyframes slide {
                      0% {
                        left: -50%;
                      }
                      100% {
                        left: 100%;
                      }
                    }
                    .animate-slide {
                      animation: slide 1.5s infinite linear;
                    }
                  `}</style>
                </div>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="notes">
            <TabsList className="h-auto p-0 grid grid-cols-2 gap-4 border-b border-muted">
              <TabsTrigger
                value="notes"
                className="w-full h-12 gap-3 rounded-none text-base border-b-[3px] border-transparent !shadow-none data-[state=active]:bg-primary/5 data-[state=active]:border-primary/50"
              >
                Notes
                {searchResults.notes.length > 0 && (
                  <Badge className={"px-1.5"}>
                    {searchResults.notes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="w-full h-12 gap-3 rounded-none text-base border-b-[3px] border-transparent !shadow-none data-[state=active]:bg-primary/5 data-[state=active]:border-primary/50"
              >
                Users
                {searchResults.users.length > 0 && (
                  <Badge className={"px-1.5"}>
                    {searchResults.users.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-0" value="notes">
              <div className="max-h-[80vh] overflow-y-auto">
                {!isSearching && (
                  <>
                    {searchResults.notes.length === 0 ? (
                      searchQuery && !isTyping ? (
                        <NotFound searchQuery={searchQuery} type="notes" />
                      ) : (
                        <EmptyState />
                      )
                    ) : (
                      <div className="p-1 border-t">
                        <h3 className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                          Results
                        </h3>
                        <div className="space-y-1">
                          {searchResults.notes.map((note) => (
                            <div
                              key={note._id}
                              className="flex border-b items-start gap-3 p-2 rounded-md group cursor-pointer"
                              onClick={() => {
                                navigate(
                                  `/user/${note.userId?.userName}/${note.collectionId?.slug}/${note.slug}`,
                                );
                                setOpen(false); // close the dialog
                              }}
                            >
                              {/* <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" /> */}
                              <div className="flex-1 min-w-0">
                                <p className="dark:text-[#7ab7ff] dark:group-hover:text-[#5e83b3] text-[#2964aa] group-hover:text-[#749ac8] flex items-center gap-1 truncate">
                                  {note.collectionId?.name}
                                  <ChevronRight size={16}/>
                                  {note.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Avatar className="size-4">
                                      <AvatarImage src={note.userId?.avatar} />
                                      <AvatarFallback>
                                        {note.userId?.fullName?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{note.userId?.fullName}</span>
                                  </div>
                                  <span>•</span>
                                  <span>
                                    {formatDistanceToNowStrict(
                                      new Date(note.updatedAt),
                                      {
                                        addSuffix: true,
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent className="mt-0" value="users">
              <div className="max-h-[80vh] overflow-y-auto">
                {!isSearching && (
                  <>
                    {searchResults.users.length === 0 ? (
                      searchQuery && !isTyping ? (
                        <NotFound searchQuery={searchQuery} type="users" />
                      ) : searchHistory.length === 0 ? (
                        <EmptyState type="users" />
                      ) : null
                    ) : (
                      <div className="p-1 border-t">
                        <h3 className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                          Results
                        </h3>
                        <div className="space-y-1">
                          {searchResults.users.map((user) => (
                            <div
                              key={user._id}
                              onClick={() => {
                                addSearchHistory(user);
                                navigate(`/user/${user.userName}`);
                                setOpen(false);
                              }}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>
                                  {user.fullName?.charAt(0) || (
                                    <User className="h-4 w-4" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">
                                  @{user.userName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <>
                    <Separator />
                    <div className="p-1">
                      <div className="flex items-center justify-between w-full px-2 py-1.5">
                        <h3 className="text-xs font-medium text-muted-foreground">
                          Recent Searches
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-0.5 text-xs text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSearchHistory();
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {searchHistory.map((user) => (
                          <div
                            key={user._id}
                            onClick={() => {
                              navigate(`/user/${user.userName}`);
                              setOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer group"
                          >
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>
                                  {user.fullName?.charAt(0) || (
                                    <User className="h-4 w-4" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <Clock className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground bg-muted rounded-full p-0.5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{user.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                @{user.userName}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSearchHistory(user._id);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NotFound({ searchQuery = "", type = "users" }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-6">
      <div className="bg-accent rounded-full p-5 animate-pulse">
        <Ghost className="h-10 w-10 stroke-1.5 text-muted-foreground/80" />
      </div>

      <div className="text-center space-y-1 max-w-md px-4">
        <h3 className="text-xl font-medium tracking-tight">
          {searchQuery ? "No results found" : `Search for ${type}`}
        </h3>
        <p className="text-muted-foreground">
          {searchQuery
            ? `No ${type} found for "${searchQuery}"`
            : type === "notes"
              ? "Type to discover notes"
              : "Type a name, username, or email to discover people"}
        </p>
      </div>

      <div className="text-xs text-muted-foreground/60">
        <p>Try different keywords or check spelling</p>
      </div>
    </div>
  );
}
