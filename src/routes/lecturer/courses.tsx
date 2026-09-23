import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, BookOpen, Trash2, Upload, FileText, Users, Check, X, Loader2, ChevronDown, Stamp,
} from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sanitize } from "@/lib/notes-utils";
import { toast } from "sonner";
import { watermarkPdf } from "@/lib/pdf-watermark.functions";

export const Route = createFileRoute("/lecturer/courses")({
  component: () => (
    <Protected role="lecturer">
      <DashboardLayout>
        <Courses />
      </DashboardLayout>
    </Protected>
  ),
});

function Courses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, description")
        .eq("lecturer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCourse = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Course name and code are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("courses").insert({
      name: name.trim(), code: code.trim(), description: description.trim(),
      lecturer_id: user!.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Course created");
    setName(""); setCode(""); setDescription(""); setCreating(false);
    qc.invalidateQueries({ queryKey: ["my-courses"] });
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Course deleted");
    qc.invalidateQueries({ queryKey: ["my-courses"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">Create courses and manage materials.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Create Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a course</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cname">Course name</Label>
                <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Introduction to Computer Science" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ccode">Course code</Label>
                <Input id="ccode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSC 101" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdesc">Description</Label>
                <Textarea id="cdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of the course" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createCourse} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {courses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No courses yet. Create your first course.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onDelete={() => deleteCourse(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Course { id: string; name: string; code: string; description: string }

function CourseCard({ course, onDelete }: { course: Course; onDelete: () => void }) {
  const qc = useQueryClient();
  const applyWatermark = useServerFn(watermarkPdf);
  const [open, setOpen] = useState(false);
  const [watermarking, setWatermarking] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { data: notes = [] } = useQuery({
    queryKey: ["course-notes", course.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, file_path, file_type, allow_download, created_at, watermarked_at")
        .eq("course_id", course.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["course-enrollments", course.id],
    enabled: open,
    queryFn: async () => {
      const { data: enr, error } = await supabase
        .from("enrollments")
        .select("id, student_id, status")
        .eq("course_id", course.id);
      if (error) throw error;
      const ids = (enr ?? []).map((e) => e.student_id);
      let profiles: Record<string, { name: string; email: string }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, name, email").in("id", ids);
        profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      }
      return (enr ?? []).map((e) => ({ ...e, profile: profiles[e.student_id] }));
    },
  });

  const toggleDownload = async (noteId: string, value: boolean) => {
    const { error } = await supabase.from("notes").update({ allow_download: value }).eq("id", noteId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["course-notes", course.id] });
  };

  const deleteNote = async (noteId: string, filePath: string) => {
    await supabase.storage.from("notes").remove([filePath]);
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) return toast.error(error.message);
    toast.success("Note removed");
    qc.invalidateQueries({ queryKey: ["course-notes", course.id] });
  };

  const setEnrollment = async (id: string, status: string) => {
    const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["course-enrollments", course.id] });
    toast.success(`Enrollment ${status}`);
  };

  const pending = enrollments.filter((e) => e.status === "pending");

  const watermarkNotes = async (noteIds: string[]) => {
    if (!noteIds.length) return toast.info("All PDFs are already watermarked.");
    setProgress({ done: 0, total: noteIds.length });
    setWatermarking(noteIds);
    let completed = 0;
    try {
      for (const noteId of noteIds) {
        await applyWatermark({ data: { noteId } });
        completed += 1;
        setProgress({ done: completed, total: noteIds.length });
      }
      toast.success(`${completed} PDF${completed === 1 ? "" : "s"} watermarked`);
      await qc.invalidateQueries({ queryKey: ["course-notes", course.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Watermarking failed");
    } finally {
      setWatermarking([]);
    }
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{course.name}</p>
              <p className="text-xs text-muted-foreground">{course.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the course, its notes and enrollments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Manage <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="space-y-6 border-t p-5">
            <UploadNote courseId={course.id} onUploaded={() => qc.invalidateQueries({ queryKey: ["course-notes", course.id] })} />

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4" /> Notes ({notes.length})</h4>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={watermarking.length > 0}
                  onClick={() => watermarkNotes(notes.filter((n) => n.file_type === "pdf" && !n.watermarked_at).map((n) => n.id))}
                >
                  {watermarking.length ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                  {watermarking.length ? `${progress.done}/${progress.total}` : "Watermark PDFs"}
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes uploaded yet.</p>
              ) : (
                <ul className="divide-y">
                  {notes.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="uppercase">{n.file_type}</Badge>
                        <span className="text-sm font-medium">{n.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {n.file_type === "pdf" && (
                          n.watermarked_at ? (
                            <Badge variant="outline">Watermarked</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={watermarking.length > 0}
                              onClick={() => watermarkNotes([n.id])}
                            >
                              <Stamp className="h-4 w-4" /> Apply watermark
                            </Button>
                          )
                        )}
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Allow download
                          <Switch checked={n.allow_download} onCheckedChange={(v) => toggleDownload(n.id, v)} />
                        </label>
                        <Button variant="ghost" size="icon" className="text-destructive"
                          onClick={() => deleteNote(n.id, `${course.id}/${n.id}.${n.file_type}`)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Enrollment requests ({pending.length})</h4>
              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students yet.</p>
              ) : (
                <ul className="divide-y">
                  {enrollments.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{e.profile?.name || "Student"}</p>
                        <p className="text-xs text-muted-foreground">{e.profile?.email}</p>
                      </div>
                      {e.status === "approved" ? (
                        <Badge className="bg-gold/20 text-gold-foreground">Approved</Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setEnrollment(e.id, "approved")}><Check className="h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => setEnrollment(e.id, "rejected")}><X className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function UploadNote({ courseId, onUploaded }: { courseId: string; onUploaded: () => void }) {
  const applyWatermark = useServerFn(watermarkPdf);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [allow, setAllow] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!title.trim() || !file) return toast.error("Add a title and select a file.");
    const lower = file.name.toLowerCase();
    const isDocx = lower.endsWith(".docx");
    const isPdf = lower.endsWith(".pdf");
    if (!isDocx && !isPdf) return toast.error("Only .docx or .pdf files are allowed.");
    setBusy(true);
    try {
      const fileType = isPdf ? "pdf" : "docx";
      const id = crypto.randomUUID();
      const path = `${courseId}/${id}.${fileType}`;
      const { error: upErr } = await supabase.storage.from("notes").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("notes").insert({
        id, title: sanitize(title), file_path: path, file_type: fileType,
        course_id: courseId, allow_download: allow,
      });
      if (error) throw error;
      if (isPdf) {
        await applyWatermark({ data: { noteId: id } });
        toast.success("PDF uploaded and watermarked");
      } else {
        toast.success("Note uploaded");
      }
      setTitle(""); setFile(null); setAllow(false);
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" /> Upload note</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title (e.g. Week 1 — Intro)" />
        <Input type="file" accept=".docx,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex max-w-md items-start gap-2 text-xs text-muted-foreground">
          <Switch checked={allow} onCheckedChange={setAllow} />
          <span>
            Allow students to download
            <span className="block text-[11px] leading-snug">
              OFF: Students can view this note online but the normal download and
              print controls will not be displayed.
            </span>
          </span>
        </label>
        <Button size="sm" onClick={upload} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Upload
        </Button>
      </div>
    </div>
  );
}