import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Library, BookOpen, FileText, Loader2, ArrowLeft } from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecureViewer } from "@/components/secure-viewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { NoteRecord } from "@/lib/notes-utils";

export const Route = createFileRoute("/student/courses")({
  component: () => (
    <Protected role="student">
      <DashboardLayout>
        <MyCourses />
      </DashboardLayout>
    </Protected>
  ),
});

interface EnrolledCourse {
  id: string;
  name: string;
  code: string;
  description: string;
}

function MyCourses() {
  const { user } = useAuth();
  const [active, setActive] = useState<EnrolledCourse | null>(null);
  const [viewing, setViewing] = useState<NoteRecord | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["enrolled-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: enr, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user!.id)
        .eq("status", "approved");
      if (error) throw error;
      const ids = (enr ?? []).map((e) => e.course_id);
      if (!ids.length) return [] as EnrolledCourse[];
      const { data: cs, error: cErr } = await supabase
        .from("courses")
        .select("id, name, code, description")
        .in("id", ids)
        .order("name");
      if (cErr) throw cErr;
      return (cs ?? []) as EnrolledCourse[];
    },
  });

  if (viewing && active) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to {active.code}
        </Button>
        <SecureViewer note={viewing} courseName={active.name} />
      </div>
    );
  }

  if (active) {
    return <CourseNotes course={active} onBack={() => setActive(null)} onOpen={setViewing} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground">Open a course to read your lecture notes.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : courses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <Library className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You're not enrolled in any course yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.code}</p>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description || "No description."}</p>
              <Button size="sm" className="mt-4 w-full" onClick={() => setActive(c)}>
                <FileText className="h-4 w-4" /> View notes
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseNotes({
  course,
  onBack,
  onOpen,
}: {
  course: EnrolledCourse;
  onBack: () => void;
  onOpen: (note: NoteRecord) => void;
}) {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["student-course-notes", course.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, file_path, file_type, course_id, allow_download, created_at")
        .eq("course_id", course.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NoteRecord[];
    },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back to my courses
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{course.code}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : notes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notes have been uploaded for this course yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <Card key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="uppercase">{n.file_type}</Badge>
                <span className="text-sm font-medium">{n.title}</span>
                {n.allow_download && <Badge className="bg-gold/15 text-gold-foreground">Downloadable</Badge>}
              </div>
              <Button size="sm" onClick={() => onOpen(n)}>
                <FileText className="h-4 w-4" /> Read
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
