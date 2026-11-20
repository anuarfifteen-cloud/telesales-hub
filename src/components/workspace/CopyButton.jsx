import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { PRIMARY_BTN } from "./workspaceStyles";

/** Copies the given text and confirms it with a toast. */
export default function CopyButton({ text, label = "Copy Note" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and non-secure contexts have no clipboard API.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    toast.success("Copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" onClick={handleCopy} className={`${PRIMARY_BTN} w-full`}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : label}
    </button>
  );
}