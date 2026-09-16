"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { AuthShell, GoogleG } from "@/components/auth/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const signup = useStore((s) => s.signup);
  const loginAsGoogle = useStore((s) => s.loginAsGoogle);
  const toast = useStore((s) => s.toast);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const r = signup(name, email, password);
      setBusy(false);
      if (!r.ok) {
        setErr(r.error || "Signup failed");
        return;
      }
      toast("success", "Account created — welcome to StreamBox!");
      router.push("/");
    }, 350);
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-extrabold tracking-tight">Create account</h1>
      <p className="mt-1.5 text-sm text-tm">Your watchlist, history and more</p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Field icon={<User size={16} />} type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Field icon={<Mail size={16} />} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <div>
          <Field
            icon={<Lock size={16} />}
            type={show ? "text" : "password"}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            trailing={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="text-tm hover:text-tp">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          {password && (
            <div className="mt-2 flex items-center gap-2 px-1">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={
                      "h-1 flex-1 rounded-full transition-colors " +
                      (strength >= i ? (strength === 1 ? "bg-danger" : strength === 2 ? "bg-warning" : "bg-success") : "bg-white/10")
                    }
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-tm">
                {strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}
              </span>
            </div>
          )}
        </div>
        <Field
          icon={<Lock size={16} />}
          type={show ? "text" : "password"}
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {err && (
          <p className="rounded-btn border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] font-medium text-danger" role="alert">
            {err}
          </p>
        )}
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold uppercase tracking-wider text-tm">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        onClick={() => {
          loginAsGoogle();
          toast("success", "Signed up with Google (demo)");
          router.push("/");
        }}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-btn border border-line bg-white/5 text-sm font-semibold text-tp transition-colors hover:bg-white/10"
      >
        <GoogleG />
        Continue with Google
      </button>

      <p className="mt-7 text-center text-sm text-tm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-hover hover:underline">
          Sign in
        </Link>
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
