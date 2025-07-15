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
} from "lucide-react";
import { debounce } from "lodash";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLocalStorage } from "@/stores/useLocalStorage";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import TooltipWrapper from "./TooltipWrapper";
import { Separator } from "./ui/separator";

export function SearchButton() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const { authUser, getAllUsers } = useAuthStore();
  const [isTyping, setIsTyping] = React.useState(false);
  const {
    searchHistory,
    addSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
  } = useLocalStorage();

  // Debounced user search
  const fetchUsers = React.useCallback(
    debounce(async (query) => {
      setIsTyping(false);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await getAllUsers({
          page: 1,
          limit: 10,
          filter: "all",
          search: query,
        });

        setSearchResults(response.users || []);
      } catch (error) {
        console.error("Failed to search users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [getAllUsers, authUser]
  );

  // Handle search input changes
  React.useEffect(() => {
    fetchUsers(searchQuery);
    return () => fetchUsers.cancel();
  }, [searchQuery, fetchUsers]);

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

  return (
    <>
      {/* Square search button */}
      <TooltipWrapper message="search user">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-md"
          onClick={() => setOpen(true)}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
      </TooltipWrapper>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl gap-0 top-0 -translate-x-1/2 translate-y-0 bg-muted p-0 overflow-hidden">
          <DialogHeader>
            <div className="relative flex px-3 gap-1 items-center border-b">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsTyping(true);
                }}
                autoFocus
                className="py-3 border-0 h-auto shadow-none focus-visible:ring-0"
              />
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

          <div className="max-h-[80vh] overflow-y-auto">
            {!isSearching && (
              <>
                {searchResults.length === 0 ? (
                  (searchQuery && !isTyping) ? (
                    <NotFound searchQuery={searchQuery} />
                  ) : searchHistory.length === 0 ? (
                    <EmptyState />
                  ) : null
                ) : (
                  <div className="p-1 border-t">
                    <h3 className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                      Results
                    </h3>
                    <div className="space-y-1">
                      {searchResults.map((user) => (
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
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotFound({ searchQuery = "" }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 border gap-6">
      <div className="bg-accent rounded-full p-5 animate-pulse">
        <Ghost className="h-10 w-10 stroke-1.5 text-muted-foreground/80" />
      </div>

      <div className="text-center space-y-1 max-w-md px-4">
        <h3 className="text-xl font-medium tracking-tight">
          {searchQuery ? "No results found" : "Search for users"}
        </h3>
        <p className="text-muted-foreground">
          {searchQuery
            ? `No users found for "${searchQuery}"`
            : "Type a name, username, or email to discover people"}
        </p>
      </div>

      <div className="text-xs text-muted-foreground/60">
        <p>Try different keywords or check spelling</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative bg-accent rounded-full p-4">
        <Telescope className="h-16 w-16 stroke-1 text-muted-foreground/80" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-xl font-medium tracking-tight">Search for users</h3>
        <p className="text-muted-foreground">Type to discover people</p>
      </div>
    </div>
  );
}
