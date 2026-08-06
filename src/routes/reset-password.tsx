import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — The Grand Zone" },
      { name: "description", content: "Choose a new password for your The Grand Zone account." },
      { property: "og:title", content: "Reset password — The Grand Zone" },
      { property: "og:description", content: "Choose a new password for your The Grand Zone account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // The recovery link signs the user in with a temporary session; wait for it
  // before allowing the password update.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="overflow-hidden rounded-lg bg-card shadow">
        <div className="bg-primary px-6 py-8 text-primary-foreground">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-1 text-sm opacity-90">Choose a new password for your account.</p>
        </div>
        <form className="space-y-4 p-6" onSubmit={submit}>
          {!ready ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Open this page from the password reset link in your email. If you did, give it a moment to verify.
            </p>
          ) : null}
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={busy || !ready}>
            {busy ? "Please wait…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
