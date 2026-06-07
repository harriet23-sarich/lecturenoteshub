import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Clock, Plus, ArrowLeft } from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SecureViewer } from "@/components/secure-viewer";
import type { NoteRecord } from "@/lib/notes-utils";

export const Route = createFileRoute("/lecturer/")({
  component: () => (
    <Protected role="lecturer">
      <DashboardLayout>
        <LecturerDashboard />
      </DashboardLayout>
    </Protected>
  ),
});

function LecturerDashboard() {
  const { user, profile } = useAuth();
  const [viewing, setViewing] = useState<{ note: NoteRecord; courseName: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["lecturer-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("lecturer_id", user!.id);
      const courseIds = (courses ?? []).map((c) => c.id);
      let notes: NoteRecord[] = [];
      if (courseIds.length) {
        const { data: n } = await supabase
          .from("notes")
          .select("id, title, file_path, file_type, course_id, allow_download, created_at")
          .in("course_id", courseIds)
          .order("created_at", { ascending: false });
        notes = (n ?? []) as NoteRecord[];
      }
      return { courses: courses ?? [], notes };
    },
  });

  const courses = data?.courses ?? [];
  const notes = data?.notes ?? [];
  const recent = notes.slice(0, 5);
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "";

  const stats = [
    { label: "Total Courses", value: courses.length, icon: BookOpen },
    { label: "Total Notes", value: notes.length, icon: FileText },
    { label: "Recent Uploads", value: recent.length, icon: Clock },
  ];

  if (viewing) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>
        <SecureViewer note={viewing.note} courseName={viewing.courseName} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome back, {profile?.name?.split(" ")[0] || "Lecturer"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's an overview of your courses and materials.
          </p>
        </div>
        <Button asChild>
          <Link to="/lecturer/courses">
            <Plus className="h-4 w-4" /> Manage courses
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-display text-3xl font-bold text-foreground">
                  {s.value}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Recent uploads
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No notes uploaded yet. Create a course and upload your first note.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setViewing({ note: n, courseName: courseName(n.course_id) })}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-muted/40 rounded-md px-2 -mx-2"
                >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {courseName(n.course_id)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}