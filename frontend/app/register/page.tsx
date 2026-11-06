"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ============================================================
   SmartSchool - Register Page
   Same API as before: POST /auth/register
   Body: name, age, email, mobile, address, password, role
   ============================================================ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ---------- Types ----------

type Role = "student" | "teacher";

type FormState = {
  name: string;
  age: string;
  email: string;
  mobile: string;
  address: string;
  password: string;
  confirmPassword: string;
  role: Role;
  acceptTerms: boolean;
};

type FieldName = Exclude<keyof FormState, "role">;
type Errors = Partial<Record<FieldName, string>>;

// Order used to focus the first invalid field
const FIELD_ORDER: FieldName[] = [
  "name",
  "age",
  "email",
  "mobile",
  "address",
  "password",
  "confirmPassword",
  "acceptTerms",
];

const initialForm: FormState = {
  name: "",
  age: "",
  email: "",
  mobile: "",
  address: "",
  password: "",
  confirmPassword: "",
  role: "student",
  acceptTerms: false,
};

// ---------- Validation ----------

function validate(form: FormState): Errors {
  const errors: Errors = {};

  const name = form.name.trim();
  if (!name) errors.name = "Please enter your full name.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name))
    errors.name = "Name can only contain letters and spaces.";

  const age = Number(form.age);
  if (!form.age) errors.age = "Please enter your age.";
  else if (!Number.isInteger(age) || age < 18 || age > 100)
    errors.age = "Age must be between 18 and 100.";

  const email = form.email.trim();
  if (!email) errors.email = "Please enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    errors.email = "Please enter a valid email, like you@example.com.";

  if (!form.mobile) errors.mobile = "Please enter your mobile number.";
  else if (!/^[6-9]\d{9}$/.test(form.mobile))
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";

  const address = form.address.trim();
  if (!address) errors.address = "Please enter your address.";
  else if (address.length < 5) errors.address = "Address looks too short.";

  if (!form.password) errors.password = "Please create a password.";
  else if (form.password.length < 8)
    errors.password = "Password must be at least 8 characters.";

  if (!form.confirmPassword) errors.confirmPassword = "Please re-enter your password.";
  else if (form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";

  if (!form.acceptTerms)
    errors.acceptTerms = "You must accept the Terms and Conditions.";

  return errors;
}

// Password strength: level 0 (empty) to 4 (strong) + a tip for what to add
function getStrength(password: string) {
  if (!password) return { level: 0, label: "", tip: "" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let tip = "";
  if (password.length < 8) tip = "Use at least 8 characters.";
  else if (!(/[a-z]/.test(password) && /[A-Z]/.test(password)))
    tip = "Mix uppercase and lowercase letters.";
  else if (!/\d/.test(password)) tip = "Add a number.";
  else if (!/[^A-Za-z0-9]/.test(password)) tip = "Add a symbol like ! @ # $.";
  else if (password.length < 12) tip = "A longer password is even safer.";

  if (score <= 2) return { level: 1, label: "Weak", tip };
  if (score === 3) return { level: 2, label: "Fair", tip };
  if (score === 4) return { level: 3, label: "Good", tip };
  return { level: 4, label: "Strong", tip };
}

// ---------- Icons (inline SVG, no packages needed) ----------

const ICONS: Record<string, string[]> = {
  cap: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M22 6l-10 7L2 6"],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  ],
  calendar: ["M8 2v4M16 2v4M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  pin: ["M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  lock: ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff: [
    "M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9",
    "M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2",
    "M14.1 14.1a3 3 0 1 1-4.2-4.2",
    "M1 1l22 22",
  ],
  check: ["M20 6L9 17l-5-5"],
  book: [
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  ],
  alert: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4M12 16h.01"],
  board: ["M3 4h18v12H3z", "M8 20l4-4 4 4", "M7 9h6M7 12h10"],
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

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
        <Icon name="cap" className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className={`text-xl font-extrabold leading-tight tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
          SmartSchool
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
          Learn · Teach · Grow
        </p>
      </div>
    </div>
  );
}

// A friendly book + graduation cap drawing (pure SVG, no image files needed)
function EducationIllustration() {
  return (
    <svg viewBox="0 0 260 210" className="reg-float h-auto w-full max-w-xs" aria-hidden="true">
      {/* soft glow */}
      <ellipse cx="130" cy="182" rx="95" ry="12" fill="#000" opacity="0.18" />
      {/* open book */}
      <path d="M130 78C102 62 58 62 28 74v86c30-12 74-12 102 4z" fill="#ffffff" />
      <path d="M130 78c28-16 72-16 102-4v86c-30-12-74-12-102 4z" fill="#e0e7ff" />
      <path d="M130 78v86" stroke="#a5b4fc" strokeWidth="2" />
      <g stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round">
        <path d="M46 90c20-6 46-6 70 2" />
        <path d="M46 106c20-6 46-6 70 2" />
        <path d="M46 122c20-6 46-6 70 2" />
        <path d="M144 92c24-8 50-8 70-2" />
        <path d="M144 108c24-8 50-8 70-2" />
      </g>
      {/* graduation cap */}
      <path d="M130 14l56 24-56 24-56-24z" fill="#34d399" />
      <path d="M100 52v20c14 10 46 10 60 0V52l-30 13z" fill="#10b981" />
      <path d="M186 38v26" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <circle cx="186" cy="68" r="4.5" fill="#fbbf24" />
      {/* sparkles */}
      <g fill="#fde68a">
        <path d="M30 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="M232 112l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M216 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="reg-rise mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600">
      <Icon name="alert" className="mt-px h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  autoComplete?: string;
  maxLength?: number;
  multiline?: boolean;
  rightSlot?: React.ReactNode;
};

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
  inputMode,
  autoComplete,
  maxLength,
  multiline = false,
  rightSlot,
}: TextFieldProps) {
  const inputId = `reg-${id}`;
  const errorId = `${inputId}-error`;

  const base =
    "w-full rounded-xl border bg-white py-3 pl-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4";
  const state = error
    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
    : "border-slate-200 hover:border-slate-300 focus:border-indigo-400 focus:ring-indigo-100";
  const padRight = rightSlot ? "pr-12" : "pr-4";

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span
          className={`pointer-events-none absolute left-3.5 text-slate-400 ${
            multiline ? "top-3.5" : "top-1/2 -translate-y-1/2"
          }`}
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>

        {multiline ? (
          <textarea
            id={inputId}
            rows={3}
            value={value}
            placeholder={placeholder}
            autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`${base} ${state} ${padRight} resize-none`}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            value={value}
            placeholder={placeholder}
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={`${base} ${state} ${padRight}`}
          />
        )}

        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  placeholder: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      id={id}
      label={label}
      icon="lock"
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      placeholder={placeholder}
      autoComplete={autoComplete}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
        >
          <Icon name={visible ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
        </button>
      }
    />
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { level, label, tip } = getStrength(password);
  if (!password) return null;

  const colors = ["", "bg-rose-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
  const textColors = ["", "text-rose-600", "text-amber-600", "text-lime-600", "text-emerald-600"];

  return (
    <div className="reg-rise -mt-1" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              step <= level ? colors[level] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Strength: <span className={`font-semibold ${textColors[level]}`}>{label}</span>
        {tip && <span className="text-slate-400"> · {tip}</span>}
      </p>
    </div>
  );
}

function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}) {
  const info =
    role === "student"
      ? { title: "Student", text: "Learn, track homework and attendance", icon: "book" }
      : { title: "Teacher", text: "Manage classes, students and homework", icon: "board" };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-indigo-500 bg-indigo-50/70 shadow-md shadow-indigo-100"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
          selected
            ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
            : "bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
        }`}
      >
        <Icon name={info.icon} />
      </span>
      <p className="mt-3 font-bold text-slate-800">{info.title}</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">{info.text}</p>

      <span
        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white transition-all duration-200 ${
          selected ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <Icon name="check" className="h-3 w-3" />
      </span>
    </button>
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

function SuccessPanel({ name, role }: { name: string; role: Role }) {
  return (
    <div className="reg-rise py-10 text-center" role="status">
      <div className="reg-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200">
        <Icon name="check" className="h-10 w-10" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Account created!</h2>
      <p className="mx-auto mt-2 max-w-sm text-slate-500">
        Welcome to SmartSchool, <span className="font-semibold text-slate-700">{name}</span>. Your{" "}
        {role} account is ready. Redirecting you to login...
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90"
      >
        Go to Login now
      </Link>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [emailServerError, setEmailServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop the redirect timer if the user leaves the page
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const errors = validate(form);

  // Show an error only after the field was touched or the form was submitted
  function shown(field: FieldName) {
    if (field === "email" && emailServerError) return emailServerError;
    return touched[field] || submitted ? errors[field] : undefined;
  }

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setServerError("");
    if (field === "email") setEmailServerError("");
  }

  function touch(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    setEmailServerError("");

    // Stop and focus the first invalid field
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`reg-${firstInvalid}`)?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number(form.age),
          email: form.email.trim(),
          mobile: form.mobile,
          address: form.address.trim(),
          password: form.password,
          role: form.role,
        }),
      });

      // The server might answer with something that is not JSON
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message: string = data.message || "Registration failed. Please try again.";

        // Duplicate email (or any email problem) goes under the Email field
        if (/email|already|exist|duplicate|registered/i.test(message)) {
          setEmailServerError(message);
          document.getElementById("reg-email")?.focus();
        } else {
          setServerError(message);
        }
        return;
      }

      setSuccess(true);
      redirectTimer.current = setTimeout(() => router.push("/login"), 2500);
    } catch {
      setServerError(
        "Cannot connect to the server. Please check your internet or make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(380px,5fr)_7fr]">
      {/* Small animation styles used only on this page */}
      <style>{`
        @keyframes reg-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes reg-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes reg-pop { 0% { transform: scale(0.4); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
        .reg-float { animation: reg-float 5s ease-in-out infinite }
        .reg-rise { animation: reg-rise .35s ease-out both }
        .reg-pop { animation: reg-pop .5s ease-out both }
        @media (prefers-reduced-motion: reduce) {
          .reg-float, .reg-rise, .reg-pop { animation: none }
        }
      `}</style>

      {/* ================= BRAND PANEL ================= */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 px-6 py-7 text-white sm:px-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative">
          <BrandLogo light />
        </div>

        {/* Hidden on small screens to keep the form close to the top */}
        <div className="relative hidden lg:block">
          <div className="mb-8 flex justify-center">
            <EducationIllustration />
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Smarter schooling
            <br />
            starts here.
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            One simple place for students and teachers to manage attendance, homework and
            everyday school life.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-indigo-50">
            {[
              "Quick, secure sign-up in under a minute",
              "Attendance and homework in one dashboard",
              "Built for both students and teachers",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/90 text-white">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-4 text-sm text-indigo-200 lg:mt-0">
          <span className="lg:hidden">Create your account to get started.</span>
          <span className="hidden lg:inline">© {new Date().getFullYear()} SmartSchool. All rights reserved.</span>
        </p>
      </aside>

      {/* ================= FORM PANEL ================= */}
      <section className="flex items-start justify-center px-4 py-8 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
          {success ? (
            <SuccessPanel name={form.name.trim()} role={form.role} />
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Create your account
                </h1>
                <p className="mt-2 text-slate-500">
                  Join SmartSchool by filling in your details below.
                </p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="reg-rise mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
                >
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Role selection */}
                <div>
                  <p id="role-label" className="mb-2 text-sm font-semibold text-slate-700">
                    I am registering as
                  </p>
                  <div role="radiogroup" aria-labelledby="role-label" className="grid grid-cols-2 gap-3">
                    <RoleCard
                      role="student"
                      selected={form.role === "student"}
                      onSelect={() => setField("role", "student")}
                    />
                    <RoleCard
                      role="teacher"
                      selected={form.role === "teacher"}
                      onSelect={() => setField("role", "teacher")}
                    />
                  </div>
                </div>

                <TextField
                  id="name"
                  label="Full Name"
                  icon="user"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  onBlur={() => touch("name")}
                  error={shown("name")}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    id="age"
                    label="Age"
                    icon="calendar"
                    type="number"
                    inputMode="numeric"
                    value={form.age}
                    onChange={(v) => setField("age", v)}
                    onBlur={() => touch("age")}
                    error={shown("age")}
                    placeholder="e.g. 25"
                  />
                  <TextField
                    id="mobile"
                    label="Mobile Number"
                    icon="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(v) => setField("mobile", v.replace(/\D/g, ""))}
                    onBlur={() => touch("mobile")}
                    error={shown("mobile")}
                    placeholder="10-digit number"
                    autoComplete="tel"
                  />
                </div>

                <TextField
                  id="email"
                  label="Email Address"
                  icon="mail"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(v) => setField("email", v)}
                  onBlur={() => touch("email")}
                  error={shown("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />

                <TextField
                  id="address"
                  label="Address"
                  icon="pin"
                  multiline
                  value={form.address}
                  onChange={(v) => setField("address", v)}
                  onBlur={() => touch("address")}
                  error={shown("address")}
                  placeholder="House no, street, city, state"
                  autoComplete="street-address"
                />

                <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                  <div className="space-y-3">
                    <PasswordField
                      id="password"
                      label="Password"
                      value={form.password}
                      onChange={(v) => setField("password", v)}
                      onBlur={() => touch("password")}
                      error={shown("password")}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <PasswordStrength password={form.password} />
                  </div>
                  <PasswordField
                    id="confirmPassword"
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(v) => setField("confirmPassword", v)}
                    onBlur={() => touch("confirmPassword")}
                    error={shown("confirmPassword")}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>

                {/* Terms */}
                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                    <input
                      id="reg-acceptTerms"
                      type="checkbox"
                      checked={form.acceptTerms}
                      onChange={(e) => {
                        setField("acceptTerms", e.target.checked);
                        touch("acceptTerms");
                      }}
                      aria-invalid={!!shown("acceptTerms")}
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="font-semibold text-indigo-600">Terms and Conditions</span> and{" "}
                      <span className="font-semibold text-indigo-600">Privacy Policy</span> of SmartSchool.
                    </span>
                  </label>
                  <FieldError id="reg-acceptTerms-error" message={shown("acceptTerms")} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Spinner /> Creating your account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
                  Login
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}