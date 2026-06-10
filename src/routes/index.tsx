import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Upload,
  ShieldCheck,
  FileText,
  Users,
  Download,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import campusAsset from "@/assets/campus-garden.png.asset.json";
const heroImg = campusAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lecture Notes Portal — Secure University Course Materials" },
      {
        name: "description",
        content:
          "A modern portal for universities and colleges: lecturers upload notes, students read them securely in the browser.",
      },
      { property: "og:title", content: "Lecture Notes Portal" },
      {
        property: "og:description",
        content: "Secure lecture notes for universities and colleges.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Upload,
    title: "Effortless uploads",
    desc: "Lecturers upload Word or PDF notes and organize them by course in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Secure reading",
    desc: "Notes open in a protected viewer with copy, save and right-click locked down.",
  },
  {
    icon: Download,
    title: "Download control",
    desc: "Toggle downloads per note. Students get files only when you allow it.",
  },
  {
    icon: Users,
    title: "Enrollment approval",
    desc: "Students request access; lecturers approve who can see each course.",
  },
  {
    icon: FileText,
    title: "Word & PDF",
    desc: "Upload .docx or .pdf — both render in a clean, full-screen reader.",
  },
  {
    icon: BookOpen,
    title: "Clean dashboards",
    desc: "Purpose-built workspaces for lecturers and students alike.",
  },
];

function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "lecturer" ? "/lecturer" : "/student" });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">Lecture Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/auth" search={{ mode: "login" }}>
                Log in
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "register" }}>
                Get started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Built for African universities
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
              Lecture notes,{" "}
              <span className="text-primary">shared securely.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              The modern way for lecturers to distribute course materials and for
              students to read them anywhere — without losing control of the files.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ mode: "register" }}>
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  I already have an account
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 to-gold/20 blur-2xl" />
            <img
              src={heroImg}
              alt="Students walking across a modern African university campus at golden hour"
              width={1600}
              height={1100}
              className="rounded-2xl border shadow-xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-foreground">
              Everything your campus needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              A focused toolkit for distributing and protecting course materials.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-sidebar px-8 py-14 text-center text-sidebar-foreground">
          <h2 className="font-display text-3xl font-bold">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-md text-sidebar-foreground/70">
            Set up your courses and share your first lecture notes today.
          </p>
          <Button size="lg" className="mt-7" asChild>
            <Link to="/auth" search={{ mode: "register" }}>
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Lecture Notes Portal. Built for universities &
        colleges.
      </footer>
    </div>
  );
}
