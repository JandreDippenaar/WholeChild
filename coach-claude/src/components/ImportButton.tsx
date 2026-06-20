import { useRef } from "react";
import { Upload } from "lucide-react";
import { useStore } from "../lib/store";

export function ImportButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importFiles = useStore((s) => s.importFiles);
  const busy = useStore((s) => s.importStatus.busy);

  return (
    <>
      <button
        className={`w-full ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Upload size={16} />
        Import data
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".fit,.gpx,.tcx,.csv,.xml,.zip,.json"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length) void importFiles(Array.from(files));
          e.target.value = "";
        }}
      />
    </>
  );
}
