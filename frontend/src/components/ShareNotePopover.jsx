import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share, Copy, Check } from "lucide-react";
import { useState } from "react";

const socialMedia = [
  {
    name: "WhatsApp",
    icon: "/social-icons/whatsapp.svg",
    url: (link) => `https://wa.me/?text=${encodeURIComponent(link)}`,
  },
  {
    name: "Facebook",
    icon: "/social-icons/facebook.svg",
    url: (link) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        link
      )}`,
  },
  {
    name: "X",
    icon: "/social-icons/x.svg",
    url: (link) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`,
  },
  {
    name: "Telegram",
    icon: "/social-icons/telegram.svg",
    url: (link) => `https://t.me/share/url?url=${encodeURIComponent(link)}`,
  },
  {
    name: "LinkedIn",
    icon: "/social-icons/linkedin.svg",
    url: (link) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        link
      )}`,
  },
];

// /user/abhijeetsingh/daa-design-and-analysis/all-pairs-shortest-path-floyd-s

export function ShareNotePopover({ shareLink }) {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!shareLink?.trim()) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button tooltip="Share" className="size-11 rounded-full">
          <Share />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-muted py-10 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-center">Share note</DialogTitle>
          <DialogDescription className="text-center">
            Anyone with this link can view this note.
          </DialogDescription>
        </DialogHeader>

        {/* Share link */}
        {shareLink && (
          <div className="space-y-8">
            <div className="grid gap-2">
              <Label htmlFor="link">Share link</Label>
              <div className="flex gap-2 relative">
                <Input id="link" value={shareLink} className="pr-10" readOnly />
                <Button
                  tooltip="Copy Link"
                  size="icon"
                  variant="ghost"
                  onClick={copyToClipboard}
                  disabled={copied}
                  className="absolute hover:bg-transparent top-1/2 right-0 -translate-y-1/2"
                >
                  {copied ? <Check /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Social buttons */}
            <div className="grid gap-2">
              <Label>Share to</Label>
              <div className="grid grid-cols-5 items-center gap-2">
                {socialMedia.map((item) => {
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        key={item.name}
                        variant="ghost"
                        className="h-14 w-14  rounded-full p-0"
                        onClick={() =>
                          window.open(item.url(shareLink), "_blank")
                        }
                      >
                        <img src={item.icon} alt={item.name} />
                      </Button>
                      <p className="text-muted-foreground text-xs font-medium max-w-full truncate">
                        {item.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareNotePopover;
