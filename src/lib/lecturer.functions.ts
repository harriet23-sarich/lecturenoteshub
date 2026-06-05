import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
  accessCode: z.string().min(1).max(200),
});

export const registerLecturer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.LECTURER_ACCESS_CODE;
    if (!expected) {
      throw new Error("Lecturer registration is not configured. Contact the administrator.");
    }
    if (data.accessCode !== expected) {
      throw new Error("Invalid lecturer access code.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message);

    const userId = created.user?.id;
    if (!userId) throw new Error("Could not create the lecturer account.");

    // The signup trigger assigns 'student' by default — upgrade to lecturer.
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "lecturer" })
      .eq("user_id", userId);
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true };
  });
