import { Button } from "@/components/ui/button";
import {
  Copy,
  CopyCheck,
  Pencil,
  Lock,
  Globe,
  ChevronUp,
  Clock,
  Calendar,
  TextQuote,
  ChevronsUpDown,
  Type,
  Minus,
  Plus,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import hljs from "highlight.js";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { axiosInstance } from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { useImageStore } from "@/stores/useImageStore";
import Footer from "@/components/Footer";
import { cn, formatDate, formatTimeAgo } from "@/lib/utils";
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

const NotePagePublic = () => {
  const { username, collectionSlug, noteSlug } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
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

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;

      setProgress(Math.min(100, Math.max(0, Math.round(percent))));
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

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
        setIsOwner(authUser?._id === note.userId);
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
  }, [username, collectionSlug, noteSlug, authUser]);

  useEffect(() => {
    if (note?.content) {
      // Generate Table of Contents
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

      // Apply syntax highlighting
      document
        .querySelectorAll("pre code:not([data-highlighted])")
        .forEach((block) => {
          hljs.highlightElement(block);
        });

      // Render KaTeX
      document
        .querySelectorAll('[data-type="inline-math"], [data-type="block-math"]')
        .forEach((element) => {
          try {
            const latex = element.getAttribute("data-latex");
            const isBlock = element.getAttribute("data-type") === "block-math";

            katex.render(latex, element, {
              displayMode: isBlock, // true for block, false for inline
              throwOnError: false,
            });
          } catch (error) {
            console.error("KaTeX render error:", error);
          }
        });

      // Add header with copy button to each pre tag
      document.querySelectorAll(".pre-wrapper").forEach((pre) => {
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
            "pre-header bg-input/50 rounded-t-lg w-full flex items-center justify-between py-2 px-4";
          header.innerHTML = `<span>${language}</span>`;
          pre.insertBefore(header, pre.firstChild);

          const buttonContainer = document.createElement("div");
          header.appendChild(buttonContainer);

          const CopyButton = () => {
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              const codeContent = codeElement?.innerText || "";
              await navigator.clipboard.writeText(codeContent);
              toast.success("Content copied to clipboard!");
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            };

            return (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={copied}
                className="gap-2 size-7"
              >
                {copied ? (
                  <CopyCheck className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            );
          };

          const root = createRoot(buttonContainer);
          root.render(<CopyButton />);
        }
      });

      // Add image click handlers
      const images = [...document.querySelectorAll(".tiptap img")];
      images.forEach((img) => {
        img.style.cursor = "pointer";
        img.addEventListener("click", () =>
          setSelectedImage(img.getAttribute("src") || ""),
        );
      });

      return () => {
        images.forEach((img) => {
          img.removeEventListener("click", () => setSelectedImage(null));
        });
      };
    }
  }, [note]);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el || toc.length === 0) return;

    const onScroll = () => {
      let current = null;

      toc.forEach((item) => {
        const rect = item.element.getBoundingClientRect();
        const containerTop = el.getBoundingClientRect().top;

        if (rect.top - containerTop <= 120) {
          current = item.id;
        }
      });

      setActiveId(current);
    };

    el.addEventListener("scroll", onScroll);
    onScroll(); // run once initially

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
            onClick={() => navigate(`/note/${note._id}/editor`)}
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
          alt=""
        />
        <div>No content</div>
      </div>
    );
  }

  return (
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
                  alt={author?.fullName}
                />
                <AvatarFallback>
                  {(author?.fullName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="font-semibold flex gap-2 !text-primary items-center text-sm">
                  <span>{author?.fullName}</span>
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
                className="rounded-full px-6 border bg-muted"
              >
                <Pencil />
                <span>Edit</span>
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
                  {formatTimeAgo(new Date(note?.contentUpdatedAt), "MMM d, yyyy")}
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
                          onClick={() => {
                            document.getElementById(item.id)?.scrollIntoView({
                              behavior: "smooth",
                            });
                            setTocOpen(false);
                          }}
                          className={cn(
                            "cursor-pointer !pl-0 list-decimal !text-base/6 text-muted-foreground hover:text-primary",
                            activeId === item.id &&
                              "text-primary font-semibold",
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
          <EditorTypographyControls />

          <ShareNotePopover
            note={note}
            shareLink={`https://notehub-38kp.onrender.com/user/${username}/${collectionSlug}/${noteSlug}`}
          />
          {isOwner && (
            <Button
              onClick={() => navigate(`/note/${note._id}/editor`)}
              size="icon"
              tooltip="Edit Content"
              className="size-11 rounded-full"
            >
              <Pencil />
            </Button>
          )}
        </div>
      </div>
      <ScrollTopButton />
      <Footer className={"pb-28"} />
    </div>
  );
};

export default NotePagePublic;
