import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, BookOpen, Loader2, Check, Clock } from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/student/browse")({
  component: () => (
    <Protected role="student">
      <DashboardLayout>
        <Browse />
      </DashboardLayout>
    </Protected>
  ),
});

function Browse() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["browse-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: courses } = await supabase
        .from("courses").select("id, name, code, description").order("name");
      const { data: enr } = await supabase
        .from("enrollments").select("course_id, status").eq("student_id", user!.id);
      const statusByCourse = Object.fromEntries((enr ?? []).map((e) => [e.course_id, e.status]));
      return (courses ?? []).map((c) => ({ ...c, status: statusByCourse[c.id] as string | undefined }));
    },
  });

  const enroll = async (courseId: string) => {
    const { error } = await supabase.from("enrollments").insert({ student_id: user!.id, course_id: courseId });
    if (error) return toast.error(error.message);
    toast.success("Enrollment request sent");
    qc.invalidateQueries({ queryKey: ["browse-courses"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Browse Courses</h1>
        <p className="text-sm text-muted-foreground">Request to enroll. A lecturer will approve your access.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.code}</p>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description || "No description."}</p>
              <div className="mt-4">
                {c.status === "approved" ? (
                  <Badge className="bg-gold/20 text-gold-foreground"><Check className="mr-1 h-3 w-3" /> Enrolled</Badge>
                ) : c.status === "pending" ? (
                  <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Pending approval</Badge>
                ) : c.status === "rejected" ? (
                  <Badge variant="outline">Request declined</Badge>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => enroll(c.id)}>
                    <Compass className="h-4 w-4" /> Request enrollment
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No courses available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}