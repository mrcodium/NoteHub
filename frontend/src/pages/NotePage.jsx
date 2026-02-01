import { Button } from "@/components/ui/button";
import { useNoteStore } from "@/stores/useNoteStore";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Clock,
  Copy,
  CopyCheck,
  Globe,
  Lock,
  LucideChevronsLeft,
  Minus,
  Pencil,
  Plus,
  TextQuote,
  Type,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import parse from "html-react-parser";
import NoteSkeleton from "@/components/sekeletons/NoteSkeleton";
import { useNavigate } from "react-router-dom";
import hljs from "highlight.js";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import katex from "katex";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Footer from "@/components/Footer";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, formatTimeAgo, stripHTML } from "@/lib/utils";
import ScrollTopButton from "@/components/ScrollTopButton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FONT_PRESETS,
  FONT_SIZE,
  useEditorStore,
} from "@/stores/useEditorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import EditorTypographyControls from "@/components/editor/EditorTypographyControls";
import ShareNotePopover from "@/components/ShareNotePopover";
import { Helmet } from "react-helmet-async";
import BadgeIcon from "@/components/icons/BadgeIcon";

const NotePage = () => {
  const { id: noteId } = useParams();
  const { authUser } = useAuthStore();
  const { getNoteContent, status, noteNotFound, collections } = useNoteStore();
  const [content, setContent] = useState("");
  const [note, setNote] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const { scrollRef, editorFontFamily, editorFontSizeIndex } = useEditorStore();
  const fontSize = FONT_SIZE[editorFontSizeIndex] || FONT_SIZE[1];
  const [progress, setProgress] = useState(0);

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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (noteId) {
        let note = await getNoteContent(noteId);
        setNote(note);
        setContent(note?.content || "");
      }
    };

    fetchData();
  }, [noteId, getNoteContent]);

  useEffect(() => {
    if (content) {
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
          const languageClass = Array.from(codeElement.classList).find((cls) =>
            cls.startsWith("language-"),
          );
          const language = languageClass
            ? languageClass.replace("language-", "")
            : "unknown";

          const header = document.createElement("header");
          header.className =
            "pre-header rounded-t-lg w-full flex items-center justify-between py-2 px-4";
          header.innerHTML = `<span>${language}</span>`;
          pre.insertBefore(header, pre.firstChild);

          const buttonContainer = document.createElement("div");
          header.appendChild(buttonContainer);

          const CopyButton = () => {
            const [copied, setCopied] = useState(false);

            const handleCopy = async () => {
              const codeContent = codeElement.innerText;
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
                  <Check className="h-4 w-4" />
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
        img.addEventListener("click", () => setSelectedImage(img.src));
      });

      return () => {
        images.forEach((img) => {
          img.removeEventListener("click", () => setSelectedImage(img.src));
        });
      };
    }
  }, [content]);

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

  const generateSharableLink = () => {
    const collection = collections.find((c) => c._id === note.collectionId);
    return `https://notehub-38kp.onrender.com/user/${authUser?.userName}/${collection?.slug}/${note?.slug}`;
  };

  if (status.noteContent.state === "loading") {
    return <NoteSkeleton />;
  }

  if (content === "") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        <Button
          onClick={() => navigate(`/note/${noteId}/editor`)}
          variant="secondary"
          size="lg"
          className="shadow-md bottom-2 right-4 font-bold"
        >
          <Pencil /> Write
        </Button>
        <img
          className="size-[200px] mx-auto mt-4 grayscale-[100] opacity-50"
          src="/empty-note-state.svg"
          alt=""
        />
        <div>No content</div>
      </div>
    );
  }

  if (noteNotFound) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <img
          src="/404-not-found.svg"
          className="p-4 rounded-lg max-w-[500px]"
        ></img>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{note.name} | NoteHub</title>
        <meta name="description" content={stripHTML(note.content).slice(0, 160)} />

        {/* Open Graph */}
        <meta property="og:title" content={note.name} />
        <meta property="og:description" content={stripHTML(note.content).slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />

        {/* Twitter */}
        <meta name="twitter:title" content={note.name} />
        <meta name="twitter:description" content={stripHTML(note.content).slice(0, 160)} />
      </Helmet>
      <div
        className={cn(
          "h-full flex flex-col justify-between",
          !content.trim() && "empty",
        )}
      >
        <div className="max-w-screen-md w-full mx-auto relative">
          <div className="py-8 px-4 space-y-6 border-b border-dashed mb-12">
            <div className="flex items-center justify-between">
              <Link
                to={`/user/${authUser?.userName}`}
                className="flex flex-row items-center w-max gap-3"
              >
                <Avatar className="size-12 bg-muted">
                  <AvatarImage
                    className="w-full h-full object-cover !m-0"
                    src={authUser?.avatar}
                    alt={authUser?.fullName || "Author Profile Photo"}
                  />
                  <AvatarFallback>
                    {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="font-semibold flex gap-2 !text-primary items-center text-sm">
                    <div className="flex gap-2 items-center">
                      <span>{authUser?.fullName}</span>
                      <span>
                        {authUser?.role === "admin" && (
                          <BadgeIcon className="size-4 text-blue-500" />
                        )}
                      </span>
                    </div>
                    <Badge
                      variant="ghost"
                      className={"p-1 border-none text-muted-foreground"}
                    >
                      {note.visibility === "public" ? (
                        <Globe size={16} strokeWidth={3} />
                      ) : (
                        <Lock
                          size={16}
                          strokeWidth={3}
                          className="fill-destructive/20 stroke-destructive"
                        />
                      )}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {`@${authUser?.userName}`}
                  </span>
                </div>
              </Link>
              <Button
                onClick={() => navigate(`/note/${note?._id}/editor`)}
                variant="secondary"
                size="lg"
                className="rounded-full px-6 border bg-muted"
              >
                <Pencil />
                <span>Edit</span>
              </Button>
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
            open={!!selectedImage}
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
                      Index{" "}
                      <ChevronsUpDown className="text-primary-foreground" />
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
                              "cursor-pointer line-clamp-1 list-decimal !text-base/6 text-muted-foreground hover:text-primary",
                              activeId === item.id &&
                                "text-primary font-semibold",
                            )}
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
            <ShareNotePopover note={note} shareLink={generateSharableLink()} />
            <Button
              onClick={() => navigate(`/note/${note._id}/editor`)}
              size="icon"
              tooltip="Edit Content"
              className="size-11 rounded-full"
            >
              <Pencil />
            </Button>
          </div>
        </div>
        <ScrollTopButton />
        <Footer className={"pb-28"} />
      </div>
    </>
  );
};

export default NotePage;
