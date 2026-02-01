import { Button } from "@/components/ui/button";
import {
  Pencil,
  Lock,
  Globe,
  Clock,
  Calendar,
  TextQuote,
  ChevronsUpDown,
} from "lucide-react";
import React, { useEffect, useMemo, useCallback, useState, memo } from "react"; // ADDED useCallback
import { useParams, useNavigate, Link } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import hljs from "highlight.js";
import { toast } from "sonner";
import katex from "katex";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { axiosInstance } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useImageStore } from "@/stores/useImageStore";
import Footer from "@/components/Footer";
import { cn, formatDate, formatTimeAgo, stripHTML } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ScrollTopButton from "@/components/ScrollTopButton";
import { format } from "date-fns";
import { FONT_SIZE, useEditorStore } from "@/stores/useEditorStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditorTypographyControls from "@/components/editor/EditorTypographyControls";
import ShareNotePopover from "@/components/ShareNotePopover";
import { Helmet } from "react-helmet-async";
import BadgeIcon from "@/components/icons/BadgeIcon";

const MemoEditorTypographyControls = memo(EditorTypographyControls);
const MemoShareNotePopover = memo(ShareNotePopover);
const MemoScrollTopButton = memo(ScrollTopButton);
const MemoFooter = memo(Footer);

const NotePagePublic = () => {
  const { username, collectionSlug, noteSlug } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [note, setNote] = useState(null);
  const [author, setAuthor] = useState(null);
  const { getImages } = useImageStore();

  const [activeId, setActiveId] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const {
    scrollRef,
    editorFontFamily,
    editorFontSizeIndex,
    setFontSize,
    setFontFamily,
  } = useEditorStore();

  const [progress, setProgress] = useState(0);
  const fontSize = FONT_SIZE[editorFontSizeIndex] || FONT_SIZE[1];

  // ✅ MOVED: useMemo/useCallback BEFORE any conditional returns
  const isAuthor = useMemo(
    () => authUser?._id === note?.userId,
    [authUser?._id, note?.userId],
  );

  const isAdmin = useMemo(() => authUser?.role === "admin", [authUser?.role]);
  const isOwner = useMemo(() => isAuthor || isAdmin, [isAuthor, isAdmin]);

  const metaDescription = useMemo(
    () => (note?.content ? stripHTML(note.content).slice(0, 160) : ""),
    [note?.content],
  );

  const handleTocItemClick = useCallback((itemId) => {
    document.getElementById(itemId)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  }, []);

  const handleNavigateToEditor = useCallback(() => {
    navigate(`/note/${note._id}/editor`);
  }, [navigate, note?._id]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(
          `/note/${username}/${collectionSlug}/${noteSlug}`,
        );
        const { note, author } = response.data;
        setNote(note);
        setAuthor(author);
      } catch (error) {
        if (error.response?.status === 403) {
          setIsPrivate(true);
        } else {
          console.error(error);
          toast.error("Failed to load note");
        }
      } finally {
        setIsLoading(false);
      }
    };

    getImages();
    fetchData();
  }, [username, collectionSlug, noteSlug, authUser, getImages]);

  // Content processing
  useEffect(() => {
    if (!note?.content) return;

    const imageClickHandlers = new Map();

    // Generate TOC
    const headings = Array.from(
      document.querySelectorAll(".tiptap h1, .tiptap h2, .tiptap h3"),
    );
    const tocData = headings.map((h, index) => {
      if (!h.id) h.id = `heading-${index}`;
      return {
        id: h.id,
        text: h.innerText,
        level: Number(h.tagName[1]),
        element: h,
      };
    });
    setToc(tocData);

    // Syntax highlighting
    const codeBlocks = document.querySelectorAll(
      "pre code:not([data-highlighted])",
    );
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block);
      block.setAttribute("data-highlighted", "true");
    });

    // KaTeX
    const mathElements = document.querySelectorAll(
      '[data-type="inline-math"]:not([data-katex-rendered]), [data-type="block-math"]:not([data-katex-rendered])',
    );
    mathElements.forEach((element) => {
      try {
        const latex = element.getAttribute("data-latex");
        const isBlock = element.getAttribute("data-type") === "block-math";
        katex.render(latex, element, {
          displayMode: isBlock,
          throwOnError: false,
        });
        element.setAttribute("data-katex-rendered", "true");
      } catch (error) {
        console.error("KaTeX render error:", error);
      }
    });

    // ✅ EVENT DELEGATION - Single listener for all buttons
    const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

    const handleCopyClick = async (e) => {
      const button = e.target.closest(".copy-code-button");
      if (!button) return;

      button.disabled = true;
      const pre = button.closest(".pre-wrapper");
      const codeElement = pre?.querySelector("code");
      if (!codeElement) return;

      const codeContent = codeElement.innerText || "";
      await navigator.clipboard.writeText(codeContent);
      toast.success("Content copied to clipboard!");

      button.innerHTML = checkIcon;
      setTimeout(() => {
        button.innerHTML = copyIcon;
        button.disabled = false;
      }, 3000);
    };

    // Add headers with buttons
    const preWrappers = document.querySelectorAll(".pre-wrapper");
    preWrappers.forEach((pre) => {
      if (!pre.querySelector(".pre-header")) {
        const codeElement = pre.querySelector("code");
        const languageClass = Array.from(codeElement?.classList || []).find(
          (cls) => cls.startsWith("language-"),
        );
        const language = languageClass
          ? languageClass.replace("language-", "")
          : "unknown";

        const header = document.createElement("header");
        header.className =
          "pre-header rounded-t-lg w-full flex items-center justify-between py-2 px-4";

        header.innerHTML = `
        <span class="text-xs font-medium text-muted-foreground">${language}</span>
        <button class="copy-code-button gap-2 size-7 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-background/50 hover:text-accent-foreground">
          ${copyIcon}
        </button>
      `;

        pre.insertBefore(header, pre.firstChild);
      }
    });

    // Single delegated listener
    document.addEventListener("click", handleCopyClick);

    // Image handlers
    const images = document.querySelectorAll(".tiptap img");
    images.forEach((img) => {
      img.style.cursor = "pointer";
      const handler = () => setSelectedImage(img.getAttribute("src") || "");
      img.addEventListener("click", handler);
      imageClickHandlers.set(img, handler);
    });

    // ✅ ULTRA CLEAN CLEANUP
    return () => {
      document.removeEventListener("click", handleCopyClick);

      imageClickHandlers.forEach((handler, img) => {
        img.removeEventListener("click", handler);
      });
    };
  }, [note?.content]);

  // ✅ FIXED: Only ONE progress tracking listener (REMOVED duplicate from lines 52-62)
  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = el;
          const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;
          setProgress(Math.min(100, Math.max(0, Math.round(percent))));
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // TOC scroll tracking
  useEffect(() => {
    const el = scrollRef?.current;
    if (!el || toc.length === 0) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          let current = null;
          const containerTop = el.getBoundingClientRect().top;

          for (const item of toc) {
            const rect = item.element.getBoundingClientRect();
            if (rect.top - containerTop <= 120) {
              current = item.id;
            } else {
              break;
            }
          }

          setActiveId(current);
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [toc, scrollRef]);

  if (isLoading) {
    return <NoteSkeleton />;
  }

  if (isPrivate) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="bg-secondary p-6 rounded-full">
          <Lock className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">This note is private</h2>
        <p className="text-muted-foreground max-w-md text-center">
          The owner of this note has set it to private. You need permission to
          view it.
        </p>
        {authUser ? (
          <Button onClick={() => navigate("/")}>Browse your notes</Button>
        ) : (
          <Button onClick={() => navigate("/login")}>
            Sign in to view your notes
          </Button>
        )}
      </div>
    );
  }

  if (!note?.content.trim()) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        {isOwner && (
          <Button
            onClick={handleNavigateToEditor}
            variant="secondary"
            size="lg"
            className="shadow-md bottom-2 right-4 font-bold"
          >
            <Pencil /> Write
          </Button>
        )}
        <img
          className="size-[200px] mx-auto mt-4 grayscale-[100] opacity-50"
          src="/empty-note-state.svg"
          alt="Empty Note"
        />
        <div>No content</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{note.name} | NoteHub</title>
        <meta name="description" content={metaDescription} />

        {/* Open Graph */}
        <meta property="og:title" content={note.name} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />

        {/* Twitter */}
        <meta name="twitter:title" content={note.name} />
        <meta name="twitter:description" content={metaDescription} />
      </Helmet>

      <div
        className={cn(
          "h-full flex flex-col justify-between",
          !note?.content.trim() && "empty",
        )}
      >
        <div className="max-w-screen-md w-full mx-auto relative">
          <div className="py-8 px-4 space-y-6 border-b border-dashed mb-12">
            <div className="flex items-center justify-between">
              <Link
                to={`/user/${author?.userName}`}
                className="flex flex-row items-center w-max gap-3"
              >
                <Avatar className="size-12 bg-muted">
                  <AvatarImage
                    className="w-full h-full object-cover !m-0"
                    src={author?.avatar}
                    alt={author?.fullName || "Author Profile Photo"}
                  />
                  <AvatarFallback>
                    {(author?.fullName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="font-semibold flex gap-4 !text-primary items-center text-sm">
                    <div className="flex gap-2 items-center">
                      <span>{author?.fullName}</span>
                      <span>
                        {author?.role === "admin" && (
                          <BadgeIcon className="size-4 text-blue-500" />
                        )}
                      </span>
                    </div>
                    {isOwner && (
                      <Badge
                        variant="ghost"
                        className={"p-1 border-none text-muted-foreground"}
                      >
                        {note.visibility === "public" &&
                        note.visibility === "public" ? (
                          <Globe size={16} strokeWidth={3} />
                        ) : (
                          <Lock
                            size={16}
                            strokeWidth={3}
                            className="fill-destructive/20 stroke-destructive"
                          />
                        )}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {`@${author?.userName}`}
                  </span>
                </div>
              </Link>
              {isOwner && (
                <Button
                  tooltip="Edit Content"
                  onClick={() => navigate(`/note/${note?._id}/editor`)}
                  variant="secondary"
                  size="lg"
                  className="rounded-full w-10 p-0 sm:w-auto sm:px-6 border bg-muted"
                >
                  <Pencil />
                  <span className="hidden sm:inline-block">Edit</span>
                </Button>
              )}
            </div>
            <div className="flex justify-around gap-8">
              {/* Created Date */}
              <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
                <div className="flex gap-2 items-center">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Created
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-sm font-medium"
                    title={formatDate(note?.createdAt)}
                  >
                    {format(new Date(note?.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {/* Last Modified */}
              <div className="flex gap-1 flex-col md:gap-4 md:flex-row items-center">
                <div className="flex gap-2 items-center">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Last Modified
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-sm font-medium"
                    title={formatDate(note?.contentUpdatedAt)}
                  >
                    {formatTimeAgo(
                      new Date(note?.contentUpdatedAt),
                      "MMM d, yyyy",
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Dialog
            open={selectedImage}
            onOpenChange={(open) => !open && setSelectedImage(null)}
          >
            <DialogContent
              closeButtonClassName="top-2 left-2 right-auto bg-black md:size-6 flex items-center justify-center bg-neutral-200 text-neutral-600"
              className="p-0 border-none w-auto h-auto max-w-[100vw] max-h-[100vh] overflow-hidden sm:rounded-lg"
            >
              <DialogTitle className="hidden">Image Dialog</DialogTitle>
              <div className="flex items-center justify-center w-full h-full">
                {selectedImage && (
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="object-contain w-auto h-auto max-w-[100vw] max-h-[100vh]"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div
            className="tiptap"
            style={{
              fontSize: fontSize.size,
              fontFamily: editorFontFamily,
              lineHeight: "1.7",
            }}
          >
            {parse(note?.content || "")}
          </div>

          {/* ✅ MEMOIZED FLOATING BUTTONS */}
          <FloatingActionButtons
            toc={toc}
            tocOpen={tocOpen}
            setTocOpen={setTocOpen}
            progress={progress}
            activeId={activeId}
            handleTocItemClick={handleTocItemClick}
            note={note}
            username={username}
            collectionSlug={collectionSlug}
            noteSlug={noteSlug}
            isOwner={isOwner}
            handleNavigateToEditor={handleNavigateToEditor}
          />
        </div>
        <MemoScrollTopButton />
        <MemoFooter className={"pb-28"} />
      </div>
    </>
  );
};

// ✅ EXTRACT FLOATING BUTTONS TO SEPARATE MEMOIZED COMPONENT
const FloatingActionButtons = memo(
  ({
    toc,
    tocOpen,
    setTocOpen,
    progress,
    activeId,
    handleTocItemClick,
    note,
    username,
    collectionSlug,
    noteSlug,
    isOwner,
    handleNavigateToEditor,
  }) => {
    return (
      <div className="flex gap-2 items-center fixed bottom-4 right-4">
        {toc.length > 1 && (
          <Popover open={tocOpen} onOpenChange={setTocOpen}>
            <PopoverTrigger asChild>
              <Button
                className="hover:bg-primary h-11 gap-4 rounded-full py-1.5 px-2 pl-4"
                variant="default"
              >
                <div className="flex items-center gap-2">
                  <TextQuote />
                  Index <ChevronsUpDown className="text-primary-foreground" />
                </div>
                <div className="bg-muted/5 p-2 py-1.5 rounded-full min-w-[50px]">
                  {Number(progress || 0)}%
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              alignOffset={-50}
              className="rounded-2xl min-w-max pr-1"
            >
              <ScrollArea>
                <div className="max-w-[300px] sm:max-w-sm max-h-[60vh] pr-4">
                  <div className="space-y-2">
                    {toc.map((item) => (
                      <p
                        key={item.id}
                        onClick={() => handleTocItemClick(item.id)}
                        className={cn(
                          "cursor-pointer !pl-0 list-decimal !text-base/6 text-muted-foreground hover:text-primary",
                          activeId === item.id && "text-primary font-semibold",
                        )}
                        style={{ paddingLeft: (item.level - 1) * 12 }}
                      >
                        {item.text}
                      </p>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
        <MemoEditorTypographyControls />
        <MemoShareNotePopover
          note={note}
          shareLink={`https://notehub-38kp.onrender.com/user/${username}/${collectionSlug}/${noteSlug}`}
        />
        {isOwner && (
          <Button
            onClick={handleNavigateToEditor}
            size="icon"
            tooltip="Edit Content"
            className="size-11 rounded-full"
          >
            <Pencil />
          </Button>
        )}
      </div>
    );
  },
);

FloatingActionButtons.displayName = "FloatingActionButtons";

export default NotePagePublic;
