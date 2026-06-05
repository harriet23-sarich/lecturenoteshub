import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, BookOpen, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "register" ? "register" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Lecture Notes Portal" },
      {
        name: "description",
        content: "Log in or create your lecturer or student account.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate({ to: role === "lecturer" ? "/lecturer" : "/student" });
    }
  }, [authLoading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        if (name.trim().length < 2) {
          toast.error("Please enter your full name.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Student account created! Welcome aboard.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">Lecture Notes Portal</span>
        </Link>
        <div className="space-y-6">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Knowledge that travels with every student.
          </h1>
          <p className="max-w-md text-sidebar-foreground/70">
            Upload, organize and share lecture notes securely. Built for African
            universities and colleges.
          </p>
          <div className="flex gap-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
              <BookOpen className="h-4 w-4 text-sidebar-primary" /> Secure reading
            </div>
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
              <Users className="h-4 w-4 text-sidebar-primary" /> Enrollment control
            </div>
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Lecture Notes Portal
        </p>
      </div>

      {/* Form panel */}
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
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister
              ? "Join as a lecturer or student to get started."
              : "Sign in to access your courses and notes."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                />
              </div>
            )}
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

            {isRegister && (
              <div className="space-y-2">
                <Label>I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["student", "lecturer"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`rounded-lg border p-3 text-sm font-medium capitalize transition-all ${
                        selectedRole === r
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isRegister ? "login" : "register" }}
              className="font-semibold text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Register"}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}