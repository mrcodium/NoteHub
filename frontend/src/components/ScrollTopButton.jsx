import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useEditorStore } from "@/stores/useEditorStore";

const ScrollTopButton = () => {
  const scrollRef = useEditorStore((s) => s.scrollRef);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const onScroll = () => {
      setShow(el.scrollTop > el.clientHeight);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  if (!show) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-20 right-4 size-11 rounded-full"
      onClick={() => scrollRef.current.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll back to top"
    >
      <ChevronUp className="!size-6" strokeWidth={3} />
    </Button>
  );
};

export default ScrollTopButton;
