import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { registerLecturer } from "@/lib/lecturer.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/lecturer/register")({
  head: () => ({
    meta: [
      { title: "Lecturer registration — Lecture Notes Portal" },
      {
        name: "description",
        content: "Lecturers register with a private access code provided by their institution.",
      },
    ],
  }),
  component: LecturerRegister,
});

function LecturerRegister() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate({ to: role === "lecturer" ? "/lecturer" : "/student" });
    }
  }, [authLoading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setSubmitting(true);
    try {
      await registerLecturer({
        data: {
          name: name.trim(),
          email: email.trim(),
          password,
          accessCode: accessCode.trim(),
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Lecturer account created! Welcome.");
      navigate({ to: "/lecturer" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Lecture Notes Portal</span>
        </Link>
        <div className="space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Lecturer access, kept secure.
          </h1>
          <p className="max-w-md text-sidebar-foreground/70">
            Lecturer accounts are created with a private access code issued by your
            institution, so only verified staff can publish lecture notes.
          </p>
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" /> Verified staff only
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Lecture Notes Portal
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">Lecture Notes</span>
            </Link>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">
            Lecturer registration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your institution's lecturer access code to create your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Ada Lovelace"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Lecturer access code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="code"
                  className="pl-9"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Provided by your institution"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create lecturer account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Are you a student?{" "}
            <Link to="/auth" search={{ mode: "register" }} className="font-semibold text-primary hover:underline">
              Student registration
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
