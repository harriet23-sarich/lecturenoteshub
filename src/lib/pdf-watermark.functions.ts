import { createServerFn } from "@tanstack/react-start";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ noteId: z.string().uuid() });
const WATERMARK = "JULIUS SARICH";

export const watermarkPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, file_path, file_type, watermarked_at, course_id")
      .eq("id", data.noteId)
      .maybeSingle();

    if (noteError) throw new Error(noteError.message);
    if (!note) throw new Error("Note not found.");
    const { data: course } = await supabase
      .from("courses")
      .select("lecturer_id")
      .eq("id", note.course_id)
      .maybeSingle();
    if (!course || course.lecturer_id !== userId) {
      throw new Error("Only the course lecturer can watermark this PDF.");
    }
    if (note.file_type !== "pdf") throw new Error("Only PDF notes can be watermarked.");
    if (note.watermarked_at) return { alreadyWatermarked: true };

    const { data: source, error: downloadError } = await supabase.storage
      .from("notes")
      .download(note.file_path);
    if (downloadError || !source) throw new Error("Could not read the stored PDF.");

    const pdf = await PDFDocument.load(await source.arrayBuffer());
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      const fontSize = Math.max(34, Math.min(width, height) * 0.085);
      const textWidth = font.widthOfTextAtSize(WATERMARK, fontSize);
      page.drawText(WATERMARK, {
        x: (width - textWidth * 0.72) / 2,
        y: height / 2 - fontSize / 2,
        size: fontSize,
        font,
        color: rgb(0.12, 0.34, 0.62),
        opacity: 0.14,
        rotate: degrees(35),
      });
    }

    const bytes = await pdf.save();
    const { error: uploadError } = await supabase.storage
      .from("notes")
      .update(note.file_path, bytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { error: updateError } = await supabase
      .from("notes")
      .update({ watermarked_at: new Date().toISOString() })
      .eq("id", note.id);
    if (updateError) throw new Error(updateError.message);

    return { alreadyWatermarked: false };
  });