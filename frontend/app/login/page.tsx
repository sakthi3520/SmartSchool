"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ============================================================
   SmartSchool - Login Page
   Same API as before: POST /auth/login  with { name, password }
   Same storage: smartschool_token + smartschool_user
   ============================================================ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Where each role goes after login
const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

// Only the username is remembered (never the password)
const REMEMBER_KEY = "smartschool_remembered_name";

// ---------- Validation ----------

type Errors = { name?: string; password?: string };

function validate(name: string, password: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = "Please enter your name or username.";
  else if (name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!password) errors.password = "Please enter your password.";
  return errors;
}

// ---------- Icons (inline SVG, no packages needed) ----------

const ICONS: Record<string, string[]> = {
  cap: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  lock: ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff: [
    "M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9",
    "M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2",
    "M14.1 14.1a3 3 0 1 1-4.2-4.2",
    "M1 1l22 22",
  ],
  check: ["M20 6L9 17l-5-5"],
  alert: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4M12 16h.01"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4M12 8h.01"],
  arrow: ["M5 12h14", "M12 5l7 7-7 7"],
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {(ICONS[name] || []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// ---------- Reusable components ----------

function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
        <Icon name="cap" className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className={`text-xl font-extrabold leading-tight tracking-tight ${dark ? "text-slate-900" : "text-white"}`}>
          SmartSchool
        </p>
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${dark ? "text-emerald-600" : "text-emerald-300"}`}>
          Learn · Teach · Grow
        </p>
      </div>
    </div>
  );
}

// A school building scene (pure SVG, no image files needed). No numbers or fake data.
function SchoolIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="login-float h-auto w-full max-w-md" aria-hidden="true">
      {/* sun */}
      <circle cx="262" cy="46" r="24" fill="#fde68a" />
      <circle cx="262" cy="46" r="34" fill="#fde68a" opacity="0.25" />
      {/* clouds */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="62" cy="48" rx="26" ry="10" />
        <ellipse cx="82" cy="40" rx="18" ry="10" />
        <ellipse cx="236" cy="96" rx="22" ry="8" opacity="0.7" />
      </g>
      {/* ground */}
      <ellipse cx="160" cy="214" rx="140" ry="14" fill="#000" opacity="0.18" />
      <rect x="20" y="196" width="280" height="14" rx="7" fill="#34d399" />
      {/* side wings */}
      <rect x="38" y="128" width="64" height="70" rx="4" fill="#e0e7ff" />
      <rect x="218" y="128" width="64" height="70" rx="4" fill="#e0e7ff" />
      {/* main building */}
      <rect x="92" y="96" width="136" height="102" rx="4" fill="#ffffff" />
      {/* roof */}
      <path d="M80 100L160 48l80 52z" fill="#818cf8" />
      <path d="M96 100L160 58l64 42z" fill="#a5b4fc" />
      {/* flag */}
      <path d="M160 48V22" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <path d="M160 22l22 7-22 7z" fill="#f43f5e" />
      {/* clock */}
      <circle cx="160" cy="80" r="10" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
      <path d="M160 74v6l4 2" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* door */}
      <path d="M148 198v-34a12 12 0 0 1 24 0v34z" fill="#6366f1" />
      <circle cx="166" cy="184" r="1.8" fill="#fde68a" />
      {/* windows */}
      <g fill="#c7d2fe">
        <rect x="104" y="118" width="22" height="24" rx="3" />
        <rect x="194" y="118" width="22" height="24" rx="3" />
        <rect x="104" y="154" width="22" height="24" rx="3" />
        <rect x="194" y="154" width="22" height="24" rx="3" />
        <rect x="50" y="144" width="16" height="20" rx="3" />
        <rect x="74" y="144" width="16" height="20" rx="3" />
        <rect x="230" y="144" width="16" height="20" rx="3" />
        <rect x="254" y="144" width="16" height="20" rx="3" />
      </g>
      {/* steps */}
      <rect x="138" y="196" width="44" height="6" rx="2" fill="#c7d2fe" />
      {/* sparkles */}
      <g fill="#fde68a">
        <path d="M30 92l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M296 150l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="login-rise mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600">
      <Icon name="alert" className="mt-px h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

function TextField({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  autoComplete,
  disabled,
  rightSlot,
  labelRight,
}: {
  id: string;
  label: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
  labelRight?: React.ReactNode;
}) {
  const inputId = `login-${id}`;
  const errorId = `${inputId}-error`;

  const state = error
    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
    : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:ring-indigo-100";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <input
          id={inputId}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-white py-3 pl-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 disabled:opacity-70 ${state} ${
            rightSlot ? "pr-12" : "pr-4"
          }`}
        />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function LoginPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<
  "admin" | "teacher" | "student"
>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [studentNamesLoading, setStudentNamesLoading] = useState(true);
  const [studentNamesError, setStudentNamesError] = useState("");

  const [touched, setTouched] = useState({ name: false, password: false });
  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successName, setSuccessName] = useState("");
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  // Blocks a second submit even if the button is pressed twice very quickly
  const submitting = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Runs every time the login page opens - including when you come back here after Logout.
  // Next.js can keep the old page state in memory (loading = true, success message),
  // which caused the endless "Redirecting..." - so we reset everything here.
  useEffect(() => {
    async function loadStudentNames() {
      try {
        const response = await fetch(`${API_URL}/auth/student-names`);
        const data = await response.json();

        if (!response.ok || !Array.isArray(data.students)) {
          throw new Error(data.message || "Unable to load student names.");
        }

        const names = data.students.filter(
          (studentName: unknown): studentName is string => typeof studentName === "string"
        );
        setStudentNames(names);
        setName((currentName) => (names.includes(currentName) ? currentName : ""));
      } catch (loadError) {
        setStudentNamesError(
          loadError instanceof Error ? loadError.message : "Unable to load student names."
        );
      } finally {
        setStudentNamesLoading(false);
      }
    }

    loadStudentNames();

    function resetPage() {
      setCurrentYear(new Date().getFullYear());
      submitting.current = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      setLoading(false);
      setSuccessName("");
      setError("");
      setPassword("");
      setShowPassword(false);
      setSubmitted(false);
      setTouched({ name: false, password: false });
    }

    resetPage();

    // Fill in the remembered username (if the user chose "Remember me" before)
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      setName(saved || "");
      setRememberMe(!!saved);
    } catch {
      // storage blocked - ignore
    }

    // Also reset when the browser restores this page from its back/forward cache
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) resetPage();
    }
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const errors = validate(name, password);
  const showNameError = touched.name || submitted ? errors.name : undefined;
  const showPasswordError = touched.password || submitted ? errors.password : undefined;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return; // already logging in

    setSubmitted(true);
    setError("");
    setShowForgotInfo(false);

    if (errors.name) {
      document.getElementById("login-name")?.focus();
      return;
    }
    if (errors.password) {
      document.getElementById("login-password")?.focus();
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          password,
          selectedRole,
        }),
      });

      // The server might answer with something that is not JSON
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status >= 500) {
          setError("Something went wrong on our server. Please try again in a few moments.");
        } else if (response.status === 429) {
          setError("Too many attempts. Please wait a moment and try again.");
        } else {
          setError(data.message || "Invalid name or password. Please check and try again.");
        }
        submitting.current = false;
        setLoading(false);
        return;
      }

      const role: string | undefined = data.user?.role;
      const destination = role ? ROLE_ROUTES[role] : undefined;
      // Verify selected role with actual backend role
if (role !== selectedRole) {
  setError(
    `You selected ${selectedRole}, but this account is registered as ${role}. Please select the correct role.`
  );
  submitting.current = false;
  setLoading(false);
  return;
}

      if (!data.token || !data.user) {
        setError("The server did not return your login details. Please try again.");
        submitting.current = false;
        setLoading(false);
        return;
      }

      // Check the role BEFORE saving anything, so an unknown role is never logged in
      if (!destination) {
        setError("Your account role is not recognized. Please contact your school administrator.");
        submitting.current = false;
        setLoading(false);
        return;
      }

      try {
        localStorage.setItem("smartschool_token", data.token);
        localStorage.setItem("smartschool_user", JSON.stringify(data.user));

        // Remember me: only the username is saved, never the password
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, name.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        setError("Your browser blocked saving the login. Please allow site storage and try again.");
        submitting.current = false;
        setLoading(false);
        return;
      }

      // Success: keep the button disabled while we redirect
      setSuccessName(data.user.name || name.trim());
      redirectTimer.current = setTimeout(() => router.push(destination), 900);
    } catch {
      setError("Cannot connect to the server. Please check your internet connection and try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  const loggedIn = !!successName;

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[6fr_5fr]">
      {/* Small animation styles used only on this page */}
      <style>{`
        @keyframes login-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes login-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .login-float { animation: login-float 5s ease-in-out infinite }
        .login-rise { animation: login-rise .4s ease-out both }
        @media (prefers-reduced-motion: reduce) {
          .login-float, .login-rise { animation: none }
        }
      `}</style>

      {/* ================= FORM PANEL ================= */}
      <section className="flex flex-col px-4 py-6 sm:px-10 lg:min-h-screen lg:px-14 lg:py-10">
        {/* Logo: dark version, shown on the form side for large screens */}
        <div className="hidden lg:block">
          <BrandLogo dark />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="login-rise w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
            <div className="mb-7">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome Back to <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">SmartSchool</span> 👋
              </h1>
              <p className="mt-2 text-slate-500">Log in to continue to your dashboard.</p>
            </div>

            {/* Success message */}
            {loggedIn && (
              <div
                role="status"
                className="login-rise mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Icon name="check" className="h-3 w-3" />
                </span>
                <span>
                  Login successful! Welcome, <strong>{successName}</strong>. Taking you to your dashboard...
                </span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="login-rise mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
              >
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleLogin} noValidate className="space-y-5">
              {/* Role Selection */}
<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Login As
  </label>

  <div className="grid grid-cols-3 gap-2">
    {([
      { role: "admin", label: "Admin", icon: "🛡️" },
      { role: "teacher", label: "Teacher", icon: "👨‍🏫" },
      { role: "student", label: "Student", icon: "🎓" },
    ] as const).map((item) => (
      <button
        key={item.role}
        type="button"
        disabled={loading}
        onClick={() => {
          setSelectedRole(item.role);
          setError("");
        }}
        className={`rounded-xl border-2 px-2 py-3 text-center transition ${
          selectedRole === item.role
            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
        }`}
      >
        <span className="block text-2xl">{item.icon}</span>
        <span className="mt-1 block text-xs font-bold">
          {item.label}
        </span>
      </button>
    ))}
  </div>
</div>
              {selectedRole === "student" && !studentNamesError ? (
                <div>
                  <label htmlFor="login-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Student Name
                  </label>
                  <div className={`relative rounded-xl border bg-white ${
                    showNameError
                      ? "border-rose-300 focus-within:ring-4 focus-within:ring-rose-100"
                      : "border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100"
                  }`}>
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon name="user" className="h-[18px] w-[18px]" />
                    </span>
                    <select
                      id="login-name"
                      value={name}
                      disabled={loading || studentNamesLoading || studentNames.length === 0}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      aria-invalid={!!showNameError}
                      aria-describedby={showNameError ? "login-name-error" : undefined}
                      autoComplete="username"
                      className="w-full appearance-none rounded-xl bg-transparent py-3 pl-11 pr-4 text-sm text-slate-800 outline-none disabled:bg-slate-50 disabled:opacity-70"
                    >
                      <option value="">
                        {studentNamesLoading
                          ? "Loading student names..."
                          : studentNames.length
                            ? "Select your name"
                            : "No student accounts found"}
                      </option>
                      {studentNames.map((studentName, index) => (
                        <option key={`${studentName}-${index}`} value={studentName}>
                          {studentName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldError id="login-name-error" message={showNameError} />
                  {!studentNamesLoading && studentNames.length === 0 && (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">
                      No student accounts are available. Please contact your school administrator.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {selectedRole === "student" && studentNamesError && (
                    <p role="alert" className="text-sm text-rose-600">
                      {studentNamesError} You can still enter your name manually.
                    </p>
                  )}
                  <TextField
                    id="name"
                    label="Name / Username"
                    icon="user"
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      setError("");
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    error={showNameError}
                    placeholder="Enter your name"
                    autoComplete="username"
                    disabled={loading}
                  />
                </>
              )}

              <TextField
                id="password"
                label="Password"
                icon="lock"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setError("");
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={showPasswordError}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
                  </button>
                }
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotInfo((s) => !s)}
                  className="text-sm font-semibold text-indigo-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {showForgotInfo && (
                <div className="login-rise flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3.5 text-sm text-indigo-800">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Password reset is not available online yet. Please contact your school
                    administrator to reset your password.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Spinner /> {loggedIn ? "Redirecting..." : "Logging in..."}
                  </>
                ) : (
                  <>
                    Login
                    <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================= BRAND / VISUAL PANEL ================= */}
      <aside className="relative order-first overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 px-6 py-6 text-white sm:px-10 lg:order-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Logo (white version) - visible on phones and tablets as the top banner */}
        <div className="relative lg:hidden">
          <BrandLogo />
        </div>

        <div className="relative hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-200 ring-1 ring-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Smart school management
          </p>
        </div>

        <div className="relative hidden lg:block">
          <div className="mb-8 flex justify-center">
            <SchoolIllustration />
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Where students, teachers
            <br />
            and schools connect.
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            Attendance, homework and everyday school life, organised in one simple and secure place.
          </p>
        </div>

        <p className="relative hidden text-sm text-indigo-200 lg:block">
          © {currentYear ?? ""} SmartSchool. All rights reserved.
        </p>
      </aside>
    </main>
  );
}