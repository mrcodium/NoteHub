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
  Folder,
  ChevronLeft,
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
import { EmptyState } from "@/pages/collection/EmptyState";
import { Badge } from "./ui/badge";
import { stripLatex } from "@/lib/utils";
import { removeStopwords } from "stopword";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import BadgeIcon from "./icons/BadgeIcon";

export function getFirstMatchSnippets(html, query, radius = 60, limit = 3) {
  if (!html || !query) return [];

  // Normalize block tags
  const normalizedHtml = html
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|td|th|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");

  // HTML → text once
  const div = document.createElement("div");
  div.innerHTML = normalizedHtml;
  let text = stripLatex(div.textContent || "");

  const lowerText = text.toLowerCase();
  const keywords = removeStopwords(query.toLowerCase().split(/\s+/));

  const snippets = [];

  for (const word of keywords) {
    if (snippets.length >= limit) break;

    const index = lowerText.indexOf(word);
    if (index === -1) continue;

    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + word.length + radius);

    snippets.push(
      <span key={word}>
        {start > 0 && "..."}
        {text.slice(start, index)}
        <mark className="bg-yellow-200 text-black">
          {text.slice(index, index + word.length)}
        </mark>
        {text.slice(index + word.length, end)}
        {end < text.length && "..."}
      </span>,
    );
  }

  return snippets;
}

export function SearchButton() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState({
    notes: [],
    users: [],
  });
  const [pagination, setPagination] = React.useState({
    notes: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    users: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPreviousPage: false,
    },
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
  const inputRef = React.useRef(null);

  // Debounced search for both notes and users
  const fetchSearchResults = React.useCallback(
    debounce(async (query, notesPage = 1, usersPage = 1) => {
      setIsTyping(false);
      if (!query.trim()) {
        setSearchResults({ notes: [], users: [] });
        setPagination({
          notes: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          users: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
        return;
      }

      try {
        setIsSearching(true);

        // Fetch both notes and users in parallel
        const [notesResponse, usersResponse] = await Promise.all([
          axiosInstance.get(
            `/note/search?q=${encodeURIComponent(query)}&page=${notesPage}&limit=10`,
          ),
          getAllUsers({
            page: usersPage,
            limit: 10,
            filter: "all",
            search: query,
          }),
        ]);
        setSearchResults({
          notes: notesResponse.data.notes || [],
          users: usersResponse.users || [],
        });

        setPagination({
          notes: notesResponse.data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          users: usersResponse.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
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

  // Handle search input changes (reset to page 1)
  React.useEffect(() => {
    fetchSearchResults(searchQuery, 1, 1);
    return () => fetchSearchResults.cancel();
  }, [searchQuery]);

  // Handle pagination changes
  const handleNotesPageChange = (page) => {
    fetchSearchResults(searchQuery, page, pagination.users.currentPage);
  };

  const handleUsersPageChange = (page) => {
    fetchSearchResults(searchQuery, pagination.notes.currentPage, page);
  };

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

  const generateSnippet = React.useCallback(
    (html) => getFirstMatchSnippets(html, searchQuery),
    [searchQuery],
  );

  const memoizedNotes = React.useMemo(() => {
    return searchResults.notes.map((note) => ({
      ...note,
      snippets: generateSnippet(note.content),
    }));
  }, [searchResults.notes, generateSnippet]);

  return (
    <>
      {/* Square search button */}
      <Button
        tooltip="Ctrl + K"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md"
        onClick={() => setOpen(true)}
        aria-label="Search Notes and Users"
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
                  <ArrowLeft className="!size-6" />
                </Button>
              </DialogClose>
              <Input
                ref={inputRef}
                placeholder="Search notes and users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsTyping(true);
                }}
                autoFocus
                className="py-3 pr-14 border-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                disabled={searchQuery.trim() === ""}
                variant="ghost"
                className="h-full rounded-none absolute right-0 top-1/2 -translate-y-1/2"
                onClick={() => {
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
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
                {pagination.notes.totalItems > 0 && (
                  <Badge className={"px-1.5"}>
                    {pagination.notes.totalItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="w-full h-12 gap-3 rounded-none text-base border-b-[3px] border-transparent !shadow-none data-[state=active]:bg-primary/5 data-[state=active]:border-primary/50"
              >
                Users
                {pagination.users.totalItems > 0 && (
                  <Badge className={"px-1.5"}>
                    {pagination.users.totalItems}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-0" value="notes">
              <div className="max-h-[70vh] overflow-y-auto">
                {searchResults.notes.length === 0 ? (
                  searchQuery && !isTyping ? (
                    <NotFound searchQuery={searchQuery} type="notes" />
                  ) : (
                    <EmptyState />
                  )
                ) : (
                  <>
                    <div className="border-t">
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">
                        Results
                      </h3>
                      <div>
                        {memoizedNotes.map((note, index) => (
                          <div
                            key={note._id || index}
                            className="flex border-b border-primary/20 hover:bg-primary/10 items-start gap-3 p-2 px-4  group cursor-pointer"
                            onClick={() => {
                              navigate(
                                `/user/${note.userId?.userName}/${note.collectionId?.slug}/${note.slug}`,
                              );
                              setOpen(false);
                            }}
                          >
                            <div className="flex-1 space-y-3">
                              {/* note name and description */}
                              <div className="w-full min-w-0">
                                <p className="line-clamp-1 font-medium text-lg">
                                  {note.name}
                                </p>
                                <p className="text-primary/70 text-sm line-clamp-3">
                                  {note.snippets}
                                </p>
                              </div>

                              {/* meta data collection and author  */}
                              <div className="space-y-1">
                                <div className="flex gap-1 items-center">
                                  <Folder
                                    className="text-muted-foreground fill-muted-foreground"
                                    size={14}
                                  />
                                  <p className="line-clamp-1 text-xs text-muted-foreground">
                                    {note.collectionId?.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Avatar className="size-4">
                                      <AvatarImage
                                        src={note.userId?.avatar}
                                        alt="Author Profile Photo"
                                      />
                                      <AvatarFallback>
                                        {note.userId?.fullName?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{note.userId?.fullName}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes Pagination */}
                    {pagination.notes.totalPages > 1 && (
                      <div className="border-t p-4 sticky bottom-0 bg-muted">
                        <CustomPagination
                          currentPage={pagination.notes.currentPage}
                          totalPages={pagination.notes.totalPages}
                          onPageChange={handleNotesPageChange}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent className="mt-0" value="users">
              <div className="max-h-[80vh] overflow-y-auto">
                {searchResults.users.length === 0 ? (
                  searchQuery && !isTyping ? (
                    <NotFound searchQuery={searchQuery} type="users" />
                  ) : searchHistory.length === 0 ? (
                    <EmptyState type="users" />
                  ) : null
                ) : (
                  <>
                    <div className="p-1 border-t">
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">
                        Results
                      </h3>
                      <div className="space-y-1">
                        {searchResults.users.map((user, index) => (
                          <div
                            key={user._id || index}
                            onClick={() => {
                              addSearchHistory(user);
                              navigate(`/user/${user.userName}`);
                              setOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.avatar}
                                alt={user.fullName || "User Profile Photo"}
                              />
                              <AvatarFallback>
                                {user.fullName?.charAt(0) || (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-1.5">
                                {user.fullName}
                                {user.role === "admin" && (
                                  <BadgeIcon className="size-4 text-blue-500" />
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                @{user.userName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Users Pagination */}
                    {pagination.users.totalPages > 1 && (
                      <div className="border-t p-4 sticky bottom-0 bg-muted">
                        <CustomPagination
                          currentPage={pagination.users.currentPage}
                          totalPages={pagination.users.totalPages}
                          onPageChange={handleUsersPageChange}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Search History */}
                {searchHistory.length > 0 && (
                  <>
                    <Separator />
                    <div className="p-1">
                      <div className="flex items-center justify-between w-full px-4 py-1.5">
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
                        {searchHistory.map((user, index) => (
                          <div
                            key={user._id || index}
                            onClick={() => {
                              navigate(`/user/${user.userName}`);
                              setOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-md  cursor-pointer group"
                          >
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={user.avatar}
                                  alt={"Users Profile Photo"}
                                />
                                <AvatarFallback>
                                  {user.fullName?.charAt(0) || (
                                    <User className="h-4 w-4" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <Clock className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground bg-muted rounded-full p-0.5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium flex items-center gap-1.5">
                                {user.fullName}
                                {user.role === "admin" && (
                                  <BadgeIcon className="size-4 text-blue-500" />
                                )}
                              </p>
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

// Custom Pagination Component
function CustomPagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near the start
        pages.push(2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(
          "ellipsis",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        // In the middle
        pages.push(
          "ellipsis",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "ellipsis",
          totalPages,
        );
      }
    }

    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={
              currentPage === 1
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        {getPageNumbers().map((page, index) => (
          <PaginationItem key={index}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => onPageChange(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() =>
              currentPage < totalPages && onPageChange(currentPage + 1)
            }
            className={
              currentPage === totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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

      <div className="text-sm text-muted-foreground/60">
        <p>Try different keywords or check spelling</p>
      </div>
    </div>
  );
}
