import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, User } from "lucide-react";
import { Protected } from "@/components/protected";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — Lecture Notes Portal" }],
  }),
  component: () => (
    <Protected>
      <DashboardLayout>
        <ProfilePage />
      </DashboardLayout>
    </Protected>
  ),
});

function ProfilePage() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const runDelete = useServerFn(deleteMyAccount);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await runDelete(undefined as never);
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      toast.error(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account details.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Account details</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={profile?.name ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={role ?? ""} readOnly className="capitalize" />
          </div>
        </div>
      </Card>

      <Card className="border-destructive/40 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          <h2 className="font-display text-lg font-semibold">Danger zone</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account, profile, and all
                related enrollments. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}