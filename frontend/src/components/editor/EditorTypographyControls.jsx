import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import {
  FONT_SIZE,
  FONT_PRESETS,
  useEditorStore,
} from "@/stores/useEditorStore";

const EditorTypographyControls = () => {
  const { editorFontFamily, editorFontSizeIndex, setFontSize, setFontFamily } =
    useEditorStore();

  const fontSize = FONT_SIZE[editorFontSizeIndex];

  return (
    <>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Font Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(FONT_PRESETS).map(([key, font]) => (
            <Button
              key={key}
              onClick={() => setFontFamily(font)}
              className={`h-full rounded-xl flex flex-col items-center justify-center gap-0 bg-primary/5 hover:bg-primary/10 text-primary aspect-square p-0
                            ${
                              editorFontFamily === font &&
                              "bg-primary/20 ring-2 ring-ring"
                            }
                          `}
              style={{
                fontFamily: font,
              }}
            >
              <div className="text-4xl leading-none">Aa</div>
              <p className="text-xs font-normal">{key}</p>
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-primary/10 my-5" />

      <div className="space-y-2">
        <Label className="text-muted-foreground">Font Size</Label>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span>{fontSize.label}</span>
            <span>{fontSize.size}</span>
          </div>

          <Slider
            value={[editorFontSizeIndex]}
            min={0}
            max={FONT_SIZE.length - 1}
            step={1}
            onValueChange={([val]) => setFontSize(val)}
          />
        </div>

        <div className="flex justify-between items-center">
          <Button
            size="icon"
            variant="secondary"
            className="bg-primary/20 hover:bg-primary/30 rounded-xl"
            disabled={editorFontSizeIndex === 0}
            onClick={() => setFontSize(Math.max(0, editorFontSizeIndex - 1))}
          >
            <Minus />
          </Button>

          <Button
            size="icon"
            variant="secondary"
            className="bg-primary/20 hover:bg-primary/30 rounded-xl"
            disabled={editorFontSizeIndex === FONT_SIZE.length - 1}
            onClick={() =>
              setFontSize(
                Math.min(FONT_SIZE.length - 1, editorFontSizeIndex + 1)
              )
            }
          >
            <Plus />
          </Button>
        </div>
      </div>
    </>
  );
};

export default EditorTypographyControls;
