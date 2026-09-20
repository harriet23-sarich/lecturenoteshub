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
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getNoteAccess, type NoteAccess } from "@/lib/notes-access.functions";
import { triggerBlobDownload, sanitize, type NoteRecord } from "@/lib/notes-utils";
import { useAuth } from "@/hooks/use-auth";

interface SecureViewerProps {
  note: NoteRecord;
  courseName?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

export function SecureViewer({ note, courseName }: SecureViewerProps) {
  const { profile, user } = useAuth();
  const fetchAccess = useServerFn(getNoteAccess);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);

  const [access, setAccess] = useState<NoteAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  const allowDownload = access?.allowDownload ?? false;
  const prot = !allowDownload;
  const watermark =
    profile?.name?.trim() || profile?.email || user?.email || "Protected copy";

  /* Block save/print/copy shortcuts and right-click for protected notes. */
  useEffect(() => {
    if (!prot) return;
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "c", "u"].includes(k)) {
        e.preventDefault();
        toast.info("This document is protected and cannot be saved or printed.");
      }
      if (e.key === "PrintScreen") e.preventDefault();
    };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockCtx);
    document.documentElement.classList.add("print-blocked");
    return () => {
      window.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockCtx);
      document.documentElement.classList.remove("print-blocked");
    };
  }, [prot]);

  /* 1. Ask the server whether this user may open the note; get a short-lived URL. */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setAccess(null);
    setDocHtml(null);
    setPage(1);
    setNumPages(0);
    pdfRef.current = null;
    (async () => {
      try {
        const res = await fetchAccess({ data: { noteId: note.id } });
        if (active) setAccess(res);
      } catch (e) {
        console.error(e);
        if (active)
          setError(
            e instanceof Error && e.message.includes("access")
              ? "You don't have permission to view this note."
              : "We couldn't load this document. Please try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [note.id, fetchAccess]);

  /* 2. Load the document from the signed URL. */
  useEffect(() => {
    if (!access) return;
    let active = true;
    (async () => {
      setRendering(true);
      try {
        if (access.fileType === "pdf") {
          const pdfjs = await import("pdfjs-dist");
          const workerSrc = (
            await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
          ).default;
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          const pdf = await pdfjs.getDocument({ url: access.url }).promise;
          if (!active) return;
          pdfRef.current = pdf as never;
          setNumPages(pdf.numPages);
          setPage(1);
        } else {
          const res = await fetch(access.url);
          const arrayBuffer = await res.arrayBuffer();
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
        if (active) setRendering(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [access]);

  /* 3. Render the current PDF page at the current zoom. */
  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current as
      | { getPage: (n: number) => Promise<never>; numPages: number }
      | null;
    const target = contentRef.current;
    if (!pdf || !target) return;
    const pageObj = (await pdf.getPage(page)) as never as {
      getViewport: (o: { scale: number }) => { width: number; height: number };
      render: (o: Record<string, unknown>) => { promise: Promise<void> };
    };
    const unscaled = pageObj.getViewport({ scale: 1 });
    const available = Math.min(target.clientWidth - 8, 900);
    const dpr = window.devicePixelRatio || 1;
    const scale = (available / unscaled.width) * zoom * dpr;
    const viewport = pageObj.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.maxWidth = "100%";
    canvas.className = "mx-auto rounded-lg shadow-md bg-white block";
    await pageObj.render({ canvasContext: ctx, viewport, canvas }).promise;
    target.innerHTML = "";
    target.appendChild(canvas);
  }, [page, zoom]);

  useEffect(() => {
    if (access?.fileType === "pdf" && numPages > 0) void renderPage();
  }, [access?.fileType, numPages, renderPage]);

  const handleDownload = async () => {
    if (!access?.allowDownload) return;
    setDownloading(true);
    try {
      const res = await fetch(access.url);
      const blob = await res.blob();
      triggerBlobDownload(blob, `${sanitize(access.title)}.${access.fileType}`);
      toast.success("Download started");
    } catch (e) {
      console.error(e);
      toast.error("Could not download this document.");
    } finally {
      setDownloading(false);
    }
  };

  const isPdf = access?.fileType === "pdf";
  const busy = loading || rendering;

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground font-display">
            {access?.title ?? note.title}
          </h2>
          {(access?.courseName || courseName) && (
            <p className="truncate text-xs text-muted-foreground">
              {access?.courseName || courseName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              prot
                ? "bg-destructive/10 text-destructive"
                : "bg-gold/15 text-gold-foreground"
            }`}
          >
            {prot ? (
              <>
                <Lock className="h-3.5 w-3.5" /> View only
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" /> Download enabled
              </>
            )}
          </span>

          {/* Zoom */}
          <div className="flex items-center gap-1 rounded-lg border px-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-11 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Page navigation (PDF only) */}
          {isPdf && numPages > 0 && (
            <div className="flex items-center gap-1 rounded-lg border px-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-14 text-center text-xs tabular-nums text-muted-foreground">
                {page} / {numPages}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={page >= numPages}
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {allowDownload && (
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
            aria-label="Toggle fullscreen"
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
      <div
        className="relative flex-1 overflow-auto bg-muted/40 p-3 sm:p-6"
        onContextMenu={prot ? (e) => e.preventDefault() : undefined}
      >
        {busy && !error && (
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
        {!error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: busy ? 0 : 1 }}
            className={`relative ${prot ? "no-select" : ""}`}
          >
            <div
              ref={contentRef}
              style={!isPdf ? { zoom } : undefined}
              className={
                isPdf
                  ? ""
                  : "docx-content mx-auto max-w-[820px] rounded-lg bg-white p-6 text-[15px] leading-relaxed text-slate-800 shadow-md sm:p-12"
              }
              dangerouslySetInnerHTML={docHtml ? { __html: docHtml } : undefined}
            />
            {/* Subtle identifying watermark on protected notes */}
            {prot && !busy && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden"
              >
                <div className="grid h-full w-full grid-cols-2 place-items-center gap-10 opacity-[0.07]">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span
                      key={i}
                      className="rotate-[-30deg] whitespace-nowrap text-[13px] font-semibold text-foreground"
                    >
                      {watermark}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
