import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ noteId: z.string().uuid() });

export interface NoteAccess {
  id: string;
  title: string;
  fileType: string;
  allowDownload: boolean;
  courseName: string;
  courseCode: string;
  /** Short-lived signed URL (5 minutes) for the private file. */
  url: string;
}

/**
 * Server-side authorization gate for a note.
 *
 * The middleware verifies the caller is authenticated. The query runs with the
 * caller's own token, so RLS decides access: only the owning lecturer or a
 * student with an APPROVED enrollment can read the row. Guessing a note id
 * therefore returns nothing. Only after that check do we mint a 5-minute
 * signed URL for the private storage object.
 */
export const getNoteAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<NoteAccess> => {
    const { supabase } = context;

    const { data: note, error } = await supabase
      .from("notes")
      .select("id, title, file_path, file_type, allow_download, course_id")
      .eq("id", data.noteId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!note) throw new Error("You do not have access to this note.");

    const { data: course } = await supabase
      .from("courses")
      .select("name, code")
      .eq("id", note.course_id)
      .maybeSingle();

    const { data: signed, error: signErr } = await supabase.storage
      .from("notes")
      .createSignedUrl(note.file_path, 300);

    if (signErr || !signed?.signedUrl) {
      throw new Error("Could not open this document right now.");
    }

    return {
      id: note.id,
      title: note.title,
      fileType: note.file_type,
      allowDownload: note.allow_download,
      courseName: course?.name ?? "",
      courseCode: course?.code ?? "",
      url: signed.signedUrl,
    };
  });
