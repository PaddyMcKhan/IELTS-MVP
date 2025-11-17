// src/components/EssayEditor.tsx
"use client";

import * as React from "react";
import EssayBox from "@/components/EssayBox";

interface EssayEditorProps {
  value: string;
  onChange: (text: string) => void;
  onClear?: () => void;
}

const EssayEditor: React.FC<EssayEditorProps> = ({
  value,
  onChange,
  onClear,
}) => {
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);

  // Whenever the essay text changes, update timestamp
  React.useEffect(() => {
    if (value.trim().length === 0) {
      setLastSavedAt(null);
      return;
    }

    const now = new Date();
    setLastSavedAt(now);

    // Debug logs — visible in browser dev tools
    console.log("✏️ Essay updated:", value.slice(0, 50), "...");
    console.log("💾 Draft saved at:", now.toLocaleTimeString());
  }, [value]);

  const handleClear = () => {
    onChange(""); // clears essay text in page.tsx
    onClear?.();  // allows parent to reset UI
    setLastSavedAt(null);

    console.log("🧹 Draft cleared by user");
  };

  const savedLabel = lastSavedAt
    ? `Draft saved • ${lastSavedAt.toLocaleTimeString()}`
    : "Draft not yet saved";

  return (
    <div className="space-y-3">

      {/* ESSAY TEXT AREA */}
      <EssayBox value={value} onChange={onChange} />

      {/* STATUS + CLEAR BUTTON */}
      <div className="flex items-center justify-between text-xs">
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
          {savedLabel}
        </span>

        <button
          type="button"
          onClick={handleClear}
          className="text-red-600 underline underline-offset-2 hover:text-red-800"
        >
          Clear draft
        </button>
      </div>
    </div>
  );
};

export default EssayEditor;
