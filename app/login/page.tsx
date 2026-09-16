"use client";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { AuthShell, GoogleG } from "@/components/auth/AuthShell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const login = useStore((s) => s.login);
  const loginAsGoogle = useStore((s) => s.loginAsGoogle);
  const toast = useStore((s) => s.toast);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const next = sp.get("next") || "/";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    setTimeout(() => {
      const r = login(email, password);
      setBusy(false);
      if (!r.ok) {
        setErr(r.error || "Login failed");
        return;
      }
      toast("success", "Welcome back!");
      router.push(next);
    }, 350);
  };

  const google = () => {
    loginAsGoogle();
    toast("success", "Signed in with Google (demo)");
    router.push(next);
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-tm">Sign in to your StreamBox account</p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Field
          icon={<Mail size={16} />}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          icon={<Lock size={16} />}
          type={show ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          trailing={
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="text-tm hover:text-tp">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        {err && (
          <p className="rounded-btn border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] font-medium text-danger" role="alert">
            {err}
          </p>
        )}
        <Button type="submit" loading={busy} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-wider text-tm">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        onClick={google}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-btn border border-line bg-white/5 text-sm font-semibold text-tp transition-colors hover:bg-white/10"
      >
        <GoogleG />
        Continue with Google
      </button>

      <p className="mt-7 text-center text-sm text-tm">
        New here?{" "}
        <Link href={"/signup" + (next !== "/" ? `?next=${encodeURIComponent(next)}` : "")} className="font-semibold text-accent-hover hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-5 text-center text-[11px] leading-5 text-tm/70">
        Demo mode: accounts are stored locally on this device.
      </p>
    </AuthShell>
  );
}

function Field({
  icon,
  trailing,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center gap-2.5 rounded-btn border border-line bg-white/5 px-3.5 transition-colors focus-within:border-accent focus-within:shadow-glow">
        <span className="text-tm">{icon}</span>
        <input
          {...rest}
          className="h-12 w-full bg-transparent text-[14.5px] text-tp outline-none placeholder:text-tm"
        />
        {trailing}
      </div>
    </label>
  );
}
