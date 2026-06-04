import { supabase } from "@/integrations/supabase/client";

export interface NoteRecord {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  course_id: string;
  allow_download: boolean;
  created_at: string;
}

/** Create a short-lived signed URL for a note file in the private bucket. */
export async function getSignedUrl(filePath: string, expiresIn = 60 * 30) {
  const { data, error } = await supabase.storage
    .from("notes")
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Download the original file (used when allow_download is on). */
export async function downloadOriginal(note: NoteRecord) {
  const { data, error } = await supabase.storage
    .from("notes")
    .download(note.file_path);
  if (error) throw error;
  const ext = note.file_type === "pdf" ? "pdf" : "docx";
  triggerBlobDownload(data, `${sanitize(note.title)}.${ext}`);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function sanitize(name: string) {
  return name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "lecture-note";
}