import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Library, Compass, BookOpen, ArrowRight } from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/student/")({
  component: () => (
    <Protected role="student">
      <DashboardLayout>
        <StudentDashboard />
      </DashboardLayout>
    </Protected>
  ),
});

function StudentDashboard() {
  const { user, profile } = useAuth();
  const { data } = useQuery({
    queryKey: ["student-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("status")
        .eq("student_id", user!.id);
      const approved = (enr ?? []).filter((e) => e.status === "approved").length;
      const pending = (enr ?? []).filter((e) => e.status === "pending").length;
      return { approved, pending };
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Hello, {profile?.name?.split(" ")[0] || "Student"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Continue learning or discover new courses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Enrolled courses</p>
              <p className="mt-1 font-display text-3xl font-bold text-foreground">
                {data?.approved ?? 0}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Library className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending requests</p>
              <p className="mt-1 font-display text-3xl font-bold text-foreground">
                {data?.pending ?? 0}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold-foreground">
              <Compass className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-medium">Go to my courses</span>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/student/courses"><ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
        <Card className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-medium">Browse all courses</span>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/student/browse"><ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}