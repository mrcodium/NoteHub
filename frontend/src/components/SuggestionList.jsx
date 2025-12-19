import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/useEditorStore";

const SuggestionList = forwardRef(
  ({ items = [], editor, command, range }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Select the item and execute the command
    const selectItem = (index) => {
      const item = items[index];
      if (!item) return;

      // Always remove the slash command text
      editor.chain().focus().deleteRange(range).run();

      // CUSTOM → open dialog
      if (item.command === "custom") {
        useEditorStore.getState().openDialog(item.dialog);
        command(); // close suggestion popup
        return;
      }

      // NORMAL editor command
      editor.commands[item.command](item.props);
      command();
    };

    // Handle up and down arrow navigation
    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      if (items.length === 0) {
        command(); // Close the suggestion popup
      } else {
        selectItem(selectedIndex);
      }
    };

    // Keydown event handlers
    const keyHandlers = {
      ArrowUp: upHandler,
      ArrowDown: downHandler,
      Enter: enterHandler,
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (!keyHandlers[event.key]) return false;

        keyHandlers[event.key]();
        return true;
      },
    }));

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    if (items.length === 0) {
      return null; // Don't render anything if there are no items
    }

    return (
      <div className="suggestion-list space-y-1">
        {items.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            className={`w-full hover:bg-accent/50 justify-between py-[6px] px-2 h-8 text-muted-foreground ${
              index === selectedIndex
                ? "bg-accent hover:bg-accent text-accent-foreground"
                : ""
            }`}
            onClick={() => selectItem(index)} // Using selectItem here
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="font-mono">{item.shortcut}</span>
            )}
          </Button>
        ))}
      </div>
    );
  }
);

export default SuggestionList;
