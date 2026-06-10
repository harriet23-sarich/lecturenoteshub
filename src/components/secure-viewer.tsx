import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getSignedUrl,
  downloadOriginal,
  type NoteRecord,
} from "@/lib/notes-utils";
import { supabase } from "@/integrations/supabase/client";

interface SecureViewerProps {
  note: NoteRecord;
  courseName?: string;
}

export function SecureViewer({ note, courseName }: SecureViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const prot = !note.allow_download;

  // Protection: block shortcuts / context menu when downloads are off
  useEffect(() => {
    if (!prot) return;
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "p", "c", "u"].includes(k)
      ) {
        e.preventDefault();
        toast.info("This document is protected and cannot be saved.");
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockCtx);
    return () => {
      window.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockCtx);
    };
  }, [prot]);

  const renderPdf = useCallback(async (url: string) => {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
      .default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const loadingTask = pdfjs.getDocument({ url });
    const pdf = await loadingTask.promise;
    const target = contentRef.current;
    if (!target) return;
    target.innerHTML = "";
    const width = Math.min(target.clientWidth - 4, 900);
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = (width / unscaled.width) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.maxWidth = "100%";
      canvas.className =
        "mx-auto mb-5 rounded-lg shadow-md bg-white block";
      target.appendChild(canvas);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      setDocHtml(null);
      try {
        if (note.file_type === "pdf") {
          const url = await getSignedUrl(note.file_path);
          if (!active) return;
          await renderPdf(url);
        } else {
          const { data, error: dlErr } = await supabase.storage
            .from("notes")
            .download(note.file_path);
          if (dlErr) throw dlErr;
          const arrayBuffer = await data.arrayBuffer();
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!active) return;
          const DOMPurify = (await import("dompurify")).default;
          setDocHtml(DOMPurify.sanitize(result.value));
        }
      } catch (e) {
        console.error(e);
        if (active) setError("We couldn't load this document. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [note.id, note.file_path, note.file_type, renderPdf]);

  const handleDownload = async () => {
    if (!note.allow_download) return;
    setDownloading(true);
    try {
      await downloadOriginal(note);
      toast.success("Download started");
    } catch (e) {
      console.error(e);
      toast.error("Could not download this document.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : "flex flex-col rounded-2xl border bg-card overflow-hidden shadow-sm"
      }
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground font-display">
            {note.title}
          </h2>
          {courseName && (
            <p className="truncate text-xs text-muted-foreground">{courseName}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              prot
                ? "bg-destructive/10 text-destructive"
                : "bg-gold/15 text-gold-foreground"
            }`}
          >
            {prot ? (
              <>
                <Lock className="h-3.5 w-3.5" /> Protected
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" /> Download enabled
              </>
            )}
          </span>
          {note.allow_download && (
            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-auto bg-muted/40 p-4 sm:p-6">
        {loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Preparing secure document…</p>
          </div>
        )}
        {error && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 1 }}
          className={prot ? "no-select" : ""}
        >
          <div
            ref={contentRef}
            className={
              note.file_type === "pdf"
                ? ""
                : "docx-content mx-auto max-w-[820px] rounded-lg bg-white p-8 text-[15px] leading-relaxed text-slate-800 shadow-md sm:p-12"
            }
            dangerouslySetInnerHTML={
              docHtml ? { __html: docHtml } : undefined
            }
          />
        </motion.div>
      </div>
    </div>
  );
}