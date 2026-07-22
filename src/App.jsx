/* ============================================================
   TAPASVI NGO Management System — DMS v2.1
   Training Module integrated
   ============================================================ */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Users, Leaf, Scissors, Laptop, Search, LayoutDashboard, ClipboardList,
  Plus, Download, Printer, Edit2, Trash2, LogOut, Lock, User,
  ChevronRight, X, Check, MapPin, BarChart3, FileSpreadsheet,
  AlertCircle, Filter, BookOpen, Briefcase, TrendingUp,
  CheckCircle, XCircle, Clock, Award, RefreshCw, Settings as SettingsIcon,
  Building2, Palette, Database, ShieldCheck
} from "lucide-react";

/* ============================================================
   SUPABASE — TAPASVI DMS
   ============================================================ */
const supabase = createClient(
  "https://srdfsdqitsmpzjfsxkib.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZGZzZHFpdHNtcHpqZnN4a2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjQxMTQsImV4cCI6MjA5ODMwMDExNH0.LlbXgr9R-6ODYCm3rwJ2gv0F6b2lVditY4temE1flXU"
);

/* ============================================================
   CONSTANTS
   ============================================================ */
const LOGIN_PASSWORDS = { admin: "admin123", fieldworker: "tapasvi" };

const PROGRAMS = [
  { key: "rydeap", label: "RYDEAP", short: "RYDEAP", color: "#1E3A8A", tint: "#EFF6FF", icon: Laptop, idPrefix: "RYD" },
  { key: "womens", label: "Women's Empowerment", short: "Women's", color: "#F97316", tint: "#FFF7ED", icon: Scissors, idPrefix: "WOMENS" },
  { key: "waste", label: "Waste Management", short: "Waste", color: "#16A34A", tint: "#DCFCE7", icon: Leaf, idPrefix: "WSR" },
];
const PROGRAM_MAP = Object.fromEntries(PROGRAMS.map(p => [p.key, p]));


const IDENTITY_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card", placeholder: "12-digit Aadhaar number", pattern: /^\d{12}$/, hint: "12 digits" },
  { value: "voter", label: "Voter ID", placeholder: "Voter ID number", pattern: /^[A-Z]{3}\d{7}$/, hint: "e.g. ABC1234567" },
  { value: "ration", label: "Ration Card", placeholder: "Ration Card number", pattern: /.{4,}/, hint: "Minimum 4 characters" },
];

const EDUCATION_OPTIONS = ["Below 5th", "5th Class", "7th Class", "10th Class / SSC", "Intermediate / 12th", "ITI", "Diploma", "Degree / Graduate", "Post Graduate", "No Formal Education"];
const STATUS_OPTIONS = ["Registered", "Training", "Completed", "Dropped"];
const SKILL_OPTIONS = ["Tailoring", "Embroidery", "Computer / Digital Literacy", "Electrical", "Agriculture", "Mobile Repair", "Beauty & Wellness", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const CATEGORY_OPTIONS = ["SC", "ST", "BC", "OC", "Minority"];
const EMPLOYMENT_TYPE_OPTIONS = ["Job / Wage Employment", "Self Employment", "Entrepreneur"];
const ATTENDANCE_STATUS_OPTIONS = ["Present", "Absent", "Leave"];
const DISTRICTS_AP = ["Tirupati", "Chittoor", "Ananthapuramu", "YSR Kadapa", "Nellore", "Kurnool", "Guntur", "Krishna", "West Godavari", "East Godavari", "Visakhapatnam", "Other"];

/* ============================================================
   HELPERS
   ============================================================ */
function nextId(records, prefix) {
  const nums = records.filter(r => r.beneficiary_id?.startsWith(prefix + "-")).map(r => {
    const m = r.beneficiary_id?.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

// Generates a friendly one-time temporary password, e.g. "Tap@58391"
function generateTempPassword() {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `Tap@${digits}`;
}

// Aadhaar visibility per role: Super Admin sees full, Admin sees masked, Field Worker sees neither
function maskAadhaar(num) {
  if (!num) return "—";
  const digits = String(num).replace(/\D/g, "");
  if (digits.length < 4) return "XXXXXXXX";
  return "XXXXXXXX" + digits.slice(-4);
}
function aadhaarForRole(num, isSuperAdmin, isAdmin) {
  if (isSuperAdmin) return num || "—";
  if (isAdmin) return maskAadhaar(num);
  return null; // Field Worker — never show the number
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map(r => headers.map(h => {
    const s = String(r[h] ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── PDF: Individual Profile ── */
function pdfIndividual(b, aadhaarDisplay) {
  var w = window.open("", "_blank");
  if (!w) return;
  var prog = { rydeap: "RYDEAP", womens: "Womens Tailoring", waste: "Waste Management" };
  var lines = [
    "<h2>" + (b.name || "") + " - " + (prog[b.program] || b.program || "") + "</h2>",
    "<p><b>ID:</b> " + (b.beneficiary_id || "") + "</p>",
    "<p><b>Age:</b> " + (b.age || "") + " | <b>Gender:</b> " + (b.gender || "") + "</p>",
    "<p><b>Phone:</b> " + (b.phone || "") + "</p>",
    "<p><b>Aadhaar Number:</b> " + (aadhaarDisplay !== undefined ? (aadhaarDisplay || "") : (b.identity_number || b.aadhaar_number || "")) + "</p>",
    "<p><b>Education:</b> " + (b.education || "") + "</p>",
    "<p><b>House No:</b> " + (b.house_no || "—") + " | <b>Village:</b> " + (b.village || "") + " | <b>Mandal:</b> " + (b.mandal || "") + "</p>",
    "<p><b>District:</b> " + (b.district || "") + " | <b>State:</b> " + (b.state || "Andhra Pradesh") + "</p>",
    "<p><b>Category:</b> " + (b.category || "") + " | <b>Disability:</b> " + (b.disability || "No") + "</p>",
    "<p><b>Field Worker:</b> " + (b.field_worker_name || "") + "</p>",
    "<p><b>Date:</b> " + (b.registration_date || b.survey_date || "") + "</p>",
  ].join("");
  var logoUrl = window.location.origin + "/icon-512-transparent.png";
  var css = "@page{margin:90px 20px 40px 20px;} body{font-family:Arial,sans-serif;padding:0;} " +
    ".print-header{position:fixed;top:0;left:0;right:0;height:70px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #1E3A8A;padding:10px 20px;background:#fff;} " +
    ".print-header img{width:38px;height:38px;object-fit:contain;} .print-header .org{font-weight:bold;color:#1E3A8A;font-size:15px;} " +
    ".print-footer{position:fixed;bottom:0;left:0;right:0;font-size:9px;color:#999;padding:6px 20px;border-top:1px solid #ddd;background:#fff;} " +
    "h2{color:#1E3A8A;} p{margin:6px 0;font-size:13px;}";
  var headerHtml = "<div class='print-header'><img src='" + logoUrl + "'/><div class='org'>TAPASVI Society</div></div>";
  var footerHtml = "<div class='print-footer'>TAPASVI Society | Generated: " + new Date().toLocaleString("en-IN") + "</div>";
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI Profile</title><style>" + css + "</style></head><body>" + headerHtml + "<div style='margin-top:8px;'>" + lines + "</div>" + footerHtml + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}


/* ── Rich Beneficiary Report print (logo header, stats bar, full detail table) ── */
function printBeneficiaryReport(rows, programLabel, generatedByEmail) {
  var w = window.open("", "_blank");
  if (!w) return;
  var logoUrl = window.location.origin + "/icon-512-transparent.png";
  var siteHost = window.location.host;
  var total = rows.length;
  var completed = rows.filter(function(b){ return b.status === "Completed"; }).length;
  var training = rows.filter(function(b){ return b.status === "Training"; }).length;
  var registered = rows.filter(function(b){ return (b.status || "Registered") === "Registered"; }).length;
  var dropped = rows.filter(function(b){ return b.status === "Dropped"; }).length;
  var women = rows.filter(function(b){ return b.gender === "Female"; }).length;
  var men = rows.filter(function(b){ return b.gender === "Male"; }).length;

  var progMap = { rydeap: "RYDEAP", womens: "Women's Tailoring & Embroidery", waste: "Waste Management" };
  var headers = ["Registration ID","Name","Program","Age","Gender","Aadhaar Number","Registration Status","Phone","Education","Status","House No","Village","Mandal","District","State","Category","Field Worker"];
  var thead = "<tr>" + headers.map(function(h){ return "<th>" + h + "</th>"; }).join("") + "</tr>";
  var tbody = rows.map(function(b){
    var cells = [
      b.beneficiary_id || "", b.name || "", progMap[b.program] || b.program || "", b.age || "",
      b.gender || "", (b._aadhaarDisplay !== undefined ? (b._aadhaarDisplay || "—") : (b.identity_number || b.aadhaar_number || "—")),
      "Registered in " + (progMap[b.program] || b.program || ""),
      b.phone || "", b.education || "—", b.status || "Registered", b.house_no || "—",
      b.village || "—", b.mandal || "—", b.district || "—", b.state || "Andhra Pradesh",
      b.category || "—", b.field_worker_name || "—"
    ];
    return "<tr>" + cells.map(function(c){ return "<td>" + c + "</td>"; }).join("") + "</tr>";
  }).join("");

  var css = "@page{margin:150px 20px 50px 20px;} body{font-family:Arial,sans-serif;padding:0;font-size:10.5px;color:#111827;} " +
    ".print-header{position:fixed;top:0;left:0;right:0;background:#fff;padding:16px 20px 10px 20px;border-bottom:3px solid #1E3A8A;} " +
    ".ph-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;} " +
    ".ph-left{display:flex;gap:12px;align-items:center;} .ph-left img{width:50px;height:50px;object-fit:contain;} " +
    ".org-name{font-size:15px;font-weight:bold;color:#1E3A8A;line-height:1.25;max-width:420px;} " +
    ".org-sub{font-size:10px;color:#6B7280;margin-top:3px;} " +
    ".ph-right{text-align:right;} .report-title{font-size:15px;font-weight:bold;color:#1E3A8A;} " +
    ".report-meta{font-size:9.5px;color:#6B7280;margin-top:2px;} " +
    ".stats-bar{display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:#374151;font-weight:600;} " +
    "table{width:100%;border-collapse:collapse;margin-top:4px;} th{background:#1E3A8A;color:#fff;padding:5px 6px;text-align:left;font-size:9px;white-space:nowrap;} " +
    "td{border:1px solid #ddd;padding:4px 6px;font-size:9.5px;} tr:nth-child(even){background:#f9f9f9;} " +
    "thead{display:table-header-group;} " +
    ".print-footer{position:fixed;bottom:0;left:0;right:0;font-size:9px;color:#999;padding:6px 20px;border-top:1px solid #ddd;background:#fff;}";

  var headerHtml =
    "<div class='print-header'>" +
      "<div class='ph-row'>" +
        "<div class='ph-left'><img src='" + logoUrl + "'/><div><div class='org-name'>TAPASVI Society for Rural Development, Social Issues &amp; Health Organization</div>" +
        "<div class='org-sub'>Andhra Pradesh, India | " + siteHost + "</div></div></div>" +
        "<div class='ph-right'><div class='report-title'>Beneficiary Report — " + (programLabel || "All Programs") + "</div>" +
        "<div class='report-meta'>Program: " + (programLabel || "All Programs") + "</div>" +
        "<div class='report-meta'>Generated: " + new Date().toLocaleString("en-IN") + "</div>" +
        (generatedByEmail ? "<div class='report-meta'>Generated By: " + generatedByEmail + "</div>" : "") +
        "<div class='report-meta'>Total Records: " + total + "</div></div>" +
      "</div>" +
      "<div class='stats-bar'>" +
        "<span>📋 Total: " + total + "</span>" +
        "<span>✅ Completed: " + completed + "</span>" +
        "<span>📚 Training: " + training + "</span>" +
        "<span>🆕 Registered: " + registered + "</span>" +
        "<span>❌ Dropped: " + dropped + "</span>" +
        "<span>👩 Women: " + women + "</span>" +
        "<span>👨 Men: " + men + "</span>" +
      "</div>" +
    "</div>";
  var footerHtml = "<div class='print-footer'>TAPASVI Society | Generated: " + new Date().toLocaleString("en-IN") + " | Total: " + total + "</div>";

  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI - Beneficiary Report</title><style>" + css + "</style></head><body>" +
    headerHtml + "<table><thead>" + thead + "</thead><tbody>" + tbody + "</tbody></table>" + footerHtml + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}

function printTable(rows, title, cols) {
  var w = window.open("", "_blank");
  if (!w) return;
  var headers = cols || (rows.length ? Object.keys(rows[0]) : []);
  var logoUrl = window.location.origin + "/icon-512-transparent.png";
  var css = "@page{margin:90px 16px 50px 16px;} body{font-family:Arial,sans-serif;padding:0;font-size:11px;} " +
    ".print-header{position:fixed;top:0;left:0;right:0;height:70px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #1E3A8A;padding:10px 16px;background:#fff;} " +
    ".print-header img{width:38px;height:38px;object-fit:contain;} .print-header .org{font-weight:bold;color:#1E3A8A;font-size:15px;} .print-header .sub{font-size:9.5px;color:#6B7280;} " +
    ".print-footer{position:fixed;bottom:0;left:0;right:0;font-size:9px;color:#999;padding:6px 16px;border-top:1px solid #ddd;background:#fff;} " +
    "h2{color:#374151;font-size:13px;margin:0 0 6px 0;} table{width:100%;border-collapse:collapse;} th{background:#1E3A8A;color:white;padding:5px 7px;text-align:left;font-size:10px;} " +
    "td{border:1px solid #ddd;padding:4px 7px;} tr:nth-child(even){background:#f9f9f9;} thead{display:table-header-group;}";
  var thead = "<tr>" + headers.map(function(h){ return "<th>" + h + "</th>"; }).join("") + "</tr>";
  var tbody = rows.map(function(r){ return "<tr>" + headers.map(function(h){ return "<td>" + (r[h] || "") + "</td>"; }).join("") + "</tr>"; }).join("");
  var headerHtml = "<div class='print-header'><img src='" + logoUrl + "'/><div><div class='org'>TAPASVI Society</div><div class='sub'>" + title + "</div></div></div>";
  var footerHtml = "<div class='print-footer'>TAPASVI Society | Generated: " + new Date().toLocaleString("en-IN") + " | Total: " + rows.length + "</div>";
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI - " + title + "</title><style>" + css + "</style></head><body>" + headerHtml + "<div style='margin-top:8px;'><h2>" + title + "</h2><table><thead>" + thead + "</thead><tbody>" + tbody + "</tbody></table></div>" + footerHtml + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}


/* ============================================================
   UI ATOMS
   ============================================================ */

function Logo({ size = 40, style }) {
  return (
    <img src="/icon-512-transparent.png" alt="TAPASVI" width={size} height={size}
      style={{ objectFit: "contain", display: "block", ...style }} />
  );
}

const inputCls = "w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:text-[#9CA3AF]";
const selectCls = inputCls + " appearance-none cursor-pointer";

function Field({ label, required, error, hint, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-[12.5px] font-semibold text-[#111827] mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </span>
      {hint && <span className="block text-[11px] text-[#888] mb-1.5">{hint}</span>}
      {children}
      {error && <span className="block text-[11.5px] text-red-600 mt-1">⚠ {error}</span>}
    </label>
  );
}

function Input({ className, ...props }) {
  return <input {...props} className={className || inputCls} />;
}

function Select({ options, placeholder, className, ...props }) {
  return (
    <select {...props} className={className || selectCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {(options || []).map(o => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Badge({ label, color, tint }) {
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: tint, color }}>{label}</span>;
}

function StatCard({ icon: Icon, label, value, color, tint, sub }) {
  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 flex items-center gap-3.5" style={{ borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: tint }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-[22px] font-bold text-[#111827] leading-none">{value}</p>
        <p className="text-[12px] text-[#6B7280] mt-1">{label}</p>
        {sub && <p className="text-[11px] text-[#999] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Toast({ message, type = "success", onDone }) {
  useEffect(() => { const id = setTimeout(onDone, 3000); return () => clearTimeout(id); }, [onDone]);
  return (
    <div className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-[13px] shadow-xl"
      style={{ background: type === "error" ? "#B71C1C" : type === "info" ? "#0369A1" : "#1E3A8A", color: "#fff", animation: "fadein .2s ease" }}>
      {type === "error" ? <AlertCircle size={15} /> : <Check size={15} />} {message}
    </div>
  );
}

function SectionHeader({ title, color = "#1E3A8A" }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>{title}</span>
      <div className="flex-1 h-px bg-[#F3F4F6]" />
    </div>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState(() => localStorage.getItem("tapasvi_remember_user") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("tapasvi_remember_user"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("tapasvi_login_theme") === "dark");
  const [ripples, setRipples] = useState([]);

  const toggleDark = () => {
    setDark(d => {
      localStorage.setItem("tapasvi_login_theme", !d ? "dark" : "light");
      return !d;
    });
  };

  const addRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const id = Date.now();
    const ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size: Math.max(rect.width, rect.height) * 1.6 };
    setRipples(r => [...r, ripple]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 600);
  };

  const finishLogin = (payload) => {
    setSuccess(true);
    setTimeout(() => onLogin(payload), 650);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError("Please enter username and password."); return; }
    setLoading(true); setError("");

    if (remember) localStorage.setItem("tapasvi_remember_user", username.trim());
    else localStorage.removeItem("tapasvi_remember_user");

    if (role === "admin") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: username.trim(), password });
      if (authError || !data.user) {
        await supabase.from("audit_logs").insert({ user_email: username.trim(), action: "LOGIN_FAILED", module: "Auth", details: "Invalid email or password (Admin login attempt)", created_at: new Date().toISOString() });
        setError("Invalid email or password."); setLoading(false); return;
      }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", data.user.id).single();
      if (!roleData || (roleData.role !== "admin" && roleData.role !== "super_admin")) {
        await supabase.from("audit_logs").insert({ user_email: data.user.email, action: "LOGIN_FAILED", module: "Auth", details: "Access denied — not an admin role", created_at: new Date().toISOString() });
        await supabase.auth.signOut(); setError("Access denied. Admin only."); setLoading(false); return;
      }
      await supabase.from("app_users").update({ last_login: new Date().toISOString() }).eq("email", data.user.email);
      await supabase.from("audit_logs").insert({ user_email: data.user.email, action: "LOGIN", module: "Auth", details: `Logged in as ${roleData.role === "super_admin" ? "Super Admin" : "Admin"}`, created_at: new Date().toISOString() });
      setLoading(false);
      finishLogin({ role: roleData.role, username: data.user.email, supabaseUser: data.user });
      return;
    } else {
      // Field Worker: check username + password against app_users table
      const { data: fwData, error: fwError } = await supabase
        .from("app_users")
        .select("id, full_name, role, status, password_hash, must_change_password")
        .eq("full_name", username.trim())
        .eq("role", "fieldworker")
        .single();
      if (fwError || !fwData) {
        await supabase.from("audit_logs").insert({ user_email: username.trim(), action: "LOGIN_FAILED", module: "Auth", details: "Field Worker not found", created_at: new Date().toISOString() });
        setError("User not found. Contact your Admin.");
        setLoading(false); return;
      }
      if (fwData.status !== "active") {
        const statusMsg = fwData.status === "suspended" ? "Your account has been suspended. Contact Admin." : "Your account is inactive. Contact Admin.";
        await supabase.from("audit_logs").insert({ user_email: fwData.full_name, action: "LOGIN_FAILED", module: "Auth", details: `Login attempt while account ${fwData.status}`, created_at: new Date().toISOString() });
        setError(statusMsg);
        setLoading(false); return;
      }
      if (!fwData.password_hash || fwData.password_hash !== password) {
        await supabase.from("audit_logs").insert({ user_email: fwData.full_name, action: "LOGIN_FAILED", module: "Auth", details: "Incorrect password", created_at: new Date().toISOString() });
        setError("Incorrect password.");
        setLoading(false); return;
      }
      await supabase.from("app_users").update({ last_login: new Date().toISOString() }).eq("id", fwData.id);
      await supabase.from("audit_logs").insert({ user_email: fwData.full_name, action: "LOGIN", module: "Auth", details: "Logged in as Field Worker", created_at: new Date().toISOString() });
      setLoading(false);
      finishLogin({ role: "fieldworker", username: fwData.full_name, mustChangePassword: !!fwData.must_change_password, userId: fwData.id });
      return;
    }
  };

  const authCss = `
    @keyframes tp-fadeInUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
    @keyframes tp-shake { 10%,90%{transform:translateX(-1px);} 20%,80%{transform:translateX(2px);} 30%,50%,70%{transform:translateX(-4px);} 40%,60%{transform:translateX(4px);} }
    @keyframes tp-scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
    @keyframes tp-ripple { from { transform: scale(0); opacity: 0.35; } to { transform: scale(1); opacity: 0; } }
    @keyframes tp-check { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }
    .tp-fade-up { animation: tp-fadeInUp 0.5s ease both; }
    .tp-scale-in { animation: tp-scaleIn 0.4s ease both; }
    .tp-shake { animation: tp-shake 0.4s ease; }
    .tp-input-glow:focus-within { box-shadow: 0 0 0 4px rgba(22,163,74,0.16), 0 0 18px rgba(30,58,138,0.12); }
    .tp-field-input::placeholder { color: ${dark ? "#6B7280" : "#9CA3AF"}; opacity: 1; }
    .tp-theme-icon { display: inline-block; transition: transform 0.4s ease; }
    @keyframes tp-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
    .tp-particle { animation: tp-float 6s ease-in-out infinite; }
    .tp-ripple-span { position:absolute; border-radius:9999px; background:#fff; pointer-events:none; animation: tp-ripple 0.6s ease-out; }
    .tp-check-circle { animation: tp-scaleIn 0.35s ease both; }
    .tp-check-path { stroke-dasharray: 48; stroke-dashoffset: 48; animation: tp-check 0.4s 0.15s ease forwards; }
  `;
  const dc = dark
    ? { pageBg: "linear-gradient(150deg,#060B18 0%,#0B1220 22%,#0E1E1A 55%,#0A1A2E 78%,#081018 100%)", cardBg: "rgba(17,24,39,0.72)", cardBorder: "rgba(255,255,255,0.08)", text: "#F3F4F6", subtext: "#9CA3AF", inputBg: "rgba(31,41,55,0.7)", inputBorder: "#374151", inputText: "#F3F4F6" }
    : { pageBg: "linear-gradient(135deg,#EFF6FF 0%,#F0FDF4 60%,#ECFDF5 100%)", cardBg: "rgba(255,255,255,0.72)", cardBorder: "rgba(255,255,255,0.6)", text: "#111827", subtext: "#6B7280", inputBg: "rgba(255,255,255,0.8)", inputBorder: "#E5E7EB", inputText: "#111827" };

  if (showForgot) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif", background: dc.pageBg }}>
        <style>{authCss}</style>
        <div className="w-full max-w-[420px] tp-scale-in rounded-[24px] p-6" style={{ background: dc.cardBg, backdropFilter: "blur(16px)", border: `1px solid ${dc.cardBorder}`, boxShadow: "0 20px 50px -12px rgba(30,58,138,0.25)" }}>
          <p className="text-[15px] font-bold mb-3" style={{ color: dc.text }}>Forgot Password</p>
          <p className="text-[12.5px] leading-relaxed mb-5" style={{ color: dc.subtext }}>
            For security, only a <b>Super Admin</b> can reset your password. Please contact your Super Admin — they will set a new temporary password for you, and you'll be asked to change it on your next login.
          </p>
          <button onClick={() => setShowForgot(false)} className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white transition hover:opacity-90" style={{ background: "linear-gradient(90deg,#1E3A8A,#16A34A)" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const HeroPanel = (
    <div className="hidden lg:flex flex-col justify-center px-14 relative w-1/2 min-h-screen text-white" style={{ background: "linear-gradient(160deg,#1E3A8A 0%,#15803D 100%)" }}>
      <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 500 150" preserveAspectRatio="none">
        <path d="M0,80 C150,150 350,0 500,80 L500,150 L0,150 Z" fill="#ffffff" />
      </svg>
      <div className="relative tp-fade-up">
        <Logo size={56} />
        <h1 className="mt-5 text-[30px] font-bold leading-tight">TAPASVI Society</h1>
        <p className="text-[14px] text-white/80 mt-2 max-w-[360px]">Society for Rural Development, Social Issues &amp; Health</p>
        <div className="w-14 h-1 rounded-full bg-white/50 my-6" />
        <p className="text-[15px] text-white/90 max-w-[380px] leading-relaxed">
          Empowering rural communities through skill training, livelihood programs, and grassroots development — one beneficiary at a time.
        </p>
        <p className="text-[11px] text-white/60 mt-8 tracking-wide">DIGITAL NGO MANAGEMENT SYSTEM · v2.0</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden transition-colors duration-300" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif", background: dc.pageBg }}>
      <style>{authCss}</style>

      {/* Theme toggle */}
      <button onClick={toggleDark} aria-label="Toggle dark mode"
        className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
        style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(10px)", color: dc.text }}>
        <span className="tp-theme-icon" style={{ transform: dark ? "rotate(180deg)" : "rotate(0deg)" }}>{dark ? "☀️" : "🌙"}</span>
      </button>

      {/* Success overlay */}
      {success && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)" }}>
          <div className="tp-check-circle bg-white rounded-3xl px-8 py-7 flex flex-col items-center gap-3 shadow-2xl">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" fill="none" stroke="#16A34A" strokeWidth="3" />
              <path className="tp-check-path" d="M15 27 L22 34 L37 18" fill="none" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13.5px] font-bold text-[#111827]">Signed in successfully</p>
          </div>
        </div>
      )}

      {/* subtle ambient mesh glow */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: dark ? "#16A34A" : "#4ADE80", opacity: dark ? 0.12 : 0.18, filter: "blur(80px)" }} />
      <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full pointer-events-none" style={{ background: dark ? "#1E3A8A" : "#3B82F6", opacity: dark ? 0.14 : 0.15, filter: "blur(90px)" }} />

      {/* very light floating particles — dark mode only, for subtle depth */}
      {dark && [
        { top: "18%", left: "12%", size: 4, delay: "0s", color: "#4ADE80" },
        { top: "30%", left: "82%", size: 3, delay: "1.2s", color: "#60A5FA" },
        { top: "62%", left: "8%", size: 3, delay: "2.4s", color: "#4ADE80" },
        { top: "75%", left: "88%", size: 4, delay: "0.8s", color: "#60A5FA" },
        { top: "48%", left: "50%", size: 2.5, delay: "1.8s", color: "#4ADE80" },
      ].map((p, i) => (
        <span key={i} className="tp-particle absolute rounded-full pointer-events-none" style={{ top: p.top, left: p.left, width: p.size, height: p.size, background: p.color, opacity: 0.35, animationDelay: p.delay, filter: "blur(0.5px)" }} />
      ))}

      {/* subtle background waves — mobile + desktop right panel */}
      <svg className="absolute top-0 right-0 w-full lg:w-1/2 h-64 opacity-30 pointer-events-none" viewBox="0 0 500 200" preserveAspectRatio="none">
        <path d="M0,60 C120,120 380,0 500,60 L500,0 L0,0 Z" fill={dark ? "#1E3A8A" : "#BFDBFE"} />
      </svg>
      <svg className="absolute bottom-0 right-0 w-full lg:w-1/2 h-48 opacity-30 pointer-events-none" viewBox="0 0 500 150" preserveAspectRatio="none">
        <path d="M0,90 C160,20 340,150 500,80 L500,150 L0,150 Z" fill={dark ? "#166534" : "#BBF7D0"} />
      </svg>

      {HeroPanel}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center gap-2.5 mb-6 tp-fade-up lg:hidden">
            <Logo size={128} style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))" }} />
            <h1 className="text-[30px] font-extrabold text-center leading-none tracking-wide"
              style={{ backgroundImage: "linear-gradient(90deg,#16A34A,#22C55E,#4ADE80)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "0.04em" }}>
              TAPASVI
            </h1>
            <div className="flex items-center flex-wrap justify-center gap-x-2 gap-y-1.5 mt-1">
              <div className="flex items-center gap-2 rounded-full"
                style={{
                  padding: "9px 22px",
                  background: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${dark ? "rgba(74,222,128,0.28)" : "rgba(22,163,74,0.22)"}`,
                  boxShadow: "0 0 14px rgba(34,197,94,0.16)",
                }}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#4ADE80" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#16A34A" }} />
                </span>
                <span className="text-[11.5px] font-medium tracking-wide" style={{ color: dc.text }}>Digital NGO Management System</span>
              </div>
              <span className="text-[9.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: dark ? "rgba(22,163,74,0.18)" : "#DCFCE7", color: "#16A34A", boxShadow: "0 0 8px rgba(34,197,94,0.18)" }}>
                v2.0
              </span>
            </div>
          </div>

          <form onSubmit={submit} className="tp-fade-up rounded-[28px] p-6 transition-colors duration-300" style={{ background: dc.cardBg, backdropFilter: "blur(20px)", border: `1px solid ${dc.cardBorder}`, boxShadow: "0 25px 60px -15px rgba(30,58,138,0.28)", animationDelay: "0.1s" }}>
            <p className="text-[19px] font-bold" style={{ color: dc.text }}>👋 Welcome Back</p>
            <p className="text-[12.5px] mb-5" style={{ color: dc.subtext }}>Sign in to continue</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[["admin", "Admin", Lock], ["fieldworker", "Field Worker", User]].map(([r, label, Icon]) => (
                <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r} aria-label={`Sign in as ${label}`}
                  className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[13px] font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
                  style={role === r ? { background: "linear-gradient(90deg,#1E3A8A,#16A34A)", color: "#fff", borderColor: "transparent", boxShadow: "0 4px 12px -2px rgba(30,58,138,0.4)" } : { borderColor: dc.inputBorder, color: dc.subtext, background: dc.inputBg }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            <div className="mb-3">
              <label htmlFor="tp-username" className="text-[12px] font-medium mb-1 block" style={{ color: dc.subtext }}>{role === "admin" ? "Email" : "Full Name"}</label>
              <div className="group relative tp-input-glow rounded-xl transition-shadow">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 group-focus-within:text-[#16A34A]" style={{ color: dc.subtext }} />
                <input id="tp-username" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder={role === "admin" ? "admin@tapasvi.org" : "మీ పూర్తి పేరు టైప్ చేయండి"}
                  inputMode={role === "admin" ? "email" : "text"}
                  aria-label={role === "admin" ? "Email" : "Full Name"}
                  className="tp-field-input w-full rounded-xl pl-10 pr-3.5 py-3 text-[13.5px] outline-none transition"
                  style={{ background: dc.inputBg, border: `1px solid ${dc.inputBorder}`, color: dc.inputText }} />
              </div>
            </div>

            <div className="mb-1">
              <label htmlFor="tp-password" className="text-[12px] font-medium mb-1 block" style={{ color: dc.subtext }}>Password</label>
              <div className="group relative tp-input-glow rounded-xl transition-shadow">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 group-focus-within:text-[#16A34A]" style={{ color: dc.subtext }} />
                <input id="tp-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  aria-label="Password"
                  className="tp-field-input w-full rounded-xl pl-10 pr-14 py-3 text-[13.5px] outline-none transition"
                  style={{ background: dc.inputBg, border: `1px solid ${dc.inputBorder}`, color: dc.inputText }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#1E3A8A] px-1.5 transition-all duration-200"
                  style={{ transform: "translateY(-50%) scale(1)" }}>
                  <span key={showPassword ? "hide" : "show"} className="tp-scale-in inline-block">{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="tp-shake mt-3 rounded-xl px-3.5 py-2.5 flex items-start gap-2" role="alert" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                <AlertCircle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
                <p className="text-[12px] text-[#DC2626] font-medium">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 mb-1">
              <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none" style={{ color: dc.subtext }}>
                <span className="relative inline-flex items-center justify-center w-[22px] h-[22px] rounded-md transition-all duration-200"
                  style={{ background: remember ? "linear-gradient(135deg,#1E3A8A,#16A34A)" : "transparent", border: remember ? "none" : `1.5px solid ${dc.inputBorder}` }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} aria-label="Remember Me" className="absolute inset-0 opacity-0 cursor-pointer" />
                  {remember && <Check size={14} className="tp-scale-in text-white" strokeWidth={3} />}
                </span>
                Remember Me
              </label>
              <button type="button" onClick={() => setShowForgot(true)} className="text-[12px] font-semibold transition-all hover:underline" style={{ color: "#60A5FA" }}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" onClick={addRipple} disabled={loading} aria-label="Sign In"
              className="group relative overflow-hidden w-full rounded-xl py-3.5 text-[14.5px] font-bold mt-3 text-white flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-8px_rgba(22,163,74,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ background: loading ? "#9CA3AF" : "linear-gradient(90deg,#1E3A8A,#16A34A)", boxShadow: loading ? "none" : "0 8px 20px -6px rgba(30,58,138,0.45)" }}>
              {ripples.map(r => (
                <span key={r.id} className="tp-ripple-span" style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size }} />
              ))}
              {loading ? (<><RefreshCw size={16} className="animate-spin" /> Signing in…</>) : (
                <>Sign In <span className="inline-block w-0 opacity-0 -translate-x-1 transition-all duration-300 group-hover:w-4 group-hover:opacity-100 group-hover:translate-x-0 group-active:w-4 group-active:opacity-100">→</span></>
              )}
            </button>

            <p className="text-[10.5px] text-center mt-3 tracking-wide" style={{ color: dc.subtext }}>
              Secure Access for Authorized Users
            </p>
          </form>

          <div className="mt-5 text-center tp-fade-up" style={{ animationDelay: "0.2s" }}>
            <p className="text-[10.5px] flex items-center justify-center gap-1.5" style={{ color: dc.subtext }}>
              <ShieldCheck size={12} className="text-[#16A34A]" /> Secure Login · 256-bit SSL Protected
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: dark ? "#6B7280" : "#9CA3AF" }}>
              TAPASVI DMS v2.0 · © {new Date().getFullYear()} TAPASVI Society
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FORCE CHANGE PASSWORD (first login with temporary password)
   ============================================================ */
function ChangePasswordScreen({ user, onDone, onCancel }) {
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!tempPassword || !newPassword || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New password and confirmation do not match."); return; }
    setLoading(true);
    const { data: fwData, error: fetchError } = await supabase.from("app_users").select("password_hash").eq("id", user.userId).single();
    if (fetchError || !fwData || fwData.password_hash !== tempPassword) {
      setError("Temporary password is incorrect."); setLoading(false); return;
    }
    const { error: updateError } = await supabase.from("app_users")
      .update({ password_hash: newPassword, must_change_password: false })
      .eq("id", user.userId);
    if (updateError) { setError("Error: " + updateError.message); setLoading(false); return; }
    await supabase.from("audit_logs").insert({ user_email: user.username, action: "PASSWORD_CHANGED", module: "Auth", details: "Password changed after first login with temporary password", created_at: new Date().toISOString() });
    setLoading(false);
    onDone();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] px-4 py-10" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif" }}>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <Logo size={54} />
          <h1 className="mt-3 text-[18px] font-bold text-[#111827] text-center">Change Your Password</h1>
          <p className="text-[12px] text-[#6B7280] text-center mt-1">You're using a temporary password. Please set a new one to continue.</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-md p-6">
          <Field label="Temporary Password" required>
            <input type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)} className={inputCls} placeholder="Enter the temporary password" />
          </Field>
          <Field label="New Password" required>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="At least 6 characters" />
          </Field>
          <Field label="Confirm New Password" required error={error}>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Re-enter new password" />
          </Field>
          <button type="submit" onClick={submit} disabled={loading} className="w-full rounded-lg py-3 text-[14px] font-bold mt-2" style={{ background: loading ? "#888" : "#16A34A", color: "#fff" }}>
            {loading ? "Updating…" : "Change Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   BENEFICIARY FORM
   ============================================================ */
function BeneficiaryForm({ editing, onSave, onCancel, currentUser, beneficiaries, dynPrograms, dynProgramsLoading, dynProgramsError }) {
  const today = new Date().toISOString().slice(0, 10);
  const blank = {
    program: "rydeap", registration_date: today,
    name: "", age: "", gender: "Female", phone: "",
    identity_type: "aadhaar", identity_number: "",
    education: "", house_no: "", village: "", mandal: "",
    district: "Tirupati", state: "Andhra Pradesh",
    category: "BC", disability: "No", shg: "No", skill_interest: "",
    field_worker_name: "", notes: "",
    aadhaar_number: "", aadhaar_verified: "No", ekyc_status: "No",
  };

  const [form, setForm] = useState(editing ? { ...blank, ...editing } : {
    ...blank,
    field_worker_name: currentUser.role === "fieldworker" ? currentUser.username : "",
  });
  const [errors, setErrors] = useState({});

  // Phase 2: Program dropdown is sourced from the dynamic `programs` table (active only, sorted by display_order).
  // If that fetch failed or hasn't returned anything yet, fall back to the static PROGRAMS list so registration
  // never breaks — this keeps old beneficiary records and existing behavior working exactly as before.
  const usingDynamicPrograms = !dynProgramsLoading && !dynProgramsError && dynPrograms && dynPrograms.length > 0;
  const resolvedPrograms = useMemo(() => {
    if (usingDynamicPrograms) {
      return dynPrograms.map(p => ({
        key: p.key, label: p.program_name, short: p.program_name,
        color: p.color || "#1E3A8A", tint: (p.color || "#1E3A8A") + "18",
        icon: PROGRAM_ICON_MAP[p.icon] || ClipboardList,
        idPrefix: p.registration_prefix,
      }));
    }
    return PROGRAMS; // fallback: network error, empty table not yet checked, or still loading
  }, [usingDynamicPrograms, dynPrograms]);
  const resolvedProgramMap = useMemo(() => Object.fromEntries(resolvedPrograms.map(p => [p.key, p])), [resolvedPrograms]);
  const noActiveProgramsAvailable = !dynProgramsLoading && !dynProgramsError && dynPrograms && dynPrograms.length === 0;

  const [activeProgram, setActiveProgram] = useState(editing?.program || "");
  // Once the program list resolves, default to the first available program (registration only — editing keeps its own program)
  useEffect(() => {
    if (!editing && !activeProgram && resolvedPrograms.length > 0) {
      setActiveProgram(resolvedPrograms[0].key);
    }
  }, [editing, activeProgram, resolvedPrograms]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const identityInfo = IDENTITY_TYPES.find(i => i.value === form.identity_type) || IDENTITY_TYPES[0];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.age || form.age < 1 || form.age > 120) e.age = "Valid age required (1-120)";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!/^\d{10}$/.test(form.phone)) e.phone = "Must be 10 digits";
    if (!form.identity_number.trim()) e.identity_number = "Document number required";
    else if (!identityInfo.pattern.test(form.identity_number)) {
      e.identity_number = `Invalid format. ${identityInfo.hint}`;
    } else {
      const dup = beneficiaries.find(b =>
        b.identity_type === form.identity_type &&
        b.identity_number === form.identity_number &&
        b.program === activeProgram &&
        b.beneficiary_id !== editing?.beneficiary_id
      );
      if (dup) e.identity_number = `Already registered: ${dup.name} (${dup.beneficiary_id})`;
    }
    if (!form.village.trim()) e.village = "Required";
    if (!form.mandal.trim()) e.mandal = "Required";
    if (!form.field_worker_name.trim()) e.field_worker_name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    if (!validate()) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* non-fatal */ }
    onSave({
      ...form, program: activeProgram,
      aadhaar_number: form.identity_type === "aadhaar" ? form.identity_number : (form.aadhaar_number || ""),
    });
  };

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 6;
  const STEP_LABELS = ["Personal", "Address", "Education", "Program", "Identity", "Review"];
  const p = resolvedProgramMap[activeProgram] || resolvedPrograms[0] || { color: "#1E3A8A", tint: "#EFF6FF", label: "" };

  // Auto-save draft (new registrations only) — pure UX convenience, no schema change, no effect on submit logic.
  const DRAFT_KEY = "tapasvi_beneficiary_draft";
  useEffect(() => {
    if (editing) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(f => ({ ...f, ...parsed.form }));
        if (parsed.activeProgram) setActiveProgram(parsed.activeProgram);
      }
    } catch (_) { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (editing) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, activeProgram })); } catch (_) { /* storage full/unavailable — non-fatal */ }
  }, [form, activeProgram, editing]);

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.name.trim()) e.name = "Required";
      if (!form.age || form.age < 1 || form.age > 120) e.age = "Valid age required (1-120)";
      if (!form.phone.trim()) e.phone = "Required";
      else if (!/^\d{10}$/.test(form.phone)) e.phone = "Must be 10 digits";
    } else if (s === 2) {
      if (!form.village.trim()) e.village = "Required";
      if (!form.mandal.trim()) e.mandal = "Required";
    } else if (s === 4) {
      if (!form.field_worker_name.trim()) e.field_worker_name = "Required";
    } else if (s === 5) {
      if (!form.identity_number.trim()) e.identity_number = "Document number required";
      else if (!identityInfo.pattern.test(form.identity_number)) e.identity_number = `Invalid format. ${identityInfo.hint}`;
      else {
        const dup = beneficiaries.find(b =>
          b.identity_type === form.identity_type && b.identity_number === form.identity_number &&
          b.program === activeProgram && b.beneficiary_id !== editing?.beneficiary_id
        );
        if (dup) e.identity_number = `Already registered: ${dup.name} (${dup.beneficiary_id})`;
      }
    }
    setErrors(prev => ({ ...prev, ...e, ...Object.fromEntries(Object.keys(prev).filter(k => !e[k]).map(k => [k, undefined])) }));
    return Object.keys(e).length === 0;
  };

  const goNext = () => { if (validateStep(step)) setStep(s => Math.min(TOTAL_STEPS, s + 1)); };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const jump = (s) => setStep(s);

  const StepDot = ({ n, label }) => {
    const active = step === n;
    const done = step > n;
    return (
      <button type="button" onClick={() => jump(n)} className="flex flex-col items-center gap-1 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
          style={active ? { background: p.color, color: "#fff", boxShadow: `0 0 0 4px ${p.color}22` } : done ? { background: p.color + "22", color: p.color } : { background: "#F3F4F6", color: "#9CA3AF" }}>
          {done ? "✓" : n}
        </div>
        <span className="text-[9px] font-medium truncate max-w-full" style={{ color: active ? p.color : "#9CA3AF" }}>{label}</span>
      </button>
    );
  };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Beneficiary" : "New Registration"}</h2>
            <p className="text-[11.5px] text-[#6B7280]">Step {step} of {TOTAL_STEPS} · {STEP_LABELS[step - 1]}</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
      </div>

      {!editing && dynProgramsLoading && (
        <div className="flex items-center justify-center gap-2 mb-4 py-6 text-[#6B7280] text-[12.5px]">
          <RefreshCw size={14} className="animate-spin" /> Loading programs...
        </div>
      )}

      {!editing && !dynProgramsLoading && noActiveProgramsAvailable && (
        <div className="mb-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12.5px] text-[#92400E]">
          No active programs available. Please ask a Super Admin to activate a program in Settings → Program Management.
        </div>
      )}

      {(editing || (!dynProgramsLoading && !noActiveProgramsAvailable)) && (
      <>
        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: p.color }} />
          </div>
          <div className="flex gap-1">
            {STEP_LABELS.map((label, i) => <StepDot key={label} n={i + 1} label={label} />)}
          </div>
        </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-5 min-h-[340px]">

          {step === 1 && (
            <>
              {!editing && resolvedPrograms.length > 0 && (
                <>
                  <SectionHeader title="Select Program" color={p.color} />
                  <div className="flex flex-wrap gap-2 mb-4">
                    {resolvedPrograms.map(pr => { const Icon = pr.icon; return (
                      <button key={pr.key} type="button" onClick={() => setActiveProgram(pr.key)}
                        className="flex flex-col items-center gap-1.5 rounded-xl border py-3 px-3 text-[11.5px] font-semibold transition flex-1 min-w-[90px]"
                        style={activeProgram === pr.key ? { background: pr.tint, borderColor: pr.color, color: pr.color } : { borderColor: "#E5E7EB", color: "#6B7280", background: "white" }}>
                        <Icon size={18} />{pr.short}
                      </button>
                    );})}
                  </div>
                </>
              )}
              <SectionHeader title="Personal Information" color={p.color} />
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Beneficiary Name" required error={errors.name}>
                  <Input value={form.name} onChange={set("name")} placeholder="Full name" autoFocus />
                </Field>
                <Field label="Gender" required>
                  <Select value={form.gender} onChange={set("gender")} options={["Male", "Female", "Other"]} />
                </Field>
                <Field label="Age" required error={errors.age}>
                  <Input type="number" min="1" max="120" value={form.age} onChange={set("age")} placeholder="Years" inputMode="numeric" />
                </Field>
                <Field label="Mobile Number" required error={errors.phone}>
                  <Input value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10-digit mobile" inputMode="numeric" />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <SectionHeader title="Address" color={p.color} />
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="House No">
                  <Input value={form.house_no || ""} onChange={set("house_no")} placeholder="e.g. 4-6" />
                </Field>
                <Field label="Village" required error={errors.village}>
                  <Input value={form.village} onChange={set("village")} placeholder="Village name" />
                </Field>
                <Field label="Mandal" required error={errors.mandal}>
                  <Input value={form.mandal} onChange={set("mandal")} placeholder="Mandal name" />
                </Field>
                <Field label="District">
                  <Select value={form.district} onChange={set("district")} options={DISTRICTS_AP} />
                </Field>
                <Field label="State">
                  <Input value="Andhra Pradesh" readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionHeader title="Social Information" color={p.color} />
              <div className="grid grid-cols-3 gap-x-4">
                <Field label="Category">
                  <Select value={form.category} onChange={set("category")} options={["SC", "ST", "BC", "OC", "Minority"]} />
                </Field>
                <Field label="Disability">
                  <Select value={form.disability} onChange={set("disability")} options={["No", "Yes"]} />
                </Field>
                <Field label="SHG Member">
                  <Select value={form.shg} onChange={set("shg")} options={["No", "Yes"]} />
                </Field>
              </div>
              <SectionHeader title="Education & Skills" color={p.color} />
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Education">
                  <Select value={form.education} onChange={set("education")} options={EDUCATION_OPTIONS} placeholder="Select education level" />
                </Field>
                <Field label="Skill Interest">
                  <Select value={form.skill_interest} onChange={set("skill_interest")} options={SKILL_OPTIONS} placeholder="Select area of interest" />
                </Field>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <SectionHeader title="Program Details" color={p.color} />
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Registration ID" hint="Auto-generated">
                  <Input value={editing?.beneficiary_id || "Auto"} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono text-[12px]"} />
                </Field>
                <Field label="Registration Date">
                  <Input value={form.registration_date} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
                </Field>
                <Field label="Program">
                  <Input value={p.label} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
                </Field>
                <Field label="Field Worker" required error={errors.field_worker_name}>
                  <Input value={form.field_worker_name}
                    onChange={currentUser.role === "fieldworker" ? undefined : set("field_worker_name")}
                    readOnly={currentUser.role === "fieldworker"}
                    className={currentUser.role === "fieldworker" ? inputCls + " bg-[#F3F4F6] text-[#6B7280]" : inputCls} />
                </Field>
              </div>
              <p className="text-[10.5px] text-[#6B7280] mt-2">ℹ Training batch enrollment happens after registration, from Training → Enroll.</p>
            </>
          )}

          {step === 5 && (
            <>
              <SectionHeader title="Identity Proof" color={p.color} />
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] p-4 mb-2">
                <div className="grid grid-cols-2 gap-x-4">
                  <Field label="Document Type" required>
                    <Select value={form.identity_type} onChange={set("identity_type")}
                      options={IDENTITY_TYPES.map(i => ({ value: i.value, label: i.label }))} />
                  </Field>
                  <Field label="Document Number" required error={errors.identity_number} hint={identityInfo.hint}>
                    <Input value={form.identity_number}
                      onChange={e => setForm(f => ({ ...f, identity_number: e.target.value.trim().toUpperCase() }))}
                      placeholder={identityInfo.placeholder}
                      inputMode={form.identity_type === "aadhaar" ? "numeric" : "text"} />
                  </Field>
                </div>
              </div>

              <Field label="Notes">
                <textarea value={form.notes || ""} onChange={set("notes")} rows={2} className={inputCls} placeholder="Field worker observations..." />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <SectionHeader title="Review & Submit" color={p.color} />
              <div className="space-y-3">
                {[
                  { label: "Personal Information", step: 1, rows: [["Name", form.name], ["Gender", form.gender], ["Age", form.age], ["Mobile", form.phone]] },
                  { label: "Address", step: 2, rows: [["House No", form.house_no], ["Village", form.village], ["Mandal", form.mandal], ["District", form.district]] },
                  { label: "Education & Social", step: 3, rows: [["Category", form.category], ["Education", form.education], ["Skill Interest", form.skill_interest]] },
                  { label: "Program Details", step: 4, rows: [["Program", p.label], ["Field Worker", form.field_worker_name], ["Registration Date", form.registration_date]] },
                  { label: "Identity Proof", step: 5, rows: [["Document Type", identityInfo.label], ["Document Number", form.identity_number]] },
                ].map(section => (
                  <div key={section.label} className="rounded-xl border border-[#E5E7EB] p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] font-bold text-[#111827]">{section.label}</p>
                      <button type="button" onClick={() => jump(section.step)} className="text-[11px] font-semibold" style={{ color: p.color }}>Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {section.rows.map(([k, v]) => (
                        <div key={k} className="text-[11px]"><span className="text-[#9CA3AF]">{k}: </span><span className="text-[#111827] font-medium">{v || "—"}</span></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

        <div className="sticky bottom-0 px-5 py-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack} className="rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-white">
              Previous
            </button>
          )}
          {step < TOTAL_STEPS && (
            <button type="button" onClick={goNext} className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold text-white ml-auto" style={{ background: p.color }}>
              Next
            </button>
          )}
          {step === TOTAL_STEPS && (
            <button type="submit" onClick={submit} className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold text-white ml-auto" style={{ background: p.color }}>
              {editing ? "Update Record" : "Save Registration"}
            </button>
          )}
          <button type="button" onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-5 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-white">Cancel</button>
        </div>
      </form>
      </>
      )}
    </div>
  );
}

function TrainingForm({ editing, onSave, onCancel, beneficiaries }) {
  const blank = {
    beneficiary_id: "", course_name: "", trainer_name: "", center: "",
    start_date: "", end_date: "", attendance_pct: "", certificate_issued: "No", notes: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.beneficiary_id) e.beneficiary_id = "Required";
    if (!form.course_name.trim()) e.course_name = "Required";
    if (!form.trainer_name.trim()) e.trainer_name = "Required";
    if (!form.center.trim()) e.center = "Required";
    if (!form.start_date) e.start_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => { e.preventDefault(); if (validate()) onSave(form); };

  return (
    <div className="max-w-[680px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Training Record" : "Add Training Record"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Beneficiary" required error={errors.beneficiary_id}>
            <Select value={form.beneficiary_id} onChange={set("beneficiary_id")}
              options={beneficiaries.map(b => ({ value: b.beneficiary_id, label: `${b.beneficiary_id} — ${b.name}` }))}
              placeholder="Select beneficiary" />
          </Field>
          <Field label="Course Name" required error={errors.course_name}>
            <Input value={form.course_name} onChange={set("course_name")} placeholder="e.g. Digital Literacy" />
          </Field>
          <Field label="Trainer Name" required error={errors.trainer_name}>
            <Input value={form.trainer_name} onChange={set("trainer_name")} />
          </Field>
          <Field label="Training Center" required error={errors.center}>
            <Input value={form.center} onChange={set("center")} />
          </Field>
          <Field label="Start Date" required error={errors.start_date}>
            <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls} />
          </Field>
          <Field label="End Date">
            <input type="date" value={form.end_date} onChange={set("end_date")} className={inputCls} />
          </Field>
          <Field label="Attendance %" hint="0–100">
            <Input type="number" min="0" max="100" value={form.attendance_pct} onChange={set("attendance_pct")} placeholder="e.g. 85" />
          </Field>
          <Field label="Certificate Issued">
            <Select value={form.certificate_issued} onChange={set("certificate_issued")} options={["No", "Yes"]} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={set("notes")} rows={2} className={inputCls} />
        </Field>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button type="submit" onClick={submit} className="rounded-lg px-6 py-2.5 text-[13px] font-bold" style={{ background: "#1E3A8A", color: "#fff" }}>Save</button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   EMPLOYMENT FORM
   ============================================================ */
function EmploymentForm({ editing, onSave, onCancel, beneficiaries }) {
  const blank = { beneficiary_id: "", employment_type: "Job / Wage Employment", job_role: "", monthly_income: "", employer: "", status: "Active", notes: "" };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.beneficiary_id) e.beneficiary_id = "Required";
    if (!form.job_role.trim()) e.job_role = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => { e.preventDefault(); if (validate()) onSave(form); };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Employment Record" : "Add Employment Record"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Beneficiary" required error={errors.beneficiary_id}>
            <Select value={form.beneficiary_id} onChange={set("beneficiary_id")}
              options={beneficiaries.map(b => ({ value: b.beneficiary_id, label: `${b.beneficiary_id} — ${b.name}` }))}
              placeholder="Select beneficiary" />
          </Field>
          <Field label="Employment Type">
            <Select value={form.employment_type} onChange={set("employment_type")} options={EMPLOYMENT_TYPE_OPTIONS} />
          </Field>
          <Field label="Job Role / Designation" required error={errors.job_role}>
            <Input value={form.job_role} onChange={set("job_role")} placeholder="e.g. Tailor, Data Entry Operator" />
          </Field>
          <Field label="Employer / Business Name">
            <Input value={form.employer} onChange={set("employer")} />
          </Field>
          <Field label="Monthly Income (₹)">
            <Input type="number" value={form.monthly_income} onChange={set("monthly_income")} placeholder="0" />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")} options={["Active", "Inactive", "Changed Job"]} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={set("notes")} rows={2} className={inputCls} />
        </Field>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button type="submit" onClick={submit} className="rounded-lg px-6 py-2.5 text-[13px] font-bold" style={{ background: "#16A34A", color: "#fff" }}>Save</button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   VILLAGE MASTER FORM
   ============================================================ */
function VillageForm({ editing, onSave, onCancel }) {
  const blank = { village_name: "", mandal: "", district: "Tirupati", population: "", total_beneficiaries: 0 };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.village_name.trim()) e.village_name = "Required";
    if (!form.mandal.trim()) e.mandal = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Village" : "Add Village to Master"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Village Name" required error={errors.village_name}>
            <Input value={form.village_name} onChange={set("village_name")} />
          </Field>
          <Field label="Mandal" required error={errors.mandal}>
            <Input value={form.mandal} onChange={set("mandal")} />
          </Field>
          <Field label="District">
            <Select value={form.district} onChange={set("district")} options={DISTRICTS_AP} />
          </Field>
          <Field label="Population (approx.)">
            <Input type="number" value={form.population} onChange={set("population")} />
          </Field>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={() => { if (validate()) onSave(form); }} className="rounded-lg px-6 py-2.5 text-[13px] font-bold" style={{ background: "#16A34A", color: "#fff" }}>Save Village</button>
          <button onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ beneficiaries, training, employment, villages, isAdmin, currentUser, onQuickAction }) {
  const total = beneficiaries.length;
  const women = beneficiaries.filter(b => b.gender === "Female").length;
  const youth = beneficiaries.filter(b => b.gender !== "Female").length;
  const trained = training.length;
  const certIssuedLegacy = training.filter(t => t.certificate_issued === "Yes").length;
  const employed = employment.filter(e => e.status === "Active").length;
  const completionRate = total > 0 ? Math.round((beneficiaries.filter(b => b.status === "Completed").length / total) * 100) : 0;
  const employmentRate = total > 0 ? Math.round((employed / total) * 100) : 0;

  const byProgram = useMemo(() => {
    const m = {};
    PROGRAMS.forEach(p => m[p.key] = 0);
    beneficiaries.forEach(b => m[b.program] = (m[b.program] || 0) + 1);
    return m;
  }, [beneficiaries]);

  const byVillage = useMemo(() => {
    const m = {};
    beneficiaries.forEach(b => { if (b.village) m[b.village] = (m[b.village] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [beneficiaries]);

  const byStatus = useMemo(() => {
    const m = {};
    STATUS_OPTIONS.forEach(s => m[s] = 0);
    beneficiaries.forEach(b => { if (b.status) m[b.status] = (m[b.status] || 0) + 1; });
    return m;
  }, [beneficiaries]);

  const statusColors = { Registered: "#1E3A8A", Training: "#F97316", Completed: "#16A34A", Dropped: "#D32F2F" };
  const maxVillage = Math.max(1, ...byVillage.map(v => v[1]));

  // Live counts this component fetches for itself — doesn't touch any other module's data flow.
  const [batches, setBatches] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [assessmentMarks, setAssessmentMarks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [fieldWorkerCount, setFieldWorkerCount] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => {
      const [bt, ar, am, ct, us] = await Promise.all([
        supabase.from("batch_trainings").select("*"),
        supabase.from("assessment_records").select("*"),
        supabase.from("assessment_marks").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "fieldworker"),
      ]);
      setBatches(bt.data || []);
      setAssessmentRecords(ar.data || []);
      setAssessmentMarks(am.data || []);
      setCertificates(ct.data || []);
      setFieldWorkerCount(us.count || 0);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const activeTrainings = batches.filter(b => b.status === "Ongoing").length;
  const completedTrainings = batches.filter(b => b.status === "Completed").length;
  const certsIssued = certificates.filter(c => c.status === "Active").length;
  const villagesCovered = villages.length;

  const thisMonth = now.toISOString().slice(0, 7);
  const newBeneficiariesThisMonth = beneficiaries.filter(b => (b.registration_date || "").slice(0, 7) === thisMonth).length;
  const newTrainingsThisMonth = batches.filter(b => (b.start_date || "").slice(0, 7) === thisMonth).length;
  const newAssessmentsThisMonth = assessmentRecords.filter(a => (a.assessment_date || "").slice(0, 7) === thisMonth).length;
  const newCertsThisMonth = certificates.filter(c => (c.certificate_date || "").slice(0, 7) === thisMonth).length;
  const newPlacementsThisMonth = employment.filter(e => (e.created_at || "").slice(0, 7) === thisMonth).length;

  // Greeting
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const friendlyMessages = ["Welcome back!", "Have a productive day!", "Let's make a difference today!"];
  const [friendlyMsg] = useState(() => friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)]);
  const roleLabel = currentUser?.role === "super_admin" ? "Super Admin" : currentUser?.role === "admin" ? "Admin" : "Field Worker";
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  // Charts (reuse MiniBarChart / MiniDonut from the Reports module)
  const programDonut = useMemo(() => PROGRAMS.map(p => ({ label: p.short, count: byProgram[p.key] || 0 })).filter(x => x.count > 0), [byProgram]);
  const beneficiaryGrowth = useMemo(() => {
    const m = reportsGroupBy(beneficiaries, b => monthKey(b.registration_date));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
  }, [beneficiaries]);
  const monthlyTrainings = useMemo(() => {
    const m = reportsGroupBy(batches, b => monthKey(b.start_date));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
  }, [batches]);
  const assessmentResults = useMemo(() => ([
    { label: "Pass", count: assessmentMarks.filter(m => m.result === "Pass").length },
    { label: "Fail", count: assessmentMarks.filter(m => m.result === "Fail").length },
  ].filter(x => x.count > 0)), [assessmentMarks]);
  const certificateTrend = useMemo(() => {
    const m = reportsGroupBy(certificates, c => monthKey(c.certificate_date));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
  }, [certificates]);
  const placementTrend = useMemo(() => {
    const m = reportsGroupBy(employment, e => monthKey(e.created_at));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label)).slice(-6);
  }, [employment]);

  const SUMMARY = [
    { label: "Total Beneficiaries", value: total, delta: newBeneficiariesThisMonth, icon: Users, grad: ["#1E3A8A", "#3B82F6"] },
    { label: "Active Trainings", value: activeTrainings, delta: newTrainingsThisMonth, icon: BookOpen, grad: ["#DB2777", "#F472B6"] },
    { label: "Completed Trainings", value: completedTrainings, icon: CheckCircle, grad: ["#16A34A", "#4ADE80"] },
    { label: "Assessments", value: assessmentRecords.length, delta: newAssessmentsThisMonth, icon: ClipboardList, grad: ["#F97316", "#FB923C"] },
    { label: "Certificates Issued", value: certsIssued, delta: newCertsThisMonth, icon: Award, grad: ["#7C3AED", "#A78BFA"] },
    { label: "Placements", value: employed, delta: newPlacementsThisMonth, icon: Briefcase, grad: ["#0EA5E9", "#38BDF8"] },
    { label: "Field Workers", value: fieldWorkerCount, icon: Users, grad: ["#DC2626", "#F87171"] },
    { label: "Villages Covered", value: villagesCovered, icon: MapPin, grad: ["#16A34A", "#22C55E"] },
  ];

  const QUICK_ACTIONS = [
    { key: "beneficiary", label: "Add Beneficiary", icon: Users, color: "#1E3A8A" },
    { key: "training", label: "Create Training", icon: BookOpen, color: "#DB2777" },
    { key: "attendance", label: "Mark Attendance", icon: CheckCircle, color: "#16A34A" },
    { key: "assessment", label: "New Assessment", icon: ClipboardList, color: "#F97316" },
    { key: "certificate", label: "Generate Certificate", icon: Award, color: "#7C3AED" },
    { key: "employment", label: "Placement", icon: Briefcase, color: "#0EA5E9" },
    { key: "reports", label: "Reports", icon: BarChart3, color: "#DC2626" },
  ];

  return (
    <div>
      {/* Greeting banner */}
      <div className="rounded-2xl p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
        <div className="flex items-center gap-3 relative z-10">
          <Logo size={38} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold">👋 {timeGreeting}, {currentUser?.username || "there"}</p>
            <p className="text-[11px] text-white/80">{roleLabel} · {friendlyMsg}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20 relative z-10">
          <p className="text-[10.5px] text-white/85">{dateStr}</p>
          <p className="text-[10.5px] font-semibold text-white/95">{timeStr}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {SUMMARY.map(s => (
          <div key={s.label} className="rounded-2xl p-3.5 text-white relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: `linear-gradient(135deg,${s.grad[0]},${s.grad[1]})` }}>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">
              <s.icon size={15} />
            </div>
            <p className="text-[20px] font-bold leading-none">{s.value}</p>
            <p className="text-[10px] text-white/85 mt-1.5 leading-tight">{s.label}</p>
            {s.delta > 0 && (
              <p className="text-[9.5px] text-white/90 mt-1 flex items-center gap-0.5"><TrendingUp size={10} /> +{s.delta} this month</p>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-2.5">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {QUICK_ACTIONS.map(a => (
            <button key={a.key} onClick={() => onQuickAction && onQuickAction(a.key)}
              className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex flex-col items-center gap-1.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color + "1A" }}>
                <a.icon size={14} style={{ color: a.color }} />
              </div>
              <span className="text-[9.5px] font-medium text-[#374151] text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Beneficiary Growth</h3>
          <MiniBarChart data={beneficiaryGrowth} color="#1E3A8A" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Program Distribution</h3>
          <MiniDonut data={programDonut} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Monthly Trainings</h3>
          <MiniBarChart data={monthlyTrainings} color="#DB2777" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Assessment Results</h3>
          <MiniDonut data={assessmentResults} colors={["#16A34A", "#DC2626"]} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Certificate Trend</h3>
          <MiniBarChart data={certificateTrend} color="#7C3AED" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold text-[#111827] mb-3">Placement Trend</h3>
          <MiniBarChart data={placementTrend} color="#0EA5E9" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {/* Women vs Youth */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-4">Gender Split</h3>
          <div className="flex items-end gap-4 h-28">
            {[["Women", women, "#F97316"], ["Youth (M)", youth, "#1E3A8A"]].map(([label, count, color]) => (
              <div key={label} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[16px] font-bold text-[#111827]">{count}</span>
                <div className="w-full rounded-t-lg" style={{ height: `${Math.max(8, (count / Math.max(1, total)) * 80)}px`, background: color }} />
                <span className="text-[11px] text-[#6B7280]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Program wise */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-4">Program-wise Beneficiaries</h3>
          <div className="space-y-3">
            {PROGRAMS.map(p => (
              <div key={p.key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                  <p.icon size={14} style={{ color: p.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#111827]">{p.short}</span>
                    <span className="text-[12px] font-bold" style={{ color: p.color }}>{byProgram[p.key] || 0}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${total ? ((byProgram[p.key] || 0) / total) * 100 : 0}%`, background: p.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-4">Training Status</h3>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map(s => (
              <div key={s} className="rounded-lg p-3 flex items-center justify-between" style={{ background: statusColors[s] + "18" }}>
                <span className="text-[12px] font-medium" style={{ color: statusColors[s] }}>{s}</span>
                <span className="text-[18px] font-bold" style={{ color: statusColors[s] }}>{byStatus[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Village wise */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-4">Village-wise Performance</h3>
            {byVillage.length === 0 ? <p className="text-[12px] text-[#AAA]">No data yet.</p> : byVillage.map(([v, c]) => (
              <div key={v} className="flex items-center gap-3 py-1.5">
                <span className="text-[12px] text-[#111827] w-28 shrink-0 truncate">{v}</span>
                <div className="flex-1 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                  <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${(c / maxVillage) * 100}%` }} />
                </div>
                <span className="text-[12px] font-bold text-[#111827] w-6 text-right">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   BENEFICIARY LIST
   ============================================================ */
function BeneficiaryList({ beneficiaries, isAdmin, isSuperAdmin, onEdit, onDelete, onExport, onPrint, onAddPrograms, onViewProfile, onPrintProfile, dynPrograms }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");

  // Phase 2 follow-up: filter dropdown + badges must reflect the dynamic program list too,
  // otherwise beneficiaries registered under a new program (e.g. "Kids education") become unfilterable.
  // Merge dynamic programs with the static list so nothing is ever missing, and also include any
  // program key that only exists on actual beneficiary records (safety net for older/edge-case data).
  const resolvedPrograms = useMemo(() => {
    const base = (dynPrograms && dynPrograms.length > 0)
      ? dynPrograms.map(p => ({
          key: p.key, label: p.program_name, short: p.program_name,
          color: p.color || "#1E3A8A", tint: (p.color || "#1E3A8A") + "18",
          icon: PROGRAM_ICON_MAP[p.icon] || ClipboardList,
        }))
      : PROGRAMS;
    const known = new Set(base.map(p => p.key));
    const extras = [...new Set(beneficiaries.map(b => b.program))].filter(k => k && !known.has(k))
      .map(k => ({ key: k, label: k, short: k, color: "#6B7280", tint: "#F3F4F6", icon: ClipboardList }));
    return [...base, ...extras];
  }, [dynPrograms, beneficiaries]);
  const resolvedProgramMap = useMemo(() => Object.fromEntries(resolvedPrograms.map(p => [p.key, p])), [resolvedPrograms]);

  const fieldWorkerOptions = useMemo(() => {
    return [...new Set(beneficiaries.map(b => b.field_worker_name).filter(Boolean))].sort();
  }, [beneficiaries]);

  const filtered = useMemo(() => {
    let r = beneficiaries;
    if (programFilter !== "all") r = r.filter(b => b.program === programFilter);
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (workerFilter !== "all") r = r.filter(b => b.field_worker_name === workerFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(b => b.name?.toLowerCase().includes(q) || b.beneficiary_id?.toLowerCase().includes(q) || b.phone?.includes(q) || b.village?.toLowerCase().includes(q) || b.field_worker_name?.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [beneficiaries, query, programFilter, statusFilter, workerFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Beneficiary Records</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} records shown</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onExport(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#111827] hover:bg-white">
              <FileSpreadsheet size={13} /> Export CSV
            </button>
            <button onClick={() => onPrint(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#111827] hover:bg-white">
              <Printer size={13} /> List PDF
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID, phone, village..." className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Programs</option>
          {resolvedPrograms.map(p => <option key={p.key} value={p.key}>{p.short}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isAdmin && fieldWorkerOptions.length > 0 && (
          <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
            <option value="all">All Field Workers</option>
            {fieldWorkerOptions.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ClipboardList size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No records match your search.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(b => {
            const p = resolvedProgramMap[b.program] || resolvedPrograms[0] || { color: "#6B7280", tint: "#F3F4F6", short: b.program, icon: ClipboardList };
            const Icon = p.icon;
            return (
              <div key={b.beneficiary_id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderLeft: `4px solid ${p.color}` }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                    <Icon size={16} style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[13.5px] text-[#111827]">{b.name}</span>
                      <Badge label={p.short} color={p.color} tint={p.tint} />
                      <Badge label={b.status || "Registered"} color={statusColors[b.status] || "#16A34A"} tint={(statusColors[b.status] || "#16A34A") + "18"} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#6B7280] space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-[#1E3A8A] font-bold">{b.beneficiary_id}</span>
                        {b.age && <span>{b.age} yrs{b.gender ? `, ${b.gender}` : ""}</span>}
                        {(b.identity_number || b.aadhaar_number) && aadhaarForRole(b.identity_number || b.aadhaar_number, isSuperAdmin, isAdmin) && (
                          <span className="text-[10.5px] bg-[#F3F4F6] px-1.5 py-0.5 rounded font-mono">
                            {aadhaarForRole(b.identity_number || b.aadhaar_number, isSuperAdmin, isAdmin)}
                          </span>
                        )}
                      </div>
                      {(b.village || b.mandal) && (
                        <div className="flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          <span>{[b.village, b.mandal].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        {b.phone && <span>📞 {b.phone}</span>}
                        {b.field_worker_name && <span>👤 {b.field_worker_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {onViewProfile && (
                      <button onClick={() => onViewProfile(b)} title="View Profile"
                        className="px-2.5 py-1.5 rounded-lg text-[#1E3A8A] bg-[#EFF6FF] flex items-center gap-1 text-[11px] font-semibold">
                        <User size={12} /> Profile
                      </button>
                    )}
                    <div className="flex gap-1">
                      {onAddPrograms && (
                        <button onClick={() => onAddPrograms(b)} title="Add to other programs"
                          className="p-1.5 rounded-lg text-[#16A34A] hover:bg-[#DCFCE7]">
                          <Plus size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => (onPrintProfile ? onPrintProfile(b) : pdfIndividual(b))} title="PDF"
                          className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]">
                          <Download size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => onEdit(b)} className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => onDelete(b)} className="p-1.5 rounded-lg text-[#F97316] hover:bg-[#FFF7ED]">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const statusColors = { Registered: "#1E3A8A", Training: "#F97316", Completed: "#16A34A", Dropped: "#D32F2F" };

/* ============================================================
   TRAINING LIST
   ============================================================ */
/* ============================================================
   TRAINING MODULE — TAPASVI DMS
   Complete Training Management System
   ============================================================ */

const TRAINING_TYPES = ["Skill Development","Awareness","Vocational","Technical","Livelihood","Health","Other"];
const TRAINING_STATUS = ["Upcoming","Ongoing","Completed","Cancelled"];

// Auto-generate certificate number
function genCertNo(trainingId, beneficiaryId) {
  const d = new Date();
  return `CERT/${d.getFullYear()}/${String(trainingId).slice(-4)}/${String(beneficiaryId).slice(-4)}`;
}

// Training status color
function trainingStatusColor(status) {
  const colors = { Upcoming: "#1E3A8A", Ongoing: "#F97316", Completed: "#16A34A", Cancelled: "#DC2626" };
  const tints  = { Upcoming: "#EFF6FF", Ongoing: "#FFF7ED", Completed: "#DCFCE7", Cancelled: "#FEF2F2" };
  return { color: colors[status] || "#6B7280", tint: tints[status] || "#F3F4F6" };
}

/* ── TRAINING DASHBOARD STATS ──────────────────────────────── */
function TrainingDashboard({ batches, enrollments }) {
  const total     = batches.length;
  const upcoming  = batches.filter(b => b.status === "Upcoming").length;
  const ongoing   = batches.filter(b => b.status === "Ongoing").length;
  const completed = batches.filter(b => b.status === "Completed").length;
  const totalPart = enrollments.length;
  const withAttendance = enrollments.filter(e => e.attendance_pct !== null && e.attendance_pct !== undefined);
  const avgAttendance = withAttendance.length > 0 ? Math.round(withAttendance.reduce((s, e) => s + Number(e.attendance_pct || 0), 0) / withAttendance.length) : null;

  // Self-fetched, scoped to the batches this user can see — doesn't touch any existing query.
  const [assessmentsCompleted, setAssessmentsCompleted] = useState(null);
  const [certificatesIssued, setCertificatesIssued] = useState(null);
  const batchIds = useMemo(() => batches.map(b => b.batch_id), [batches]);

  useEffect(() => {
    if (batchIds.length === 0) { setAssessmentsCompleted(0); setCertificatesIssued(0); return; }
    (async () => {
      const [{ data: ar }, { data: ct }] = await Promise.all([
        supabase.from("assessment_records").select("id, batch_id, status").in("batch_id", batchIds),
        supabase.from("certificates").select("id, batch_id, status").in("batch_id", batchIds),
      ]);
      setAssessmentsCompleted((ar || []).filter(a => a.status === "Completed").length);
      setCertificatesIssued((ct || []).filter(c => c.status === "Active").length);
    })();
  }, [batchIds]);

  const stats = [
    { label: "Total Trainings", value: total, icon: BookOpen, grad: ["#1E3A8A", "#3B82F6"] },
    { label: "Active Trainings", value: ongoing, icon: TrendingUp, grad: ["#F97316", "#FB923C"] },
    { label: "Upcoming Trainings", value: upcoming, icon: Clock, grad: ["#6366F1", "#818CF8"] },
    { label: "Completed Trainings", value: completed, icon: CheckCircle, grad: ["#16A34A", "#4ADE80"] },
    { label: "Total Enrollments", value: totalPart, icon: Users, grad: ["#0EA5E9", "#38BDF8"] },
    { label: "Attendance %", value: avgAttendance !== null ? avgAttendance + "%" : "—", icon: ClipboardList, grad: ["#DB2777", "#F472B6"] },
    { label: "Assessments Completed", value: assessmentsCompleted ?? "…", icon: Award, grad: ["#7C3AED", "#A78BFA"] },
    { label: "Certificates Issued", value: certificatesIssued ?? "…", icon: CheckCircle, grad: ["#16A34A", "#22C55E"] },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="rounded-[20px] p-4 text-white relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ background: `linear-gradient(135deg,${s.grad[0]},${s.grad[1]})` }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2.5">
            <s.icon size={16} />
          </div>
          <p className="text-[21px] font-bold leading-none">{s.value}</p>
          <p className="text-[10.5px] text-white/85 mt-1.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ── BATCH TRAINING FORM ────────────────────────────────────── */
function BatchTrainingForm({ editing, onSave, onCancel, dynPrograms }) {
  const blank = {
    training_name: "", program: "rydeap", trainer_name: "", training_type: "Skill Development",
    venue: "", start_date: "", end_date: "", max_capacity: "", description: "", status: "Upcoming",
    assigned_field_worker: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  // Phase 3: Program dropdown sourced from the dynamic `programs` table (active only).
  // Falls back to the static PROGRAMS list if the dynamic fetch hasn't loaded / failed —
  // keeps existing training records and this form working exactly as before either way.
  const resolvedPrograms = useMemo(() => {
    if (dynPrograms && dynPrograms.length > 0) {
      return dynPrograms.map(p => ({
        key: p.key, label: p.program_name, short: p.program_name,
        color: p.color || "#1E3A8A", tint: (p.color || "#1E3A8A") + "18",
        icon: PROGRAM_ICON_MAP[p.icon] || ClipboardList,
      }));
    }
    return PROGRAMS;
  }, [dynPrograms]);
  const resolvedProgramMap = useMemo(() => Object.fromEntries(resolvedPrograms.map(p => [p.key, p])), [resolvedPrograms]);

  // If editing an older record whose program isn't in the active list (e.g. now inactive), keep it selectable
  // so the existing training record can still be viewed/edited without forcing a change.
  const programOptions = useMemo(() => {
    if (editing && editing.program && !resolvedProgramMap[editing.program]) {
      return [{ value: editing.program, label: `${editing.program} (inactive)` }, ...resolvedPrograms.map(p => ({ value: p.key, label: p.short }))];
    }
    return resolvedPrograms.map(p => ({ value: p.key, label: p.short }));
  }, [resolvedPrograms, resolvedProgramMap, editing]);

  const validate = () => {
    const e = {};
    if (!form.training_name.trim()) e.training_name = "Required";
    if (!form.trainer_name.trim()) e.trainer_name = "Required";
    if (!form.venue.trim()) e.venue = "Required";
    if (!form.start_date) e.start_date = "Required";
    if (form.end_date && form.end_date < form.start_date) e.end_date = "End date must be after start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => { e.preventDefault(); if (validate()) onSave(form); };
  const p = resolvedProgramMap[form.program] || PROGRAM_MAP[form.program] || resolvedPrograms[0] || PROGRAMS[0];

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div>
          <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Training" : "Create Training"}</h2>
          <p className="text-[12px] text-[#6B7280]">Training Module</p>
        </div>
      </div>
      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Training Details" color="#1E3A8A" />
          <div className="grid grid-cols-2 gap-x-4">
            <div className="col-span-2">
              <Field label="Training Name" required error={errors.training_name}>
                <Input value={form.training_name} onChange={set("training_name")} placeholder="e.g. Digital Literacy Batch 1" />
              </Field>
            </div>
            <Field label="Program" required>
              <Select value={form.program} onChange={set("program")}
                options={programOptions} />
            </Field>
            <Field label="Training Type">
              <Select value={form.training_type} onChange={set("training_type")} options={TRAINING_TYPES} />
            </Field>
            <Field label="Trainer Name" required error={errors.trainer_name}>
              <Input value={form.trainer_name} onChange={set("trainer_name")} placeholder="Trainer full name" />
            </Field>
            <Field label="Assigned Field Worker" hint="Only this Field Worker can enroll & mark attendance for this training">
              <Input value={form.assigned_field_worker || ""} onChange={set("assigned_field_worker")} placeholder="Field Worker's full name" />
            </Field>
            <Field label="Venue" required error={errors.venue}>
              <Input value={form.venue} onChange={set("venue")} placeholder="Training center / location" />
            </Field>
            <Field label="Start Date" required error={errors.start_date}>
              <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls} />
            </Field>
            <Field label="End Date" error={errors.end_date}>
              <input type="date" value={form.end_date} onChange={set("end_date")} className={inputCls} />
            </Field>
            <Field label="Maximum Capacity">
              <Input type="number" value={form.max_capacity} onChange={set("max_capacity")} placeholder="e.g. 30" inputMode="numeric" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")} options={TRAINING_STATUS} />
            </Field>
          </div>
          <Field label="Description / Notes">
            <textarea value={form.description} onChange={set("description")} rows={3}
              className={inputCls} placeholder="Training objectives, curriculum details..." />
          </Field>
        </div>
        <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex gap-3">
          <button type="submit" onClick={submit} className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold text-white" style={{ background: "#1E3A8A" }}>
            {editing ? "Update Training" : "Create Training"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-[#F3F4F6]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

/* ── ENROLLMENT SCREEN ──────────────────────────────────────── */
function EnrollmentScreen({ batch, beneficiaries, enrollments, batches, onEnroll, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());

  // Only beneficiaries in this program, not already enrolled here, and not actively enrolled
  // in another training batch that's still Upcoming/Ongoing (business rule: no duplicate active enrollments).
  const enrolledIds = new Set(enrollments.filter(e => e.batch_id === batch.batch_id).map(e => e.beneficiary_id));
  const activeElsewhereIds = useMemo(() => {
    const s = new Set();
    enrollments.forEach(e => {
      if ((e.enrollment_status || "Active") !== "Active") return;
      if (e.batch_id === batch.batch_id) return;
      const eb = (batches || []).find(b => b.batch_id === e.batch_id);
      const ebStatus = eb?.status || "Upcoming";
      if (ebStatus === "Upcoming" || ebStatus === "Ongoing") s.add(e.beneficiary_id);
    });
    return s;
  }, [enrollments, batches, batch.batch_id]);
  const eligible = useMemo(() => {
    return beneficiaries.filter(b =>
      b.program === batch.program && !enrolledIds.has(b.beneficiary_id) && !activeElsewhereIds.has(b.beneficiary_id)
    );
  }, [beneficiaries, batch, enrolledIds, activeElsewhereIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return eligible;
    const q = query.toLowerCase();
    return eligible.filter(b =>
      b.name?.toLowerCase().includes(q) ||
      b.beneficiary_id?.toLowerCase().includes(q) ||
      b.phone?.includes(query.trim()) ||
      b.village?.toLowerCase().includes(q)
    );
  }, [eligible, query]);

  const toggleSelect = id => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelected(new Set(filtered.map(b => b.beneficiary_id)));
  const clearAll  = () => setSelected(new Set());
  const p = PROGRAM_MAP[batch.program] || PROGRAMS[0];

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Enroll Beneficiaries</h2>
          <p className="text-[12px] text-[#6B7280]">{batch.training_name} · {p.short}</p>
        </div>
        <span className="text-[11px] text-[#6B7280]">{selected.size} selected</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 border-b border-[#F3F4F6] flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by ID, mobile, or name..."
              className={inputCls + " pl-9 text-[12.5px]"} />
          </div>
          <button onClick={selectAll} className="px-3 py-2 rounded-lg text-[12px] font-medium text-[#1E3A8A] border border-[#1E3A8A] hover:bg-[#EFF6FF]">All</button>
          <button onClick={clearAll} className="px-3 py-2 rounded-lg text-[12px] font-medium text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F4F6]">Clear</button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Users size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">{eligible.length === 0 ? "No beneficiaries available — already enrolled here or actively enrolled in another training." : "No matching beneficiaries."}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] max-h-[50vh] overflow-y-auto">
            {filtered.map(b => {
              const isChecked = selected.has(b.beneficiary_id);
              return (
                <label key={b.beneficiary_id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#F8FAFC] transition"
                  style={{ background: isChecked ? "#EFF6FF" : "white" }}>
                  <input type="checkbox" checked={isChecked}
                    onChange={() => toggleSelect(b.beneficiary_id)}
                    className="w-4 h-4 accent-[#1E3A8A]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827]">{b.name}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      {b.beneficiary_id} · {b.village || "—"} · {b.age ? `${b.age} yrs` : "—"} · {b.education || "—"}
                    </p>
                  </div>
                  <Badge label={b.status || "Registered"} color="#16A34A" tint="#DCFCE7" />
                </label>
              );
            })}
          </div>
        )}

        <div className="p-4 border-t border-[#F3F4F6] flex gap-3">
          <button
            onClick={() => onEnroll([...selected])}
            disabled={selected.size === 0}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
            style={{ background: "#1E3A8A" }}>
            Enroll {selected.size > 0 ? `${selected.size} Beneficiaries` : ""}
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── ATTENDANCE SCREEN ──────────────────────────────────────── */
function AttendanceScreen({ batch, enrollments, attendanceRecords, onSaveDailyAttendance, onCancelEnrollment, onClose, currentUser, isAdmin }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const batchEnrollments = enrollments.filter(e =>
    e.batch_id === batch.batch_id &&
    (e.enrollment_status || "Active") !== "Cancelled" &&
    (isAdmin || !e.enrolled_by || e.enrolled_by === currentUser?.username)
  );
  const batchRecords = attendanceRecords.filter(r => r.batch_id === batch.batch_id);

  const [sessionDate, setSessionDate] = useState(todayStr);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  // Marks for the currently-selected session date — pre-filled from existing records if this date was already marked
  const [marks, setMarks] = useState(() => {
    const init = {};
    batchEnrollments.forEach(e => {
      const existing = batchRecords.find(r => r.beneficiary_id === e.beneficiary_id && r.session_date === sessionDate);
      init[e.beneficiary_id] = existing?.status || "Present";
    });
    return init;
  });

  // Re-initialize marks whenever the session date changes
  useEffect(() => {
    const init = {};
    batchEnrollments.forEach(e => {
      const existing = batchRecords.find(r => r.beneficiary_id === e.beneficiary_id && r.session_date === sessionDate);
      init[e.beneficiary_id] = existing?.status || "Present";
    });
    setMarks(init);
    // eslint-disable-next-line
  }, [sessionDate]);

  const statusOptions = ["Present", "Absent", "Late"];
  const statusColors = { Present: "#16A34A", Absent: "#DC2626", Late: "#F97316" };

  // Auto-calculated per-beneficiary stats from full session history in this batch
  const statsFor = (beneficiaryId) => {
    const sessions = batchRecords.filter(r => r.beneficiary_id === beneficiaryId);
    const total = sessions.length;
    const present = sessions.filter(r => r.status === "Present" || r.status === "Late").length;
    const absent = sessions.filter(r => r.status === "Absent").length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, pct };
  };

  const sessionDates = useMemo(() => [...new Set(batchRecords.map(r => r.session_date))].sort().reverse(), [batchRecords]);
  const totalSessions = sessionDates.length;
  const markedToday = batchRecords.filter(r => r.session_date === sessionDate).length;

  const save = async () => {
    setSaving(true);
    await onSaveDailyAttendance(batch.batch_id, sessionDate, marks);
    setSaving(false);
  };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="rounded-[20px] p-4 mb-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
          <p className="text-[10px] text-white/70">Dashboard / Attendance / Take Attendance</p>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[17px] font-bold">{batch.training_name}</h2>
            <p className="text-[11px] text-white/80 mt-0.5">Track beneficiary attendance quickly and accurately.</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-black">{totalSessions}</p>
            <p className="text-[9.5px] text-white/75">Total Sessions</p>
          </div>
        </div>
      </div>

      {/* Session date picker */}
      <div className="bg-white/70 backdrop-blur rounded-[20px] border border-[#E5E7EB] p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">SESSION DATE</label>
          <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
            className={inputCls + " text-[13px]"} max={todayStr} />
        </div>
        {markedToday > 0 && (
          <span className="text-[11px] text-[#16A34A] font-semibold flex items-center gap-1"><CheckCircle size={13} /> Already marked — editing</span>
        )}
        {sessionDates.length > 0 && (
          <button type="button" onClick={() => setShowHistory(s => !s)}
            className="ml-auto text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#1E3A8A]">
            {showHistory ? "Hide" : "View"} History ({sessionDates.length})
          </button>
        )}
      </div>

      {showHistory && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-4 flex flex-wrap gap-2">
          {sessionDates.map(d => (
            <button key={d} type="button" onClick={() => { setSessionDate(d); setShowHistory(false); }}
              className="px-3 py-1.5 rounded-lg text-[11.5px] font-medium"
              style={d === sessionDate ? { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #1E3A8A" } : { background: "#F3F4F6", color: "#6B7280" }}>
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden shadow-sm">
        {batchEnrollments.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Users size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">No beneficiaries enrolled yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] max-h-[55vh] overflow-y-auto">
            {batchEnrollments.map(e => {
              const s = statsFor(e.beneficiary_id);
              return (
                <div key={e.enrollment_id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: "#1E3A8A" }}>
                      {(e.beneficiary_name || e.beneficiary_id || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-[#111827]">{e.beneficiary_name || e.beneficiary_id}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {e.beneficiary_id} · {PROGRAM_MAP[e.program]?.short || e.program} · {s.total} sessions · <b style={{ color: s.pct >= 80 ? "#16A34A" : "#DC2626" }}>{s.pct}%</b>
                      </p>
                    </div>
                    {isAdmin && onCancelEnrollment && (
                      <button type="button" onClick={() => { if (window.confirm(`Cancel ${e.beneficiary_name || e.beneficiary_id}'s enrollment? They'll become available for new enrollments again.`)) onCancelEnrollment(e); }}
                        title="Cancel Enrollment"
                        className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] shrink-0">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {statusOptions.map(st => {
                      const icons = { Present: "🟢", Absent: "🔴", Late: "🟡" };
                      const selected = marks[e.beneficiary_id] === st;
                      return (
                        <button key={st} onClick={() => setMarks(m => ({ ...m, [e.beneficiary_id]: st }))}
                          className="py-3 rounded-2xl text-[13px] font-bold transition-all active:scale-95"
                          style={selected
                            ? { background: statusColors[st], color: "white", boxShadow: `0 4px 12px -2px ${statusColors[st]}66` }
                            : { background: "#F3F4F6", color: "#6B7280" }}>
                          <span className="block text-[16px] mb-0.5">{icons[st]}</span>{st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="sticky bottom-0 p-4 border-t border-[#F3F4F6] bg-white flex gap-3">
          <button onClick={save} disabled={saving || batchEnrollments.length === 0}
            className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-white transition active:scale-[0.98]"
            style={{ background: saving ? "#9CA3AF" : "linear-gradient(90deg,#1E3A8A,#16A34A)" }}>
            {saving ? "Saving..." : `Save Attendance — ${sessionDate}`}
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#E5E7EB] px-6 py-3 text-[13px] font-medium text-[#374151]">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── CERTIFICATE SCREEN ─────────────────────────────────────── */
function CertificateScreen({ batch, enrollments, onIssueCertificates, onClose }) {
  const batchEnrollments = enrollments.filter(e => e.batch_id === batch.batch_id);
  const [certStatus, setCertStatus] = useState(() => {
    const init = {};
    batchEnrollments.forEach(e => { init[e.enrollment_id] = e.certificate_status || "Pending"; });
    return init;
  });

  const eligible = batchEnrollments.filter(e => (e.attendance_pct || 0) >= 80);
  const issued   = batchEnrollments.filter(e => e.certificate_status === "Issued").length;

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Issue Certificates</h2>
          <p className="text-[12px] text-[#6B7280]">{batch.training_name} · {issued}/{batchEnrollments.length} issued</p>
        </div>
      </div>

      <div className="bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] p-4 mb-4">
        <p className="text-[12px] text-[#1E3A8A] font-semibold">ℹ Eligibility: Attendance ≥ 80%</p>
        <p className="text-[11px] text-[#374151] mt-1">{eligible.length} of {batchEnrollments.length} beneficiaries are eligible.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="divide-y divide-[#F3F4F6] max-h-[55vh] overflow-y-auto">
          {batchEnrollments.map(e => {
            const attPct = e.attendance_pct || 0;
            const canIssue = attPct >= 80;
            const current = certStatus[e.enrollment_id];
            return (
              <div key={e.enrollment_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827]">{e.beneficiary_name || e.beneficiary_id}</p>
                  <p className="text-[11px] text-[#6B7280]">Attendance: {attPct}% {!canIssue && "· Below 80% — not eligible"}</p>
                  {e.certificate_no && <p className="text-[10.5px] font-mono text-[#1E3A8A]">{e.certificate_no}</p>}
                </div>
                {canIssue ? (
                  <select value={current}
                    onChange={ev => setCertStatus(s => ({ ...s, [e.enrollment_id]: ev.target.value }))}
                    className="text-[11.5px] rounded-lg border border-[#E5E7EB] px-2 py-1.5 outline-none">
                    {["Pending","Issued","Downloaded"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Badge label="Not Eligible" color="#DC2626" tint="#FEF2F2" />
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-[#F3F4F6] flex gap-3">
          <button onClick={() => onIssueCertificates(certStatus)}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>
            Save Certificate Status
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── ATTENDANCE REPORT (date-wise / batch-wise / program-wise / beneficiary-wise) ── */
function AttendanceReport({ attendanceRecords, batches, beneficiaries, dynPrograms, onClose }) {
  const [programFilter, setProgramFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [beneficiaryQuery, setBeneficiaryQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const resolvedPrograms = useMemo(() => {
    if (dynPrograms && dynPrograms.length > 0) {
      return dynPrograms.map(p => ({ key: p.key, short: p.program_name }));
    }
    return PROGRAMS;
  }, [dynPrograms]);

  const batchMap = useMemo(() => Object.fromEntries(batches.map(b => [b.batch_id, b])), [batches]);
  const beneficiaryMap = useMemo(() => Object.fromEntries(beneficiaries.map(b => [b.beneficiary_id, b])), [beneficiaries]);
  const villageOptions = useMemo(() => [...new Set(beneficiaries.map(b => b.village).filter(Boolean))].sort(), [beneficiaries]);

  const batchesInProgram = useMemo(() => {
    if (programFilter === "all") return batches;
    return batches.filter(b => b.program === programFilter);
  }, [batches, programFilter]);

  const filtered = useMemo(() => {
    let r = attendanceRecords;
    if (programFilter !== "all") r = r.filter(rec => batchMap[rec.batch_id]?.program === programFilter);
    if (batchFilter !== "all") r = r.filter(rec => rec.batch_id === batchFilter);
    if (villageFilter !== "all") r = r.filter(rec => beneficiaryMap[rec.beneficiary_id]?.village === villageFilter);
    if (statusFilter !== "all") r = r.filter(rec => rec.status === statusFilter);
    if (fromDate) r = r.filter(rec => rec.session_date >= fromDate);
    if (toDate) r = r.filter(rec => rec.session_date <= toDate);
    if (beneficiaryQuery.trim()) {
      const q = beneficiaryQuery.toLowerCase();
      r = r.filter(rec => {
        const ben = beneficiaryMap[rec.beneficiary_id];
        return rec.beneficiary_id?.toLowerCase().includes(q) || ben?.name?.toLowerCase().includes(q);
      });
    }
    return [...r].sort((a, b) => (b.session_date || "").localeCompare(a.session_date || ""));
  }, [attendanceRecords, programFilter, batchFilter, villageFilter, statusFilter, fromDate, toDate, beneficiaryQuery, batchMap, beneficiaryMap]);

  const resetFilters = () => {
    setProgramFilter("all"); setBatchFilter("all"); setVillageFilter("all"); setStatusFilter("all");
    setBeneficiaryQuery(""); setFromDate(""); setToDate("");
  };

  const rowsForExport = () => filtered.map(rec => {
    const bt = batchMap[rec.batch_id];
    const ben = beneficiaryMap[rec.beneficiary_id];
    return {
      "Date": rec.session_date,
      "Training": bt?.training_name || rec.batch_id,
      "Program": PROGRAM_MAP[bt?.program]?.short || bt?.program || "—",
      "Beneficiary ID": rec.beneficiary_id,
      "Beneficiary Name": ben?.name || "—",
      "Village": ben?.village || "—",
      "Trainer": bt?.trainer_name || "—",
      "Status": rec.status,
      "Marked By": rec.marked_by || "—",
    };
  });

  const exportCSV = () => downloadCSV(rowsForExport(), `TAPASVI_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  const exportPDF = () => printTable(rowsForExport(), "Attendance Report");

  const totalPresent = filtered.filter(r => r.status === "Present" || r.status === "Late").length;
  const totalAbsent = filtered.filter(r => r.status === "Absent").length;
  const attendancePct = filtered.length > 0 ? Math.round((totalPresent / filtered.length) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = attendanceRecords.filter(r => r.session_date === todayStr);
  const todayPresent = todayRecords.filter(r => r.status === "Present" || r.status === "Late").length;
  const todayAbsent = todayRecords.filter(r => r.status === "Absent").length;
  const activeBatches = batches.filter(b => b.status === "Ongoing").length;
  const todaysTrainings = batches.filter(b => b.start_date && b.end_date && b.start_date <= todayStr && b.end_date >= todayStr).length;
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const SUMMARY = [
    { label: "Today's Attendance", value: todayRecords.length, sub: `${todayStr}`, icon: ClipboardList, grad: ["#1E3A8A", "#3B82F6"] },
    { label: "Present", value: todayPresent, sub: "Today", icon: CheckCircle, grad: ["#16A34A", "#4ADE80"] },
    { label: "Absent", value: todayAbsent, sub: "Today", icon: XCircle, grad: ["#DC2626", "#F87171"] },
    { label: "Attendance %", value: attendancePct + "%", sub: "Filtered range", icon: TrendingUp, grad: ["#DB2777", "#F472B6"] },
    { label: "Active Batches", value: activeBatches, sub: "Ongoing", icon: BookOpen, grad: ["#F97316", "#FB923C"] },
    { label: "Today's Trainings", value: todaysTrainings, sub: "In session", icon: Clock, grad: ["#7C3AED", "#A78BFA"] },
  ];

  return (
    <div>
      <div className="rounded-[20px] p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><ChevronRight size={16} className="rotate-180" /></button>
          <p className="text-[10px] text-white/70">Dashboard / Attendance</p>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[19px] font-bold">Attendance Management</h2>
            <p className="text-[11.5px] text-white/85 mt-0.5">Track beneficiary attendance quickly and accurately.</p>
          </div>
          <p className="text-[10.5px] text-white/80">{todayLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {SUMMARY.map(s => (
          <div key={s.label} className="rounded-[20px] p-4 text-white relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: `linear-gradient(135deg,${s.grad[0]},${s.grad[1]})` }}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2.5">
              <s.icon size={16} />
            </div>
            <p className="text-[21px] font-bold leading-none">{s.value}</p>
            <p className="text-[10.5px] text-white/85 mt-1.5 leading-tight">{s.label}</p>
            <p className="text-[9px] text-white/65 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-[#6B7280]">{filtered.length} records · {totalPresent} present · {totalAbsent} absent</p>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
            <Printer size={13} /> PDF / Print
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-4 mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">PROGRAM</label>
          <select value={programFilter} onChange={e => { setProgramFilter(e.target.value); setBatchFilter("all"); }} className={selectCls + " text-[12.5px]"}>
            <option value="all">All Programs</option>
            {resolvedPrograms.map(p => <option key={p.key} value={p.key}>{p.short}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">TRAINING BATCH</label>
          <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className={selectCls + " text-[12.5px]"}>
            <option value="all">All Batches</option>
            {batchesInProgram.map(b => <option key={b.batch_id} value={b.batch_id}>{b.training_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">VILLAGE</label>
          <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className={selectCls + " text-[12.5px]"}>
            <option value="all">All Villages</option>
            {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">STATUS</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " text-[12.5px]"}>
            <option value="all">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
          </select>
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">FROM DATE</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls + " text-[12.5px]"} />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">TO DATE</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls + " text-[12.5px]"} />
        </div>
        <div className="col-span-2">
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">BENEFICIARY (NAME OR ID)</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={beneficiaryQuery} onChange={e => setBeneficiaryQuery(e.target.value)} placeholder="Search beneficiary..." className={inputCls + " pl-9 text-[12.5px]"} />
          </div>
        </div>
        <div className="col-span-2 flex justify-end">
          <button onClick={resetFilters} className="text-[11.5px] font-semibold text-[#6B7280] px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6]">
            Reset Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF]">
            <ClipboardList size={30} className="mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">No attendance records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Date</th>
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Training</th>
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Beneficiary</th>
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Village</th>
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Trainer</th>
                  <th className="text-left px-3 py-2.5 text-[#6B7280] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => {
                  const bt = batchMap[rec.batch_id];
                  const ben = beneficiaryMap[rec.beneficiary_id];
                  const color = rec.status === "Present" ? "#16A34A" : rec.status === "Late" ? "#F97316" : "#DC2626";
                  const tint = rec.status === "Present" ? "#DCFCE7" : rec.status === "Late" ? "#FFF7ED" : "#FEF2F2";
                  return (
                    <tr key={rec.id} className="border-b border-[#F3F4F6] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-2.5 text-[#374151]">{rec.session_date}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{bt?.training_name || rec.batch_id}</td>
                      <td className="px-3 py-2.5 text-[#111827] font-medium">{ben?.name || rec.beneficiary_id}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{ben?.village || "—"}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{bt?.trainer_name || "—"}</td>
                      <td className="px-3 py-2.5"><Badge label={rec.status} color={color} tint={tint} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── BATCH TRAINING LIST (replaces old TrainingList) ────────── */

function TrainingList({ batches, enrollments, beneficiaries, isAdmin, currentUser,
  onAdd, onEdit, onDelete, onEnroll, onAttendance, onCertificates,
  onExport, onPrint, dynPrograms, onAttendanceReport, onAssessments, onCertificateGeneration }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Phase 3: program color/icon/label for filters and cards come from the dynamic `programs` table.
  // Falls back to the static PROGRAMS list if the dynamic fetch hasn't loaded / failed, and always
  // includes any program key still referenced by existing training records so nothing goes missing.
  const resolvedPrograms = useMemo(() => {
    const base = (dynPrograms && dynPrograms.length > 0)
      ? dynPrograms.map(p => ({
          key: p.key, label: p.program_name, short: p.program_name,
          color: p.color || "#1E3A8A", tint: (p.color || "#1E3A8A") + "18",
          icon: PROGRAM_ICON_MAP[p.icon] || ClipboardList,
        }))
      : PROGRAMS;
    const known = new Set(base.map(p => p.key));
    const extras = [...new Set((batches || []).map(b => b.program))].filter(k => k && !known.has(k))
      .map(k => ({ key: k, label: k, short: k, color: "#6B7280", tint: "#F3F4F6", icon: ClipboardList }));
    return [...base, ...extras];
  }, [dynPrograms, batches]);
  const resolvedProgramMap = useMemo(() => Object.fromEntries(resolvedPrograms.map(p => [p.key, p])), [resolvedPrograms]);

  // Field Workers only see Training Batches assigned to them. Super Admin/Admin see everything.
  // Unassigned trainings and trainings assigned to another Field Worker are hidden — no backward-compat exception.
  const visibleBatches = useMemo(() => {
    if (isAdmin) return batches || [];
    return (batches || []).filter(b => b.assigned_field_worker && b.assigned_field_worker === currentUser?.username);
  }, [batches, isAdmin, currentUser]);

  // All aggregate stats (participants, completion rate) must be computed only from enrollments
  // belonging to the trainings this user can see — not the full unfiltered enrollments list.
  const visibleBatchIds = useMemo(() => new Set(visibleBatches.map(b => b.batch_id)), [visibleBatches]);
  const visibleEnrollments = useMemo(() => (enrollments || []).filter(e => visibleBatchIds.has(e.batch_id)), [enrollments, visibleBatchIds]);

  const filtered = useMemo(() => {
    let r = visibleBatches;
    if (programFilter !== "all") r = r.filter(b => b.program === programFilter);
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(b => b.training_name?.toLowerCase().includes(q) || b.trainer_name?.toLowerCase().includes(q) || b.venue?.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [visibleBatches, query, programFilter, statusFilter]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const getEnrollCount = batchId => visibleEnrollments.filter(e => e.batch_id === batchId).length;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="rounded-[20px] p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
        <p className="text-[10px] text-white/70 mb-1">Dashboard / Training Management</p>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[19px] font-bold">Training Management</h2>
            <p className="text-[11.5px] text-white/85 mt-0.5">Manage training batches, enrollments and progress.</p>
          </div>
          <p className="text-[10.5px] text-white/80">{todayLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-[12px] text-[#6B7280]">{filtered.length} trainings</p>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button onClick={() => onExport(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                <FileSpreadsheet size={13} /> CSV
              </button>
              <button onClick={() => onPrint(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                <Printer size={13} /> PDF
              </button>
              {onAttendanceReport && (
                <button onClick={onAttendanceReport} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                  <ClipboardList size={13} /> Attendance Report
                </button>
              )}
              {onAssessments && (
                <button onClick={onAssessments} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                  <Award size={13} /> Assessments
                </button>
              )}
              {onCertificateGeneration && (
                <button onClick={onCertificateGeneration} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                  <CheckCircle size={13} /> Certificate Generation
                </button>
              )}
            </>
          )}
          {isAdmin && (
            <button onClick={onAdd}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#1E3A8A,#16A34A)" }}>
              <Plus size={14} /> New Training
            </button>
          )}
        </div>
      </div>

      {/* Dashboard */}
      <TrainingDashboard batches={visibleBatches} enrollments={visibleEnrollments} />

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3 flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search training, trainer, venue..." className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        <select value={programFilter} onChange={e => { setProgramFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Programs</option>
          {resolvedPrograms.map(p => <option key={p.key} value={p.key}>{p.short}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          {TRAINING_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <BookOpen size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No trainings found.</p>
          {isAdmin && (
            <button onClick={onAdd} className="mt-3 rounded-xl px-4 py-2 text-[12px] font-bold text-white" style={{ background: "#1E3A8A" }}>
              Create First Training
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(batch => {
            const p = resolvedProgramMap[batch.program] || resolvedPrograms[0] || { color: "#6B7280", tint: "#F3F4F6", short: batch.program, icon: ClipboardList };
            const sc = trainingStatusColor(batch.status);
            const enrollCount = getEnrollCount(batch.batch_id);
            const capacity = batch.max_capacity ? `${enrollCount}/${batch.max_capacity}` : enrollCount;
            return (
              <div key={batch.batch_id} className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden">
                <div className="px-4 py-4" style={{ borderLeft: `4px solid ${p.color}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                      {p.icon ? <p.icon size={18} style={{ color: p.color }} /> : <BookOpen size={18} style={{ color: p.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] text-[#111827]">{batch.training_name}</span>
                        <Badge label={p.short} color={p.color} tint={p.tint} />
                        <Badge label={batch.status} color={sc.color} tint={sc.tint} />
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11.5px] text-[#6B7280]">
                        <span>👤 {batch.trainer_name}</span>
                        <span>📍 {batch.venue}</span>
                        <span>📅 {batch.start_date}{batch.end_date ? ` → ${batch.end_date}` : ""}</span>
                        <span>👥 {capacity} participants</span>
                        {batch.training_type && <span>📚 {batch.training_type}</span>}
                        {batch.assigned_field_worker && <span>🧑‍💼 {batch.assigned_field_worker}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Action buttons */}
                      <div className="flex gap-1">
                        {batch.status !== "Completed" && batch.status !== "Cancelled" && (
                          <button onClick={() => onEnroll(batch)} title="Enroll Beneficiaries"
                            className="px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                            style={{ background: "#1E3A8A" }}>
                            + Enroll
                          </button>
                        )}
                        <button onClick={() => onAttendance(batch)} title="Mark Attendance"
                          className="px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                          style={{ background: "#F97316" }}>
                          Attend
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {batch.status === "Completed" && (
                          <button onClick={() => onCertificates(batch)} title="Issue Certificates"
                            className="flex-1 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                            style={{ background: "#16A34A" }}>
                            🏅 Certs
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => onEdit(batch)} className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"><Edit2 size={13} /></button>
                            <button onClick={() => onDelete(batch)} className="p-1.5 rounded-lg text-[#F97316] hover:bg-[#FFF7ED]"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-[12px] text-[#6B7280]">
            Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   EMPLOYMENT LIST
   ============================================================ */
function EmploymentList({ employment, beneficiaries, isAdmin, onAdd, onEdit, onDelete, onExport, onPrint }) {
  const getBeneficiaryName = id => beneficiaries.find(b => b.beneficiary_id === id)?.name || "—";
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Employment Records</h2>
          <p className="text-[12px] text-[#6B7280]">{employment.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold" style={{ background: "#16A34A", color: "#fff" }}>
            <Plus size={14} /> Add Employment
          </button>
          {isAdmin && (
            <>
              <button onClick={() => onExport(employment)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><FileSpreadsheet size={13} /> CSV</button>
              <button onClick={() => onPrint(employment)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><Printer size={13} /> Print</button>
            </>
          )}
        </div>
      </div>
      {employment.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]"><Briefcase size={28} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No employment records yet.</p></div>
      ) : (
        <div className="space-y-2.5">
          {employment.map(e => (
            <div key={e.job_id} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3" style={{ borderLeft: "4px solid #F97316" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] text-[#111827]">{getBeneficiaryName(e.beneficiary_id)}</span>
                  <Badge label={e.employment_type} color="#F97316" tint="#FFF7ED" />
                  <Badge label={e.status} color={e.status === "Active" ? "#16A34A" : "#888"} tint={e.status === "Active" ? "#DCFCE7" : "#F5F5F5"} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                  <span className="font-mono">{e.beneficiary_id}</span>
                  <span>•</span><span>{e.job_role}</span>
                  {e.employer && <><span>•</span><span>{e.employer}</span></>}
                  {e.monthly_income && <><span>•</span><span>₹{e.monthly_income}/mo</span></>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(e)} className="p-2 rounded-lg text-[#1E3A8A] hover:bg-[#EFF6FF]"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(e)} className="p-2 rounded-lg text-[#F97316] hover:bg-[#FFF7ED]"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VILLAGE MASTER LIST
   ============================================================ */
function VillageMasterList({ villages, isAdmin, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Village Master</h2>
          <p className="text-[12px] text-[#6B7280]">{villages.length} villages configured</p>
        </div>
        {isAdmin && (
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold" style={{ background: "#16A34A", color: "#fff" }}>
            <Plus size={14} /> Add Village
          </button>
        )}
      </div>
      {villages.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]">
          <MapPin size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-[13px]">No villages added yet.</p>
          <p className="text-[11px] mt-1">Add villages here so they appear as dropdowns in registration forms.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-white">
                <th className="text-left px-4 py-3 font-semibold">Village</th>
                <th className="text-left px-4 py-3 font-semibold">Mandal</th>
                <th className="text-left px-4 py-3 font-semibold">District</th>
                <th className="text-left px-4 py-3 font-semibold">Population</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {villages.map((v, i) => (
                <tr key={v.village_id || v.village_name} className={i % 2 === 0 ? "bg-white" : "bg-[#F9F8F5]"}>
                  <td className="px-4 py-3 font-medium">{v.village_name}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{v.mandal}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{v.district}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{v.population || "—"}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => onEdit(v)} className="p-1.5 rounded text-[#1E3A8A] hover:bg-[#EFF6FF]"><Edit2 size={13} /></button>
                        <button onClick={() => onDelete(v)} className="p-1.5 rounded text-[#F97316] hover:bg-[#FFF7ED]"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BENEFICIARY PROFILE
   ============================================================ */
function BeneficiaryProfile({ beneficiary: b, onClose, beneficiaries, isAdmin, isSuperAdmin, enrollments }) {
  const p = PROGRAM_MAP[b.program] || PROGRAMS[0];

  // Calculate profile completion
  const sections = {
    Personal:  { fields: ["name","age","gender","phone"], weight: 25 },
    Address:   { fields: ["village","mandal","district"], weight: 20 },
    Identity:  { fields: ["identity_type","identity_number"], weight: 20 },
    Social:    { fields: ["category"], weight: 15 },
    Education: { fields: ["education"], weight: 10 },
    Notes:     { fields: ["field_worker_name","registration_date"], weight: 10 },
  };

  const completion = Object.entries(sections).map(([name, { fields, weight }]) => {
    const filled = fields.filter(f => b[f] && String(b[f]).trim() !== "" && b[f] !== "No").length;
    const pct = Math.round((filled / fields.length) * 100);
    return { name, pct, weight };
  });
  const overall = Math.round(completion.reduce((sum, s) => sum + (s.pct * s.weight / 100), 0));

  // Other programs this person is registered in — one badge per program (latest active only)
  const otherProgramsRaw = beneficiaries.filter(x =>
    x.beneficiary_id !== b.beneficiary_id &&
    x.phone === b.phone && x.phone &&
    x.status !== "Archived"
  );
  const otherProgramsMap = {};
  otherProgramsRaw.forEach(x => {
    const existing = otherProgramsMap[x.program];
    if (!existing || new Date(x.created_at || 0) > new Date(existing.created_at || 0)) {
      otherProgramsMap[x.program] = x;
    }
  });
  const otherPrograms = Object.values(otherProgramsMap);

  // Live data this profile fetches for itself — attendance, assessments, certificates, placement.
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [assessmentMarks, setAssessmentMarks] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLiveLoading(true);
      const [ar, am, asr, ct, em] = await Promise.all([
        supabase.from("attendance_records").select("*").eq("beneficiary_id", b.beneficiary_id),
        supabase.from("assessment_marks").select("*").eq("beneficiary_id", b.beneficiary_id),
        supabase.from("assessment_records").select("*"),
        supabase.from("certificates").select("*").eq("beneficiary_id", b.beneficiary_id),
        supabase.from("employment").select("*").eq("beneficiary_id", b.beneficiary_id),
      ]);
      setAttendanceRecords(ar.data || []);
      setAssessmentMarks(am.data || []);
      setAssessmentRecords(asr.data || []);
      setCertificates(ct.data || []);
      setEmploymentRecords(em.data || []);
      setLiveLoading(false);
    })();
  }, [b.beneficiary_id]);

  const myEnrollments = (enrollments || []).filter(e => e.beneficiary_id === b.beneficiary_id);
  const presentCount = attendanceRecords.filter(a => a.status === "Present" || a.status === "Late").length;
  const attendancePct = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : null;
  const latestMark = [...assessmentMarks].sort((x, y) => (y.created_at || "").localeCompare(x.created_at || ""))[0];
  const activeCert = certificates.find(c => c.status === "Active");
  const activeEmployment = employmentRecords.find(e => e.status === "Active");
  const completedEnrollments = myEnrollments.filter(e => e.enrollment_status === "Completed").length;
  const trainingProgressPct = myEnrollments.length > 0 ? Math.round((completedEnrollments / myEnrollments.length) * 100) : 0;

  const derivedStatus = activeEmployment ? "Placed" : activeCert ? "Certified" : completedEnrollments > 0 ? "Completed" : myEnrollments.length > 0 ? "Training" : (b.status || "Registered");
  const derivedStatusColor = { Placed: "#0EA5E9", Certified: "#7C3AED", Completed: "#16A34A", Training: "#F97316", Registered: "#1E3A8A" }[derivedStatus] || "#1E3A8A";

  const firstEnrollmentDate = myEnrollments.length > 0 ? [...myEnrollments].sort((x, y) => (x.enrolled_at || "").localeCompare(y.enrolled_at || ""))[0]?.enrolled_at : null;
  const firstAssessmentDate = assessmentMarks.length > 0 ? (assessmentRecords.find(r => r.id === assessmentMarks[0].assessment_id)?.assessment_date) : null;

  const TIMELINE = [
    { label: "Registration", date: b.registration_date, done: true },
    { label: "Training Started", date: firstEnrollmentDate?.slice(0, 10), done: myEnrollments.length > 0 },
    { label: "Attendance Recorded", date: attendanceRecords[0]?.session_date, done: attendanceRecords.length > 0 },
    { label: "Assessment Completed", date: firstAssessmentDate, done: assessmentMarks.length > 0 },
    { label: "Certificate Issued", date: activeCert?.certificate_date, done: !!activeCert },
    { label: "Placement", date: activeEmployment?.created_at?.slice(0, 10), done: !!activeEmployment },
  ];

  const InfoRow = ({ label, value }) => (
    <div className="flex py-2 border-b border-[#F3F4F6] last:border-0">
      <span className="text-[11.5px] text-[#6B7280] w-36 shrink-0">{label}</span>
      <span className="text-[12px] font-medium text-[#111827] flex-1">{value || "—"}</span>
    </div>
  );

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6]">
          <X size={18} className="text-[#6B7280]" />
        </button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Beneficiary Profile</h2>
          <p className="text-[11.5px] text-[#6B7280]">{b.beneficiary_id}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: p.color }}>
          {p.short}
        </span>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-black text-white shrink-0"
            style={{ background: p.color }}>
            {(b.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-bold text-[#111827]">{b.name || "—"}</h3>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{b.age ? `${b.age} years` : "—"} · {b.gender || "—"}</p>
            <p className="text-[12px] text-[#6B7280]">📞 {b.phone || "—"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge label={derivedStatus} color={derivedStatusColor} tint={derivedStatusColor + "18"} />
              {b.field_worker_name && <span className="text-[10.5px] text-[#6B7280]">👤 {b.field_worker_name}</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <div><p className="text-[9.5px] text-[#9CA3AF] uppercase">Village</p><p className="text-[12px] font-semibold text-[#111827]">{b.village || "—"}</p></div>
          <div><p className="text-[9.5px] text-[#9CA3AF] uppercase">Registration Date</p><p className="text-[12px] font-semibold text-[#111827]">{b.registration_date || "—"}</p></div>
        </div>
      </div>

      {/* Live Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[
          { label: "Attendance", value: attendancePct !== null ? attendancePct + "%" : "—", color: "#1E3A8A" },
          { label: "Assessment Score", value: latestMark ? latestMark.percentage + "%" : "—", color: "#F97316" },
          { label: "Grade", value: latestMark ? latestMark.grade : "—", color: "#7C3AED" },
          { label: "Certificate", value: activeCert ? "Issued" : "Pending", color: activeCert ? "#16A34A" : "#9CA3AF" },
          { label: "Placement", value: activeEmployment ? "Placed" : "Pending", color: activeEmployment ? "#0EA5E9" : "#9CA3AF" },
          { label: "Training Progress", value: myEnrollments.length ? trainingProgressPct + "%" : "—", color: "#DB2777" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
            <p className="text-[14px] font-bold" style={{ color: card.color }}>{liveLoading ? "…" : card.value}</p>
            <p className="text-[9px] text-[#6B7280] mt-0.5 leading-tight">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-4">📍 Journey Timeline</h4>
        <div className="space-y-0">
          {TIMELINE.map((t, i) => (
            <div key={t.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={t.done ? { background: "#16A34A", color: "#fff" } : { background: "#F3F4F6", color: "#9CA3AF" }}>
                  {t.done ? "✓" : i + 1}
                </div>
                {i < TIMELINE.length - 1 && <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: t.done ? "#16A34A" : "#E5E7EB" }} />}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-[12.5px] font-semibold text-[#111827]">{t.label}</p>
                <p className="text-[10.5px]" style={{ color: t.done ? "#16A34A" : "#9CA3AF" }}>{t.done ? (t.date || "Completed") : "Pending"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Completion */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-bold text-[#111827]">Profile Completion</h4>
          <span className="text-[20px] font-black" style={{ color: overall >= 70 ? "#16A34A" : overall >= 40 ? "#F97316" : "#DC2626" }}>
            {overall}%
          </span>
        </div>
        <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${overall}%`, background: overall >= 70 ? "#16A34A" : overall >= 40 ? "#F97316" : "#DC2626" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {completion.map(s => (
            <div key={s.name} className="text-center">
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full bg-[#1E3A8A]" style={{ width: `${s.pct}%` }} />
              </div>
              <p className="text-[10px] text-[#6B7280]">{s.name}</p>
              <p className="text-[11px] font-bold text-[#111827]">{s.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personal & Contact */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">👤 Personal & Contact</h4>
        <InfoRow label="Full Name" value={b.name} />
        <InfoRow label="Age" value={b.age ? `${b.age} years` : null} />
        <InfoRow label="Gender" value={b.gender} />
        <InfoRow label="Mobile" value={b.phone} />
        <InfoRow label="Category" value={b.category} />
        <InfoRow label="Disability" value={b.disability} />
        <InfoRow label="SHG Member" value={b.shg} />
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">📍 Address</h4>
        <InfoRow label="House No" value={b.house_no} />
        <InfoRow label="Village" value={b.village} />
        <InfoRow label="Mandal" value={b.mandal} />
        <InfoRow label="District" value={b.district} />
        <InfoRow label="State" value={b.state || "Andhra Pradesh"} />
      </div>

      {/* Identity & Documents */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">🪪 Identity & Documents</h4>
        <InfoRow label="Primary ID Type" value={IDENTITY_TYPES.find(i => i.value === b.identity_type)?.label || (b.identity_type ? b.identity_type : "Aadhaar Card")} />
        <InfoRow label="Document Number" value={aadhaarForRole(b.identity_number || b.aadhaar_number, isSuperAdmin, isAdmin)} />
        <InfoRow label="Aadhaar Verified" value={b.aadhaar_verified} />
        <InfoRow label="eKYC Status" value={b.ekyc_status} />
        <div className="mt-3 p-3 bg-[#EFF6FF] rounded-lg">
          <p className="text-[11px] text-[#1E3A8A] font-medium">Additional documents (Aadhaar, Voter ID, Ration Card) can be added here in future updates.</p>
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">🎓 Education & Skills</h4>
        <InfoRow label="Education" value={b.education} />
        <InfoRow label="Skill Interest" value={b.skill_interest} />
        <div className="mt-3 p-3 bg-[#F0FDF4] rounded-lg">
          <p className="text-[11px] text-[#16A34A] font-medium">Training, Employment, and Certification modules coming soon.</p>
        </div>
      </div>

      {/* Program Information */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">📋 Program Information</h4>
        <InfoRow label="Program" value={p.label} />
        <InfoRow label="Registration ID" value={b.beneficiary_id} />
        <InfoRow label="Registration Date" value={b.registration_date || b.survey_date} />
        <InfoRow label="Status" value={b.status} />
        <InfoRow label="Field Worker" value={b.field_worker_name} />
        {otherPrograms.length > 0 && (
          <div className="mt-3">
            <p className="text-[11.5px] font-semibold text-[#111827] mb-2">Also registered in:</p>
            <div className="flex gap-2 flex-wrap">
              {otherPrograms.map(op => {
                const op_p = PROGRAM_MAP[op.program];
                return op_p ? (
                  <span key={op.beneficiary_id} className="px-3 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: op_p.tint, color: op_p.color }}>
                    {op_p.short} · {op.beneficiary_id}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Training History */}
      {myEnrollments.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
          <h4 className="text-[13px] font-bold text-[#111827] mb-3">🎓 Training History</h4>
          <div className="space-y-2.5">
            {myEnrollments.map(e => (
              <div key={e.enrollment_id} className="bg-[#F8FAFC] rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[12.5px] font-semibold text-[#111827]">{e.training_name || e.batch_id}</p>
                  <Badge label={e.enrollment_status || "Active"} color={e.enrollment_status === "Completed" ? "#16A34A" : "#1E3A8A"} tint={e.enrollment_status === "Completed" ? "#DCFCE7" : "#EFF6FF"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-3">🕓 Recent Activity</h4>
        {liveLoading ? (
          <p className="text-[12px] text-[#9CA3AF] text-center py-4">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wide mb-1.5">Attendance</p>
              {attendanceRecords.length === 0 ? <p className="text-[11.5px] text-[#9CA3AF]">No records yet.</p> : (
                <div className="space-y-1.5">
                  {attendanceRecords.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#374151]">{a.session_date}</span>
                      <Badge label={a.status} color={a.status === "Present" ? "#16A34A" : a.status === "Late" ? "#F97316" : "#DC2626"} tint={a.status === "Present" ? "#DCFCE7" : a.status === "Late" ? "#FFF7ED" : "#FEE2E2"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wide mb-1.5">Assessments</p>
              {assessmentMarks.length === 0 ? <p className="text-[11.5px] text-[#9CA3AF]">No assessments yet.</p> : (
                <div className="space-y-1.5">
                  {assessmentMarks.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#374151]">{assessmentRecords.find(r => r.id === m.assessment_id)?.assessment_type || "Assessment"} · {m.percentage}%</span>
                      <Badge label={m.result} color={m.result === "Pass" ? "#16A34A" : "#DC2626"} tint={m.result === "Pass" ? "#DCFCE7" : "#FEE2E2"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wide mb-1.5">Certificates</p>
              {certificates.length === 0 ? <p className="text-[11.5px] text-[#9CA3AF]">None issued yet.</p> : (
                <div className="space-y-1.5">
                  {certificates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#374151] font-mono">{c.certificate_number}</span>
                      <Badge label={c.status} color={c.status === "Active" ? "#16A34A" : "#DC2626"} tint={c.status === "Active" ? "#DCFCE7" : "#FEE2E2"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-[#6B7280] uppercase tracking-wide mb-1.5">Placement</p>
              {employmentRecords.length === 0 ? <p className="text-[11.5px] text-[#9CA3AF]">No placement records yet.</p> : (
                <div className="space-y-1.5">
                  {employmentRecords.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#374151]">{e.job_role || e.employer || "—"}</span>
                      <Badge label={e.status} color={e.status === "Active" ? "#16A34A" : "#9CA3AF"} tint={e.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {b.notes && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
          <h4 className="text-[13px] font-bold text-[#111827] mb-2">📝 Field Worker Notes</h4>
          <p className="text-[12.5px] text-[#374151]">{b.notes}</p>
        </div>
      )}

    </div>
  );
}


/* ============================================================
   USER MANAGEMENT MODULE — Admin Only
   ============================================================ */
function UserManagement({ currentUser, showToast }) {
  const isSuperAdmin = currentUser.role === "super_admin";
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState("list"); // list | form | audit
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tempPasswordModal, setTempPasswordModal] = useState(null); // { full_name, password }
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_users").select("*").order("created_at", { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    setAuditLogs(data || []);
  }, []);

  useEffect(() => { loadUsers(); loadAuditLogs(); }, [loadUsers, loadAuditLogs]);

  const logAudit = async (action, details) => {
    await supabase.from("audit_logs").insert({
      user_email: currentUser.username,
      action, module: "User Management", details,
      created_at: new Date().toISOString()
    });
  };

  const saveUser = async (form) => {
    if (editing) {
      // Don't overwrite password if left blank during edit
      const updateData = { ...form };
      let issuedTempPassword = null;
      if (!updateData.password_hash || updateData.password_hash.trim() === "") {
        delete updateData.password_hash;
      } else if (updateData.role === "fieldworker") {
        // A password was (re)set — treat it as a new temporary password
        updateData.must_change_password = true;
        issuedTempPassword = updateData.password_hash;
      }
      const { error } = await supabase.from("app_users").update(updateData).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...updateData } : u));
      await logAudit(issuedTempPassword ? "PASSWORD_RESET" : "UPDATE", issuedTempPassword ? `Password reset for: ${form.full_name}` : `Updated user: ${form.full_name}`);
      showToast("User updated successfully.");
      if (issuedTempPassword) setTempPasswordModal({ full_name: form.full_name, password: issuedTempPassword });
    } else {
      let tempPassword = null;
      const rec = { ...form, created_by: currentUser.username, created_at: new Date().toISOString() };
      if (form.role === "fieldworker") {
        tempPassword = (form.password_hash && form.password_hash.trim()) || generateTempPassword();
        rec.password_hash = tempPassword;
        rec.must_change_password = true;
        // Field Workers don't use email to log in, but the email column is NOT NULL + UNIQUE —
        // generate a unique placeholder so it never collides with another Field Worker's row.
        if (!rec.email || !rec.email.trim()) {
          rec.email = `fieldworker.${Date.now()}.${Math.floor(Math.random() * 10000)}@noemail.tapasvi.local`;
        }
      }
      const { data, error } = await supabase.from("app_users").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setUsers(us => [data, ...us]);
      await logAudit("CREATE", `Created user: ${form.full_name} (Role: ${form.role})`);
      showToast("User created successfully.");
      if (tempPassword) setTempPasswordModal({ full_name: form.full_name, password: tempPassword });
    }
    await loadAuditLogs();
    setEditing(null); setSubView("list");
  };

  const deleteUser = async (u) => {
    const { error } = await supabase.from("app_users").delete().eq("id", u.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setUsers(us => us.filter(x => x.id !== u.id));
    await logAudit("DELETE", `Deleted user: ${u.full_name} (${u.email})`);
    showToast("User deleted."); setDeleteTarget(null);
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("app_users").update({ status: newStatus }).eq("id", u.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setUsers(us => us.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
    await logAudit("STATUS", `${newStatus === "active" ? "Activated" : "Deactivated"} user: ${u.full_name}`);
    await loadAuditLogs();
    showToast(`User ${newStatus === "active" ? "activated" : "deactivated"}.`);
  };

  const exportUsersCSV = () => {
    const rows = filtered.map(u => ({
      "Full Name": u.full_name, "Email": u.email, "Role": u.role,
      "Phone": u.phone || "—", "Program": u.program || "—",
      "Village": u.village || "—", "Status": u.status,
      "Created At": new Date(u.created_at).toLocaleDateString("en-IN"),
    }));
    logAudit("EXPORT", `Exported ${rows.length} user record(s) (CSV)`);
    downloadCSV(rows, `TAPASVI_Users_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const printUsersPDF = () => {
    logAudit("PRINT", `Printed ${filtered.length} user record(s)`);
    printTable(filtered.map(u => ({
      "Name": u.full_name, "Email": u.email, "Role": u.role,
      "Phone": u.phone || "—", "Program": u.program || "—",
      "Status": u.status,
      "Created": new Date(u.created_at).toLocaleDateString("en-IN"),
    })), "User Management Report");
  };

  const filtered = useMemo(() => {
    let r = isSuperAdmin ? users : users.filter(u => u.role === "fieldworker");
    if (roleFilter !== "all") r = r.filter(u => u.role === roleFilter);
    if (statusFilter !== "all") r = r.filter(u => u.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.village?.toLowerCase().includes(q));
    }
    return r;
  }, [users, query, roleFilter, statusFilter, isSuperAdmin]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const roleColor = { super_admin: "#7C3AED", admin: "#1E3A8A", fieldworker: "#16A34A" };
  const roleLabel = { super_admin: "Super Admin", admin: "Admin", fieldworker: "Field Worker" };

  // ── USER FORM ──────────────────────────────────────────────
  if (subView === "form") {
    const blank = { full_name: "", email: "", role: "fieldworker", phone: "", program: "", village: "", status: "active", password_hash: "" };
    return <UserForm editing={isSuperAdmin ? editing : null} blank={blank} isSuperAdmin={isSuperAdmin} onSave={saveUser} onCancel={() => { setEditing(null); setSubView("list"); }} />;
  }

  // ── AUDIT LOG VIEW ─────────────────────────────────────────
  if (subView === "audit") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSubView("list")} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
          <div>
            <h2 className="text-[18px] font-bold text-[#111827]">Audit Logs</h2>
            <p className="text-[12px] text-[#6B7280]">{auditLogs.length} entries</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "#1E3A8A" }}>
                <th className="text-left px-4 py-3 text-white font-semibold">Date & Time</th>
                <th className="text-left px-4 py-3 text-white font-semibold">Action</th>
                <th className="text-left px-4 py-3 text-white font-semibold">Module</th>
                <th className="text-left px-4 py-3 text-white font-semibold">By</th>
                <th className="text-left px-4 py-3 text-white font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => {
                const styles = {
                  CREATE: ["#DCFCE7", "#16A34A"], DELETE: ["#FEE2E2", "#DC2626"], STATUS: ["#FFF7ED", "#F97316"],
                  UPDATE: ["#EFF6FF", "#1E3A8A"], LOGIN: ["#F0FDF4", "#16A34A"], LOGIN_FAILED: ["#FEE2E2", "#DC2626"],
                  EXPORT: ["#FAF5FF", "#7C3AED"], PRINT: ["#FAF5FF", "#7C3AED"],
                };
                const [bg, fg] = styles[log.action] || ["#EFF6FF", "#1E3A8A"];
                return (
                  <tr key={log.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFF]"}>
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{new Date(log.created_at).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: bg, color: fg }}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{log.module || "—"}</td>
                    <td className="px-4 py-3 text-[#374151] font-medium">{log.user_email}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{log.details}</td>
                  </tr>
                );
              })}
              {auditLogs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#9CA3AF]">No audit logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── USER LIST ──────────────────────────────────────────────
  return (
    <div>
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-5 max-w-[380px] w-full shadow-xl">
            <p className="text-[15px] font-bold text-[#111827] mb-1">✅ Temporary Password</p>
            <p className="text-[12px] text-[#6B7280] mb-3">Share this securely with <b>{tempPasswordModal.full_name}</b>. It will only be shown once — they must change it on first login.</p>
            <div className="flex items-center justify-between bg-[#F3F4F6] rounded-lg px-3 py-2.5 mb-4">
              <span className="font-mono text-[15px] font-bold text-[#1E3A8A]">{tempPasswordModal.password}</span>
              <button onClick={() => { navigator.clipboard?.writeText(tempPasswordModal.password); showToast("Copied to clipboard."); }}
                className="text-[11px] font-semibold px-2 py-1 rounded border border-[#E5E7EB]">Copy</button>
            </div>
            <button onClick={() => setTempPasswordModal(null)} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A" }}>
              Done
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">{isSuperAdmin ? "User Management" : "Field Workers"}</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} {isSuperAdmin ? "users" : "field workers"} · {isSuperAdmin ? "Super Admin" : "Admin"}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSuperAdmin && (
            <button onClick={() => setSubView("audit")}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
              <Clock size={13} /> Audit Logs
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={exportUsersCSV}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
              <FileSpreadsheet size={13} /> CSV
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={printUsersPDF}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
              <Printer size={13} /> PDF
            </button>
          )}
          <button onClick={() => { setEditing(null); setSubView("form"); }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold"
            style={{ background: "#1E3A8A", color: "#fff" }}>
            <Plus size={14} /> {isSuperAdmin ? "Add User" : "Add Field Worker"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {isSuperAdmin && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Users", value: users.length, color: "#1E3A8A", tint: "#EFF6FF" },
            { label: "Active", value: users.filter(u => u.status === "active").length, color: "#16A34A", tint: "#DCFCE7" },
            { label: "Admins", value: users.filter(u => u.role === "admin" || u.role === "super_admin").length, color: "#F97316", tint: "#FFF7ED" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.tint }}>
                <Users size={16} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#111827]">{s.value}</p>
                <p className="text-[11px] text-[#6B7280]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone, village..."
            className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        {isSuperAdmin && (
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="fieldworker">Field Worker</option>
          </select>
        )}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}
          className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#6B7280] hover:bg-[#F3F4F6]">
          <RefreshCw size={13} /> Reset
        </button>
      </div>

      {/* User Cards */}
      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading users...</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Users size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No users found.</p>
          <button onClick={() => { setEditing(null); setSubView("form"); }}
            className="mt-3 rounded-xl px-4 py-2 text-[12px] font-bold text-white"
            style={{ background: "#1E3A8A" }}>{isSuperAdmin ? "Add First User" : "Add First Field Worker"}</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map(u => (
            <div key={u.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderLeft: `4px solid ${u.status === "active" ? (roleColor[u.role] || "#1E3A8A") : "#D1D5DB"}` }}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] text-white shrink-0"
                  style={{ background: u.status === "active" ? (roleColor[u.role] || "#1E3A8A") : "#9CA3AF" }}>
                  {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[13.5px] text-[#111827]">{u.full_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                      style={{ background: (roleColor[u.role] || "#1E3A8A") + "18", color: roleColor[u.role] || "#1E3A8A" }}>
                      {roleLabel[u.role] || u.role}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                      style={{
                        background: u.status === "active" ? "#DCFCE7" : u.status === "suspended" ? "#FEE2E2" : "#F3F4F6",
                        color: u.status === "active" ? "#16A34A" : u.status === "suspended" ? "#DC2626" : "#6B7280"
                      }}>
                      {u.status === "active" ? "Active" : u.status === "suspended" ? "Suspended" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                    <span>✉ {u.email}</span>
                    {u.phone && <><span>•</span><span>📞 {u.phone}</span></>}
                    {u.program && <><span>•</span><span>📋 {PROGRAM_MAP[u.program]?.short || u.program}</span></>}
                    {u.village && <><span>•</span><span><MapPin size={10} className="inline" /> {u.village}</span></>}
                    <span>•</span>
                    <span>📅 {new Date(u.created_at).toLocaleDateString("en-IN")}</span>
                    <span>•</span>
                    <span>🕓 Last login: {u.last_login ? new Date(u.last_login).toLocaleString("en-IN") : "Never"}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleStatus(u)} title={u.status === "active" ? "Deactivate" : "Activate"}
                      className="p-2 rounded-lg hover:bg-[#F3F4F6]">
                      {u.status === "active"
                        ? <CheckCircle size={15} className="text-[#16A34A]" />
                        : <XCircle size={15} className="text-[#9CA3AF]" />}
                    </button>
                    <button onClick={() => { setEditing(u); setSubView("form"); }}
                      className="p-2 rounded-lg text-[#1E3A8A] hover:bg-[#EFF6FF]"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteTarget(u)}
                      className="p-2 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-[12px] text-[#6B7280]">
            Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40 hover:bg-[#F3F4F6]">← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium border"
                style={page === p ? { background: "#1E3A8A", color: "#fff", borderColor: "#1E3A8A" } : { borderColor: "#E5E7EB" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40 hover:bg-[#F3F4F6]">Next →</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <Trash2 size={16} className="text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">Delete User?</p>
                <p className="text-[12px] text-[#6B7280]">{deleteTarget.full_name}</p>
              </div>
            </div>
            <p className="text-[12px] text-[#6B7280] mb-4">This action cannot be undone. The user will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteUser(deleteTarget)}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Delete</button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── USER FORM COMPONENT ──────────────────────────────────── */
function UserForm({ editing, blank, isSuperAdmin, onSave, onCancel }) {
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Required";
    if (form.role === "admin" || form.role === "super_admin") {
      if (!form.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
    }
    // Password is optional on create — left blank, a temporary password is auto-generated.
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Must be 10 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => { e.preventDefault(); if (validate()) onSave(form); };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div>
          <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit User" : "Add New User"}</h2>
          <p className="text-[12px] text-[#6B7280]">User Management · Admin only</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-5">
          <SectionHeader title="Account Information" color="#1E3A8A" />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Full Name" required error={errors.full_name}>
              <Input value={form.full_name} onChange={set("full_name")} placeholder="Enter full name" />
            </Field>
            <Field label="Role" required>
              {isSuperAdmin ? (
                <Select value={form.role} onChange={set("role")} options={[
                  { value: "super_admin", label: "Super Admin" },
                  { value: "admin", label: "Admin" },
                  { value: "fieldworker", label: "Field Worker" },
                ]} />
              ) : (
                <input value="Field Worker" disabled className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
              )}
            </Field>
            {form.role === "fieldworker" ? (
              <>
                <Field label="Password" error={errors.password_hash}
                  hint={editing ? "Leave blank to keep existing password. Entering a new one resets it as a temporary password." : "Leave blank to auto-generate a temporary password"}>
                  <input type="password" value={form.password_hash || ""}
                    onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))}
                    className={inputCls} placeholder={editing ? "Leave blank to keep" : "Auto-generated if blank"} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={set("status")} options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                  ]} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Email Address" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="user@tapasvi.org" inputMode="email"
                    readOnly={!!editing} className={editing ? inputCls + " bg-[#F3F4F6] text-[#6B7280]" : inputCls} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={set("status")} options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                  ]} />
                </Field>
              </>
            )}
          </div>

          <SectionHeader title="Contact & Assignment" color="#1E3A8A" />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Phone Number" error={errors.phone}>
              <Input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0,10) }))}
                placeholder="10-digit mobile" inputMode="numeric" />
            </Field>
            <Field label="Assigned Program">
              <Select value={form.program || ""} onChange={set("program")} options={[
                { value: "", label: "All Programs" },
                ...PROGRAMS.map(p => ({ value: p.key, label: p.short }))
              ]} />
            </Field>
            <Field label="Assigned Village">
              <Input value={form.village || ""} onChange={set("village")} placeholder="Village name (optional)" />
            </Field>
          </div>

          {form.role === "fieldworker" && (
            <div className="bg-[#DCFCE7] rounded-xl p-4 mt-2">
              <p className="text-[12px] font-semibold text-[#16A34A] mb-1">✅ Field Worker Login</p>
              <p className="text-[11.5px] text-[#374151]">
                Full Name + Password తో login చేయగలరు. Admin మాత్రమే password మార్చగలరు.
              </p>
            </div>
          )}
          {(form.role === "admin" || form.role === "super_admin") && (
            <div className="bg-[#EFF6FF] rounded-xl p-4 mt-2">
              <p className="text-[12px] font-semibold text-[#1E3A8A] mb-1">ℹ {form.role === "super_admin" ? "Super Admin" : "Admin"} Login</p>
              <p className="text-[11.5px] text-[#374151]">
                {form.role === "super_admin" ? "Super Admin" : "Admin"} Supabase Auth తో login చేస్తారు. ఈ ఫారమ్ కేవలం డైరెక్టరీ ఎంట్రీ మాత్రమే క్రియేట్ చేస్తుంది — నిజంగా లాగిన్ చేయాలంటే Supabase Dashboard లో Auth user క్రియేట్ చేసి, user_roles టేబుల్ లో role = '{form.role}' ఇన్సర్ట్ చేయాలి.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center gap-3">
          <button type="submit" onClick={submit}
            className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold text-white"
            style={{ background: "#1E3A8A" }}>
            {editing ? "Update User" : "Create User"}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "Arial", color: "#111" }}>
          <h2 style={{ color: "#DC2626" }}>App Error</h2>
          <pre style={{ background: "#FEF2F2", padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {this.state.error.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px", background: "#1E3A8A", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================
   SETTINGS MODULE (V1) — Super Admin only
   ============================================================ */
function SettingsHub({ currentUser, showToast, logAppAudit, beneficiaries }) {
  const [subView, setSubView] = useState(null); // null | "organization" | "programs"

  const CATEGORIES = [
    { key: "organization", label: "Organization Settings", desc: "NGO name, logo, registration, contact details", icon: Building2, color: "#1E3A8A", tint: "#EFF6FF", ready: true },
    { key: "users", label: "User Management", desc: "Manage from the Users tab", icon: Lock, color: "#7C3AED", tint: "#FAF5FF", ready: false, redirectNote: "Users ట్యాబ్ లో మేనేజ్ చేయండి" },
    { key: "programs", label: "Program Management", desc: "Program name, code, prefix, color", icon: ClipboardList, color: "#F97316", tint: "#FFF7ED", ready: true },
    { key: "locations", label: "Location Master", desc: "District, Mandal, Village", icon: MapPin, color: "#16A34A", tint: "#DCFCE7", ready: false },
    { key: "masterdata", label: "Master Data", desc: "Education, Occupation, Skills, Gender...", icon: Database, color: "#0EA5E9", tint: "#F0F9FF", ready: false },
    { key: "training", label: "Training Settings", desc: "Courses, trainers, assessments, certificates", icon: BookOpen, color: "#DB2777", tint: "#FDF2F8", ready: true },
    { key: "security", label: "Security", desc: "Password policy, session timeout, audit logs", icon: ShieldCheck, color: "#DC2626", tint: "#FEF2F2", ready: false },
    { key: "preferences", label: "App Preferences", desc: "Theme, language", icon: Palette, color: "#6366F1", tint: "#EEF2FF", ready: false },
  ];

  const openCategory = (cat) => {
    if (!cat.ready) {
      showToast(cat.redirectNote || "ఇది తర్వాతి అప్‌డేట్‌లో వస్తుంది.", "info");
      return;
    }
    setSubView(cat.key);
  };

  if (subView === "organization") {
    return <OrganizationSettings currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} onBack={() => setSubView(null)} />;
  }
  if (subView === "programs") {
    return <ProgramManagement currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} beneficiaries={beneficiaries} onBack={() => setSubView(null)} />;
  }
  if (subView === "training") {
    return <TrainingSettingsHub currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} onBack={() => setSubView(null)} />;
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[18px] font-bold text-[#111827]">Settings</h2>
        <p className="text-[12px] text-[#6B7280]">Super Admin only · V1</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => openCategory(cat)}
            className="text-left bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition relative">
            {!cat.ready && (
              <span className="absolute top-3 right-3 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                SOON
              </span>
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: cat.tint }}>
              <cat.icon size={18} style={{ color: cat.color }} />
            </div>
            <p className="text-[13px] font-semibold text-[#111827] mb-1">{cat.label}</p>
            <p className="text-[11px] text-[#6B7280] leading-snug">{cat.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function OrganizationSettings({ currentUser, showToast, logAppAudit, onBack }) {
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const BLANK = { id: 1, ngo_name: "", logo_url: "", registration_number: "", address: "", district: "", state: "", pincode: "", phone: "", email: "", website: "" };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("org_settings").select("*").eq("id", 1).single();
      const loaded = data || BLANK;
      setForm(loaded);
      setOriginal(loaded);
      setLoading(false);
    })();
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("org_settings").upsert({ ...form, id: 1 });
    if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }
    // Log only the fields that actually changed
    const changedFields = Object.keys(form).filter(k => k !== "id" && (original?.[k] || "") !== (form[k] || ""));
    for (const field of changedFields) {
      await logAppAudit("UPDATE", "Settings", `Organization Settings — ${field}: "${original?.[field] || ""}" → "${form[field] || ""}"`);
    }
    setOriginal(form);
    showToast("Organization settings saved.");
    setSaving(false);
  };

  if (loading || !form) {
    return (
      <div className="text-center py-16 text-[#9CA3AF]">
        <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
        <p className="text-[13px]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Organization Settings</h2>
          <p className="text-[12px] text-[#6B7280]">NGO identity & contact details</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-1">
        <Field label="NGO Name">
          <Input value={form.ngo_name || ""} onChange={set("ngo_name")} placeholder="TAPASVI Society for Rural Development..." />
        </Field>
        <Field label="Logo URL" hint="ప్రస్తుతానికి image URL మాత్రమే — direct file upload తర్వాతి అప్‌డేట్‌లో వస్తుంది">
          <Input value={form.logo_url || ""} onChange={set("logo_url")} placeholder="https://.../logo.png" />
        </Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Registration Number">
            <Input value={form.registration_number || ""} onChange={set("registration_number")} placeholder="Reg. No." />
          </Field>
          <Field label="Phone">
            <Input value={form.phone || ""} onChange={set("phone")} placeholder="10-digit phone" inputMode="tel" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email || ""} onChange={set("email")} placeholder="contact@tapasvi.org" inputMode="email" />
          </Field>
          <Field label="Website">
            <Input value={form.website || ""} onChange={set("website")} placeholder="https://..." />
          </Field>
          <Field label="Pincode">
            <Input value={form.pincode || ""} onChange={set("pincode")} placeholder="517xxx" />
          </Field>
          <Field label="District">
            <Input value={form.district || ""} onChange={set("district")} placeholder="Tirupati" />
          </Field>
          <Field label="State">
            <Input value={form.state || ""} onChange={set("state")} placeholder="Andhra Pradesh" />
          </Field>
        </div>
        <Field label="Address">
          <textarea value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            className={inputCls} rows={3} placeholder="Full address" />
        </Field>
      </div>

      <button onClick={save} disabled={saving}
        className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white"
        style={{ background: saving ? "#888" : "#1E3A8A" }}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

const PROGRAM_ICON_MAP = {
  Laptop, Scissors, Leaf, BookOpen, Briefcase, Award, Users, MapPin,
  ClipboardList, Building2, Database, ShieldCheck, Palette, TrendingUp, BarChart3,
};
const PROGRAM_COLOR_PRESETS = ["#1E3A8A", "#F97316", "#16A34A", "#DC2626", "#7C3AED", "#0EA5E9", "#DB2777", "#F59E0B"];

/* ============================================================
   TRAINING SETTINGS MODULE — Super Admin only master config
   Stores configuration used later by other modules. Does NOT
   modify existing Training / Enrollment / Attendance / Employment.
   ============================================================ */
function TrainingMasterList({ title, tableName, orderBy, fields, listPrimary, listSecondary, dupCheckFields, showToast, logAppAudit, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subView, setSubView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(tableName).select("*").order(orderBy || "created_at", { ascending: false });
    if (error) { showToast("Error loading " + title + ": " + error.message, "error"); setLoading(false); return; }
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter(x => (x.status || "active") === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(x => fields.some(f => f.searchable && String(x[f.key] || "").toLowerCase().includes(q)));
    }
    return r;
  }, [rows, query, statusFilter]);

  const toggleStatus = async (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from(tableName).update({ status: newStatus }).eq("id", row.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setRows(rs => rs.map(x => x.id === row.id ? { ...x, status: newStatus } : x));
    await logAppAudit(newStatus === "active" ? "ACTIVATE" : "DEACTIVATE", "Training Settings", `${title}: "${row[listPrimary]}" → ${newStatus}`);
    showToast(`${title} ${newStatus === "active" ? "activated" : "deactivated"}.`);
  };

  const deleteRow = async (row) => {
    const { error } = await supabase.from(tableName).delete().eq("id", row.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setRows(rs => rs.filter(x => x.id !== row.id));
    await logAppAudit("DELETE", "Training Settings", `${title} deleted: "${row[listPrimary]}"`);
    showToast(`${title} deleted.`);
    setDeleteTarget(null);
  };

  const saveRow = async (form) => {
    for (const df of dupCheckFields || []) {
      if (!form[df]) continue;
      const dup = rows.find(x => x.id !== editing?.id && String(x[df]).trim().toLowerCase() === String(form[df]).trim().toLowerCase());
      if (dup) { showToast(`${fields.find(f => f.key === df)?.label || df} already exists.`, "error"); return; }
    }
    for (const f of fields) {
      if (f.required && !form[f.key]) { showToast(`${f.label} is required.`, "error"); return; }
    }
    if (editing) {
      const { error } = await supabase.from(tableName).update(form).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setRows(rs => rs.map(x => x.id === editing.id ? { ...x, ...form } : x));
      await logAppAudit("UPDATE", "Training Settings", `${title} updated: "${form[listPrimary]}"`);
      showToast(`${title} updated.`);
    } else {
      const rec = { ...form, status: form.status || "active", created_at: new Date().toISOString() };
      const { data, error } = await supabase.from(tableName).insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setRows(rs => [data, ...rs]);
      await logAppAudit("CREATE", "Training Settings", `${title} created: "${form[listPrimary]}"`);
      showToast(`${title} created.`);
    }
    setEditing(null); setSubView("list");
  };

  if (subView === "form") {
    return <TrainingMasterForm title={title} fields={fields} editing={editing} onSave={saveRow} onCancel={() => { setEditing(null); setSubView("list"); }} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">{title}</h2>
          <p className="text-[12px] text-[#6B7280]">{rows.length} records</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditing(null); setSubView("form"); }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white" style={{ background: "#1E3A8A" }}>
          <Plus size={14} /> Add {title}
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Database size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No records found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(row => (
            <div key={row.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-[#111827]">{row[listPrimary]}</p>
                  {listSecondary?.length > 0 && (
                    <p className="text-[11px] text-[#6B7280]">{listSecondary.map(k => row[k]).filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
                  style={{ background: row.status === "active" ? "#DCFCE7" : "#F3F4F6", color: row.status === "active" ? "#16A34A" : "#6B7280" }}>
                  {row.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleStatus(row)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">
                  {row.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => { setEditing(row); setSubView("form"); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => setDeleteTarget(row)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#DC2626]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle size={16} className="text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">Delete {title}?</p>
                <p className="text-[12px] text-[#6B7280]">{deleteTarget[listPrimary]}</p>
              </div>
            </div>
            <p className="text-[12px] text-[#6B7280] mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteRow(deleteTarget)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrainingMasterForm({ title, fields, editing, onSave, onCancel }) {
  const blank = {};
  fields.forEach(f => { blank[f.key] = f.default !== undefined ? f.default : ""; });
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const set = k => e => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <h2 className="text-[18px] font-bold text-[#111827]">{editing ? "Edit" : "Add"} {title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
        {fields.map(f => (
          <Field key={f.key} label={f.label} required={f.required}>
            {f.type === "select" ? (
              <Select value={form[f.key]} onChange={set(f.key)} options={f.options} />
            ) : f.type === "textarea" ? (
              <textarea value={form[f.key] || ""} onChange={set(f.key)} rows={2} className={inputCls} placeholder={f.placeholder || ""} />
            ) : (
              <Input value={form[f.key] ?? ""} onChange={set(f.key)} placeholder={f.placeholder || ""} type={f.type === "number" ? "number" : "text"} />
            )}
          </Field>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(form)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A" }}>Save</button>
        <button onClick={onCancel} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
      </div>
    </div>
  );
}

function TrainingSingletonSettings({ title, tableName, fields, showToast, logAppAudit, onBack }) {
  const [form, setForm] = useState(null);
  const [rowId, setRowId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(tableName).select("*").limit(1).maybeSingle();
    if (error) { showToast("Error: " + error.message, "error"); setLoading(false); return; }
    if (data) {
      const merged = { ...data };
      fields.forEach(f => {
        if (merged[f.key] === undefined || merged[f.key] === null) {
          merged[f.key] = f.default !== undefined ? f.default : (f.type === "checkbox" ? false : "");
        }
      });
      setForm(merged); setRowId(data.id);
    }
    else {
      const blank = {};
      fields.forEach(f => { blank[f.key] = f.default !== undefined ? f.default : (f.type === "checkbox" ? false : ""); });
      setForm(blank);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const save = async () => {
    if (rowId) {
      const { error } = await supabase.from(tableName).update(form).eq("id", rowId);
      if (error) { showToast("Error: " + error.message, "error"); return; }
    } else {
      const { data, error } = await supabase.from(tableName).insert(form).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setRowId(data.id);
    }
    await logAppAudit("UPDATE", "Training Settings", `${title} saved`);
    showToast(`${title} saved.`);
  };

  if (loading || !form) {
    return (
      <div className="text-center py-16 text-[#9CA3AF]">
        <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
        <p className="text-[13px]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <h2 className="text-[18px] font-bold text-[#111827]">{title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
        {fields.map(f => (
          <Field key={f.key} label={f.type === "checkbox" ? "" : f.label}>
            {f.type === "select" ? (
              <Select value={form[f.key]} onChange={set(f.key)} options={f.options} />
            ) : f.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-[12.5px] text-[#374151]">
                <input type="checkbox" checked={!!form[f.key]} onChange={set(f.key)} /> {f.checkLabel || f.label}
              </label>
            ) : (
              <Input value={form[f.key] ?? ""} onChange={set(f.key)} placeholder={f.placeholder || ""} type={f.type === "number" ? "number" : "text"} />
            )}
          </Field>
        ))}
      </div>
      <button onClick={save} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white mt-4" style={{ background: "#1E3A8A" }}>Save Settings</button>
    </div>
  );
}

function TrainingSettingsHub({ currentUser, showToast, logAppAudit, onBack }) {
  const [subView, setSubView] = useState(null);

  const COURSE_FIELDS = [
    { key: "course_name", label: "Course Name", required: true, searchable: true },
    { key: "course_code", label: "Course Code", required: true, searchable: true },
    { key: "category", label: "Category", searchable: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "duration", label: "Duration", type: "number" },
    { key: "duration_unit", label: "Duration Unit", type: "select", options: ["Days", "Weeks", "Months"], default: "Weeks" },
    { key: "default_capacity", label: "Default Capacity", type: "number", default: 30 },
    { key: "min_attendance_pct", label: "Minimum Attendance %", type: "number", default: 75 },
    { key: "pass_marks_pct", label: "Pass Marks %", type: "number", default: 40 },
    { key: "certificate_eligible", label: "Certificate Eligible", type: "select", options: ["Yes", "No"], default: "Yes" },
  ];
  const TRAINER_FIELDS = [
    { key: "trainer_name", label: "Trainer Name", required: true, searchable: true },
    { key: "mobile", label: "Mobile", required: true, searchable: true },
    { key: "email", label: "Email", searchable: true },
    { key: "qualification", label: "Qualification" },
    { key: "specialization", label: "Specialization", searchable: true },
    { key: "experience", label: "Experience (years)", type: "number" },
    { key: "assigned_programs", label: "Assigned Programs" },
  ];
  const ASSESSMENT_FIELDS = [
    { key: "assessment_name", label: "Assessment Name", required: true, searchable: true },
    { key: "assessment_type", label: "Assessment Type", type: "select", options: ["Theory", "Practical", "Viva", "Assignment"], default: "Theory" },
    { key: "practical_marks", label: "Practical Marks", type: "number", default: 0 },
    { key: "theory_marks", label: "Theory Marks", type: "number", default: 0 },
    { key: "total_marks", label: "Total Marks", type: "number", default: 100 },
    { key: "pass_marks", label: "Pass Marks", type: "number", default: 40 },
  ];
  const CATEGORY_FIELDS = [
    { key: "category_name", label: "Category Name", required: true, searchable: true },
  ];
  const CERT_FIELDS = [
    { key: "certificate_title", label: "Certificate Title", default: "Certificate of Completion" },
    { key: "certificate_subtitle", label: "Certificate Subtitle", default: "OF COMPLETION" },
    { key: "completion_text", label: "Completion Text", type: "textarea", default: "has successfully completed the training program in" },
    { key: "footer_text", label: "Footer Text", default: "Generated & Verified by TAPASVI DMS" },
    { key: "verification_text", label: "Verification Text", default: "This certificate is valid for all official purposes." },
    { key: "certificate_prefix", label: "Certificate Prefix", placeholder: "e.g. TAP", default: "TAP" },
    { key: "certificate_number_start", label: "Certificate Number Start", type: "number", default: 1 },
    { key: "primary_color", label: "Primary Color (hex)", default: "#1E3A8A" },
    { key: "secondary_color", label: "Secondary Color (hex)", default: "#C9A227" },
    { key: "border_color", label: "Border Color (hex)", default: "#C9A227" },
    { key: "logo_position", label: "Logo Position", type: "select", options: ["Center", "Left", "Right"], default: "Center" },
    { key: "min_attendance_pct_for_cert", label: "Minimum Attendance % Required", type: "number", default: 75 },
    { key: "enable_watermark", label: "Watermark", type: "checkbox", checkLabel: "Show background watermark", default: true },
    { key: "enable_qr_code", label: "QR Code", type: "checkbox", checkLabel: "Enable QR Code on certificate", default: true },
    { key: "enable_seal", label: "Official Seal", type: "checkbox", checkLabel: "Show official seal", default: true },
    { key: "enable_grade", label: "Grade", type: "checkbox", checkLabel: "Show Grade", default: true },
    { key: "enable_score", label: "Score", type: "checkbox", checkLabel: "Show Score %", default: true },
    { key: "enable_beneficiary_id", label: "Beneficiary ID", type: "checkbox", checkLabel: "Show Beneficiary ID", default: true },
    { key: "enable_batch_id", label: "Batch ID", type: "checkbox", checkLabel: "Show Batch ID", default: true },
    { key: "enable_village", label: "Village", type: "checkbox", checkLabel: "Show Village", default: true },
    { key: "enable_duration", label: "Duration", type: "checkbox", checkLabel: "Show Duration", default: true },
    { key: "enable_course_name", label: "Course Name", type: "checkbox", checkLabel: "Show Course Name", default: true },
    { key: "trainer_sign_name", label: "Trainer — Name" },
    { key: "trainer_sign_designation", label: "Trainer — Designation", default: "Trainer" },
    { key: "trainer_sign_image", label: "Trainer — Signature Image URL" },
    { key: "secretary_sign_name", label: "Secretary — Name" },
    { key: "secretary_sign_designation", label: "Secretary — Designation", default: "Secretary" },
    { key: "secretary_sign_image", label: "Secretary — Signature Image URL" },
  ];
  const ATTENDANCE_FIELDS = [
    { key: "min_attendance_pct", label: "Minimum Attendance %", type: "number", default: 75 },
    { key: "allow_late_attendance", label: "Late Attendance", type: "checkbox", checkLabel: "Allow late attendance" },
    { key: "grace_minutes", label: "Grace Minutes", type: "number", default: 10 },
    { key: "auto_absent_after", label: "Auto Absent After (minutes)", type: "number", default: 30 },
    { key: "multiple_attendance_per_day", label: "Multiple Attendance/Day", type: "checkbox", checkLabel: "Allow multiple attendance entries per day" },
  ];
  const BATCH_FIELDS = [
    { key: "default_capacity", label: "Default Capacity", type: "number", default: 30 },
    { key: "maximum_capacity", label: "Maximum Capacity", type: "number", default: 40 },
    { key: "allow_over_capacity", label: "Over Capacity", type: "checkbox", checkLabel: "Allow enrollment beyond capacity" },
    { key: "auto_close_batch", label: "Auto Close Batch", type: "checkbox", checkLabel: "Auto-close batch when full" },
  ];

  const TILES = [
    { key: "courses", label: "Course / Trade Management", desc: "Course master, duration, capacity, pass criteria", icon: BookOpen, color: "#DB2777", tint: "#FDF2F8" },
    { key: "trainers", label: "Trainer Management", desc: "Trainer profiles, qualification, specialization", icon: Users, color: "#1E3A8A", tint: "#EFF6FF" },
    { key: "assessments", label: "Assessment Settings", desc: "Theory/Practical/Viva marks & pass criteria", icon: ClipboardList, color: "#F97316", tint: "#FFF7ED" },
    { key: "certificate", label: "Certificate Settings", desc: "Prefix, format, signature, QR code", icon: Award, color: "#16A34A", tint: "#DCFCE7" },
    { key: "attendance", label: "Attendance Rules", desc: "Minimum %, grace time, auto-absent", icon: Clock, color: "#7C3AED", tint: "#FAF5FF" },
    { key: "batch", label: "Batch Settings", desc: "Default/maximum capacity, auto-close", icon: Briefcase, color: "#0EA5E9", tint: "#F0F9FF" },
    { key: "categories", label: "Training Categories", desc: "Digital Skills, Tailoring, Beautician...", icon: Database, color: "#DC2626", tint: "#FEF2F2" },
  ];

  const commonProps = { showToast, logAppAudit, onBack: () => setSubView(null) };

  if (subView === "courses") return <TrainingMasterList title="Course" tableName="training_courses" fields={COURSE_FIELDS} listPrimary="course_name" listSecondary={["course_code", "category"]} dupCheckFields={["course_code"]} {...commonProps} />;
  if (subView === "trainers") return <TrainingMasterList title="Trainer" tableName="training_trainers" fields={TRAINER_FIELDS} listPrimary="trainer_name" listSecondary={["mobile", "specialization"]} dupCheckFields={["email", "mobile"]} {...commonProps} />;
  if (subView === "assessments") return <TrainingMasterList title="Assessment" tableName="training_assessments" fields={ASSESSMENT_FIELDS} listPrimary="assessment_name" listSecondary={["assessment_type", "total_marks"]} dupCheckFields={[]} {...commonProps} />;
  if (subView === "categories") return <TrainingMasterList title="Training Category" tableName="training_categories" fields={CATEGORY_FIELDS} listPrimary="category_name" listSecondary={[]} dupCheckFields={["category_name"]} {...commonProps} />;
  if (subView === "certificate") return <TrainingSingletonSettings title="Certificate Settings" tableName="training_certificate_settings" fields={CERT_FIELDS} {...commonProps} />;
  if (subView === "attendance") return <TrainingSingletonSettings title="Attendance Rules" tableName="training_attendance_rules" fields={ATTENDANCE_FIELDS} {...commonProps} />;
  if (subView === "batch") return <TrainingSingletonSettings title="Batch Settings" tableName="training_batch_settings" fields={BATCH_FIELDS} {...commonProps} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Training Settings</h2>
          <p className="text-[12px] text-[#6B7280]">Master configuration for the Training module · Super Admin only</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map(t => (
          <button key={t.key} onClick={() => setSubView(t.key)}
            className="text-left bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: t.tint }}>
              <t.icon size={18} style={{ color: t.color }} />
            </div>
            <p className="text-[13px] font-semibold text-[#111827] mb-1">{t.label}</p>
            <p className="text-[11px] text-[#6B7280] leading-snug">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   TRAINING ASSESSMENT MANAGEMENT MODULE
   Reuses Field / Input / Select / inputCls / selectCls / downloadCSV /
   showToast / logAppAudit exactly like the rest of the app.
   Tables used: assessment_records (the assessment event),
   assessment_marks (per-beneficiary marks for that event).
   ============================================================ */
function certificateGradeTier(pct) {
  if (pct >= 90) return "Gold";
  if (pct >= 75) return "Silver";
  if (pct >= 60) return "Bronze";
  return "Not Eligible";
}

function computeAssessmentResult(theory, practical, viva, maxMarks, passMarks, isAbsent) {
  if (isAbsent) return { total: 0, percentage: 0, grade: "-", result: "Absent", certEligible: "No" };
  const total = (Number(theory) || 0) + (Number(practical) || 0) + (Number(viva) || 0);
  const pct = maxMarks > 0 ? Math.round((total / maxMarks) * 1000) / 10 : 0;
  if (total < Number(passMarks || 0)) return { total, percentage: pct, grade: "Fail", result: "Fail", certEligible: "No" };
  let grade = "D";
  if (pct >= 90) grade = "A+";
  else if (pct >= 80) grade = "A";
  else if (pct >= 70) grade = "B";
  else if (pct >= 60) grade = "C";
  else if (pct >= 50) grade = "D";
  else grade = "Pass";
  return { total, percentage: pct, grade, result: "Pass", certEligible: "Yes" };
}

function printAssessmentResultSheet(assessment, rows) {
  const w = window.open("", "_blank");
  if (!w) return;
  const logoUrl = window.location.origin + "/icon-512-transparent.png";
  const thead = "<tr><th>Beneficiary ID</th><th>Name</th><th>Theory</th><th>Practical</th><th>Viva</th><th>Total</th><th>%</th><th>Grade</th><th>Result</th></tr>";
  const tbody = rows.map(r => (
    "<tr><td>" + (r.beneficiary_id || "") + "</td><td>" + (r.beneficiary_name || "") + "</td><td>" +
    (r.is_absent ? "-" : r.theory_marks ?? 0) + "</td><td>" + (r.is_absent ? "-" : r.practical_marks ?? 0) + "</td><td>" +
    (r.is_absent ? "-" : r.viva_marks ?? 0) + "</td><td>" + r.total_marks + "</td><td>" + r.percentage + "%</td><td>" +
    r.grade + "</td><td>" + r.result + "</td></tr>"
  )).join("");
  const css = "@page{margin:110px 20px 40px 20px;} body{font-family:Arial,sans-serif;font-size:11px;color:#111827;} " +
    ".print-header{position:fixed;top:0;left:0;right:0;background:#fff;padding:14px 20px;border-bottom:2px solid #1E3A8A;display:flex;gap:10px;align-items:center;} " +
    ".print-header img{width:38px;height:38px;} .print-header .org{font-weight:bold;color:#1E3A8A;font-size:15px;} " +
    "table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;} th{background:#F3F4F6;}";
  const header = "<div class='print-header'><img src='" + logoUrl + "'/><div><div class='org'>TAPASVI Society</div><div style='font-size:10px;color:#666;'>Assessment Result Sheet</div></div></div>";
  const meta = "<p><b>Batch:</b> " + (assessment.batch_label || "") + " &nbsp; <b>Course:</b> " + (assessment.course || "") +
    " &nbsp; <b>Trainer:</b> " + (assessment.trainer || "") + "</p><p><b>Date:</b> " + (assessment.assessment_date || "") +
    " &nbsp; <b>Type:</b> " + (assessment.assessment_type || "") + " &nbsp; <b>Max Marks:</b> " + assessment.max_marks +
    " &nbsp; <b>Pass Marks:</b> " + assessment.pass_marks + "</p>";
  w.document.write("<!DOCTYPE html><html><head><title>Assessment Result Sheet</title><style>" + css + "</style></head><body>" +
    header + "<div style='margin-top:6px;'>" + meta + "<table>" + thead + tbody + "</table></div></body></html>");
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 600);
}

function AssessmentManagement({ batches, beneficiaries, enrollments, currentUser, isAdmin, showToast, logAppAudit, onClose }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState("list"); // list | form | marks | details
  const [editing, setEditing] = useState(null);
  const [active, setActive] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [query, setQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("assessment_records").select("*").order("assessment_date", { ascending: false });
    if (error) { showToast("Error loading assessments: " + error.message, "error"); setLoading(false); return; }
    setAssessments(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const courseOptions = useMemo(() => [...new Set(assessments.map(a => a.course).filter(Boolean))], [assessments]);
  const trainerOptions = useMemo(() => [...new Set(assessments.map(a => a.trainer).filter(Boolean))], [assessments]);

  const filtered = useMemo(() => {
    let r = assessments;
    if (batchFilter !== "all") r = r.filter(a => a.batch_id === batchFilter);
    if (courseFilter !== "all") r = r.filter(a => a.course === courseFilter);
    if (trainerFilter !== "all") r = r.filter(a => a.trainer === trainerFilter);
    if (statusFilter !== "all") r = r.filter(a => a.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(a => (a.batch_label || "").toLowerCase().includes(q) || (a.course || "").toLowerCase().includes(q) || (a.trainer || "").toLowerCase().includes(q));
    }
    return r;
  }, [assessments, batchFilter, courseFilter, trainerFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const saveAssessment = async (form) => {
    const dup = assessments.find(a => a.id !== editing?.id && a.batch_id === form.batch_id && a.assessment_date === form.assessment_date && a.assessment_type === form.assessment_type);
    if (dup) { showToast("An assessment for this Batch, Date and Type already exists.", "error"); return; }
    if (Number(form.pass_marks) > Number(form.max_marks)) { showToast("Pass Marks cannot exceed Maximum Marks.", "error"); return; }
    if (Number(form.max_marks) <= 0) { showToast("Maximum Marks must be greater than 0.", "error"); return; }

    const now = new Date().toISOString();
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      const rec = { ...form, updated_by: who, updated_at: now };
      const { error } = await supabase.from("assessment_records").update(rec).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setAssessments(as => as.map(a => a.id === editing.id ? { ...a, ...rec } : a));
      await logAppAudit("UPDATE", "Assessments", `Assessment updated: ${form.batch_label} — ${form.assessment_type} (${form.assessment_date})`);
      showToast("Assessment updated.");
    } else {
      const rec = { ...form, status: "Scheduled", created_by: who, created_at: now, updated_by: who, updated_at: now };
      const { data, error } = await supabase.from("assessment_records").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setAssessments(as => [data, ...as]);
      await logAppAudit("CREATE", "Assessments", `Assessment created: ${form.batch_label} — ${form.assessment_type} (${form.assessment_date})`);
      showToast("Assessment created.");
    }
    setEditing(null); setSubView("list");
  };

  const deleteAssessment = async (a) => {
    await supabase.from("assessment_marks").delete().eq("assessment_id", a.id);
    const { error } = await supabase.from("assessment_records").delete().eq("id", a.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setAssessments(as => as.filter(x => x.id !== a.id));
    await logAppAudit("DELETE", "Assessments", `Assessment deleted: ${a.batch_label} — ${a.assessment_type} (${a.assessment_date})`);
    showToast("Assessment deleted.");
    setDeleteTarget(null);
  };

  const markCompleted = async (a) => {
    await supabase.from("assessment_records").update({ status: "Completed" }).eq("id", a.id);
    setAssessments(as => as.map(x => x.id === a.id ? { ...x, status: "Completed" } : x));
  };

  if (subView === "form") {
    return <AssessmentForm batches={batches} editing={editing} onSave={saveAssessment} onCancel={() => { setEditing(null); setSubView("list"); }} />;
  }
  if ((subView === "marks" || subView === "details") && active) {
    return (
      <AssessmentMarksScreen
        assessment={active}
        readOnly={subView === "details"}
        beneficiaries={beneficiaries}
        enrollments={enrollments}
        showToast={showToast}
        logAppAudit={logAppAudit}
        onCompleted={() => markCompleted(active)}
        onClose={() => { setActive(null); setSubView("list"); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Assessment Management</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} assessments</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end mb-4">
          <button onClick={() => { setEditing(null); setSubView("form"); }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white" style={{ background: "#1E3A8A" }}>
            <Plus size={14} /> New Assessment
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search batch, course, trainer..." className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
          <option value="all">All Batches</option>
          {(batches || []).map(b => <option key={b.batch_id} value={b.batch_id}>{b.venue} · {b.training_type}</option>)}
        </select>
        <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
          <option value="all">All Courses</option>
          {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={trainerFilter} onChange={e => { setTrainerFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
          <option value="all">All Trainers</option>
          {trainerOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
          <option value="all">All Status</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ClipboardList size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No assessments found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-[#111827]">{a.batch_label} · {a.assessment_type}</p>
                  <p className="text-[11px] text-[#6B7280]">{a.course} · {a.trainer} · {a.assessment_date} · Max {a.max_marks} / Pass {a.pass_marks}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
                  style={{ background: a.status === "Completed" ? "#DCFCE7" : "#FEF3C7", color: a.status === "Completed" ? "#16A34A" : "#B45309" }}>
                  {a.status}
                </span>
              </div>
              {a.remarks && <p className="text-[11.5px] text-[#6B7280] mt-2">{a.remarks}</p>}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => { setActive(a); setSubView("marks"); }}
                  className="flex-1 rounded-lg py-1.5 text-[11.5px] font-medium text-white" style={{ background: "#1E3A8A" }}>Enter Marks</button>
                <button onClick={() => { setActive(a); setSubView("details"); }}
                  className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">View</button>
                {isAdmin && (
                  <button onClick={() => { setEditing(a); setSubView("form"); }}
                    className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">Edit</button>
                )}
                {isAdmin && (
                  <button onClick={() => setDeleteTarget(a)}
                    className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#DC2626]">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">Prev</button>
          <span className="text-[12px] text-[#6B7280]">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">Next</button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle size={16} className="text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">Delete Assessment?</p>
                <p className="text-[12px] text-[#6B7280]">{deleteTarget.batch_label} — {deleteTarget.assessment_type}</p>
              </div>
            </div>
            <p className="text-[12px] text-[#6B7280] mb-4">This will also remove all marks entered for this assessment. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => deleteAssessment(deleteTarget)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentForm({ batches, editing, onSave, onCancel }) {
  const blank = { batch_id: "", batch_label: "", course: "", trainer: "", assessment_date: new Date().toISOString().slice(0, 10), assessment_type: "Theory", max_marks: 100, pass_marks: 40, remarks: "" };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const set = k => e => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const onBatchChange = (batchId) => {
    const b = (batches || []).find(x => x.batch_id === batchId);
    setForm(f => ({
      ...f, batch_id: batchId,
      batch_label: b ? `${b.venue} (${b.start_date})` : "",
      course: b?.training_type || f.course,
      trainer: b?.trainer_name || f.trainer,
    }));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <h2 className="text-[18px] font-bold text-[#111827]">{editing ? "Edit" : "New"} Assessment</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
        <Field label="Batch" required>
          <select value={form.batch_id} onChange={e => onBatchChange(e.target.value)} className={selectCls}>
            <option value="">Select batch</option>
            {(batches || []).map(b => <option key={b.batch_id} value={b.batch_id}>{b.venue} — {b.training_type} ({b.start_date})</option>)}
          </select>
        </Field>
        <Field label="Course"><Input value={form.course} onChange={set("course")} placeholder="Course / Trade" /></Field>
        <Field label="Trainer"><Input value={form.trainer} onChange={set("trainer")} placeholder="Trainer name" /></Field>
        <Field label="Assessment Date" required><Input type="date" value={form.assessment_date} onChange={set("assessment_date")} /></Field>
        <Field label="Assessment Type" required>
          <Select value={form.assessment_type} onChange={set("assessment_type")} options={["Theory", "Practical", "Viva"]} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Maximum Marks" required><Input type="number" value={form.max_marks} onChange={set("max_marks")} /></Field>
          <Field label="Pass Marks" required><Input type="number" value={form.pass_marks} onChange={set("pass_marks")} /></Field>
        </div>
        <Field label="Remarks"><textarea value={form.remarks || ""} onChange={set("remarks")} rows={2} className={inputCls} /></Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(form)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A" }}>Save</button>
        <button onClick={onCancel} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
      </div>
    </div>
  );
}

function AssessmentMarksScreen({ assessment, readOnly, beneficiaries, enrollments, showToast, logAppAudit, onCompleted, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const enrolled = useMemo(() => (enrollments || []).filter(e => e.batch_id === assessment.batch_id), [enrollments, assessment.batch_id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("assessment_marks").select("*").eq("assessment_id", assessment.id);
    if (error) { showToast("Error loading marks: " + error.message, "error"); setLoading(false); return; }
    const existing = new Map((data || []).map(r => [r.beneficiary_id, r]));
    const built = enrolled.map(e => {
      const ex = existing.get(e.beneficiary_id);
      return ex || {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${assessment.id}-${e.beneficiary_id}-${Date.now()}`,
        assessment_id: assessment.id, beneficiary_id: e.beneficiary_id, beneficiary_name: e.beneficiary_name || e.beneficiary_id,
        theory_marks: 0, practical_marks: 0, viva_marks: 0, total_marks: 0, percentage: 0, grade: "-", result: "-", certificate_eligible: "No", is_absent: false,
      };
    });
    setRows(built);
    setLoading(false);
  };
  useEffect(() => { load(); }, [assessment.id]);

  const updateCell = (beneficiaryId, field, value) => {
    setRows(rs => rs.map(r => {
      if (r.beneficiary_id !== beneficiaryId) return r;
      const next = { ...r, [field]: value };
      if (field !== "is_absent") {
        const num = Number(value);
        if (num < 0) { showToast("Marks cannot be negative.", "error"); return r; }
      }
      const calc = computeAssessmentResult(next.theory_marks, next.practical_marks, next.viva_marks, assessment.max_marks, assessment.pass_marks, next.is_absent);
      return { ...next, total_marks: calc.total, percentage: calc.percentage, grade: calc.grade, result: calc.result, certificate_eligible: calc.certEligible };
    }));
  };

  const bulkSave = async () => {
    for (const r of rows) {
      const sum = (Number(r.theory_marks) || 0) + (Number(r.practical_marks) || 0) + (Number(r.viva_marks) || 0);
      if (!r.is_absent && sum > Number(assessment.max_marks)) {
        showToast(`${r.beneficiary_name}: marks exceed Maximum Marks (${assessment.max_marks}).`, "error");
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase.from("assessment_marks").upsert(rows, { onConflict: "assessment_id,beneficiary_id" });
    setSaving(false);
    if (error) { showToast("Error saving marks: " + error.message, "error"); return; }
    await logAppAudit("UPDATE", "Assessments", `Marks saved for ${assessment.batch_label} — ${assessment.assessment_type} (${rows.length} beneficiaries)`);
    showToast("Marks saved.");
    onCompleted && onCompleted();
  };

  const exportCSV = () => {
    const csvRows = rows.map(r => ({
      "Beneficiary ID": r.beneficiary_id, Name: r.beneficiary_name,
      "Theory Marks": r.is_absent ? "-" : r.theory_marks, "Practical Marks": r.is_absent ? "-" : r.practical_marks, "Viva Marks": r.is_absent ? "-" : r.viva_marks,
      Total: r.total_marks, Percentage: r.percentage, Grade: r.grade, Result: r.result, "Certificate Eligible": r.certificate_eligible,
    }));
    downloadCSV(csvRows, `assessment_${assessment.assessment_type}_${assessment.assessment_date}.csv`);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">{readOnly ? "Assessment Details" : "Marks Entry"}</h2>
          <p className="text-[12px] text-[#6B7280]">{assessment.batch_label} · {assessment.course} · {assessment.trainer}</p>
        </div>
      </div>
      <p className="text-[11.5px] text-[#6B7280] mb-4">{assessment.assessment_type} · {assessment.assessment_date} · Max {assessment.max_marks} / Pass {assessment.pass_marks}</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => printAssessmentResultSheet(assessment, rows)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]">
          <Printer size={13} /> Print Result Sheet
        </button>
        <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]">
          <FileSpreadsheet size={13} /> Export CSV
        </button>
        <button onClick={() => printAssessmentResultSheet(assessment, rows)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]">
          <Printer size={13} /> Export PDF
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Users size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No beneficiaries enrolled in this batch.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-[11.5px] border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-[#6B7280] border-b border-[#E5E7EB]">
                <th className="py-2 pr-2">ID</th><th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Theory</th><th className="py-2 pr-2">Practical</th><th className="py-2 pr-2">Viva</th>
                <th className="py-2 pr-2">Total</th><th className="py-2 pr-2">%</th><th className="py-2 pr-2">Grade</th>
                <th className="py-2 pr-2">Result</th><th className="py-2 pr-2">Absent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.beneficiary_id} className="border-b border-[#F3F4F6]">
                  <td className="py-2 pr-2 font-mono">{r.beneficiary_id}</td>
                  <td className="py-2 pr-2">{r.beneficiary_name}</td>
                  {["theory_marks", "practical_marks", "viva_marks"].map(f => (
                    <td key={f} className="py-2 pr-2">
                      {readOnly ? (r.is_absent ? "-" : r[f]) : (
                        <input type="number" disabled={r.is_absent} value={r[f]} onChange={e => updateCell(r.beneficiary_id, f, e.target.value)}
                          className="w-16 rounded border border-[#E5E7EB] px-1.5 py-1 text-[11.5px]" />
                      )}
                    </td>
                  ))}
                  <td className="py-2 pr-2 font-semibold">{r.total_marks}</td>
                  <td className="py-2 pr-2">{r.percentage}%</td>
                  <td className="py-2 pr-2">{r.grade}</td>
                  <td className="py-2 pr-2">
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: r.result === "Pass" ? "#DCFCE7" : r.result === "Absent" ? "#F3F4F6" : "#FEE2E2", color: r.result === "Pass" ? "#16A34A" : r.result === "Absent" ? "#6B7280" : "#DC2626" }}>
                      {r.result}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    {readOnly ? (r.is_absent ? "Yes" : "No") : (
                      <input type="checkbox" checked={!!r.is_absent} onChange={e => updateCell(r.beneficiary_id, "is_absent", e.target.checked)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && rows.length > 0 && (
        <button onClick={bulkSave} disabled={saving} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white mt-4 disabled:opacity-60" style={{ background: "#1E3A8A" }}>
          {saving ? "Saving..." : "Save All Marks"}
        </button>
      )}
    </div>
  );
}

/* ============================================================
   CERTIFICATE GENERATION MODULE
   Reuses Field / Input / Select / inputCls / selectCls / downloadCSV /
   showToast / logAppAudit. QR codes rendered via a public QR image API
   (no new npm dependency needed — consistent with the rest of the app,
   which has no PDF library and instead uses window.print()).
   Table used: certificates.
   ============================================================ */
function qrImageUrl(data, size) {
  return "https://api.qrserver.com/v1/create-qr-code/?size=" + (size || 140) + "x" + (size || 140) + "&data=" + encodeURIComponent(data);
}

async function nextCertificateNumber() {
  const { data: settings } = await supabase.from("training_certificate_settings").select("*").limit(1).maybeSingle();
  const base = (settings?.certificate_prefix || "TAP").replace(/-+$/, "");
  const year = new Date().getFullYear();
  const stub = `${base}-${year}-`;
  const startNum = Number(settings?.certificate_number_start) || 1;
  const { data: existing } = await supabase.from("certificates").select("certificate_number").ilike("certificate_number", stub + "%");
  let maxNum = startNum - 1;
  (existing || []).forEach(c => {
    const n = parseInt(String(c.certificate_number).replace(stub, ""), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  });
  return { number: stub + String(maxNum + 1).padStart(6, "0"), settings };
}

function printCertificate(cert, settings, org) {
  const w = window.open("", "_blank");
  if (!w) return;
  const logoUrl = window.location.origin + "/icon-512-transparent.png";
  const qrData = `CERT:${cert.certificate_number}|ID:${cert.beneficiary_id}|COURSE:${cert.course}|DATE:${cert.certificate_date}`;
  const primary = settings?.primary_color || "#1E3A8A";
  const secondary = settings?.secondary_color || "#C9A227";
  const border = settings?.border_color || settings?.secondary_color || "#C9A227";
  const durationText = cert.start_date && cert.end_date ? `${cert.start_date} to ${cert.end_date}` : "";

  const chip = (icon, label, value) => (!value ? "" :
    "<div class='chip'><div class='chipicon'>" + icon + "</div><div><div class='chiplbl'>" + label + "</div><div class='chipval'>" + value + "</div></div></div>");
  const chips = [
    settings?.enable_beneficiary_id !== false ? chip("&#128100;", "Beneficiary ID", cert.beneficiary_id) : "",
    settings?.enable_batch_id !== false ? chip("&#128214;", "Batch ID", cert.batch_id) : "",
    settings?.enable_village !== false ? chip("&#128205;", "Village", cert.village) : "",
    settings?.enable_duration !== false ? chip("&#128197;", "Duration", durationText) : "",
    settings?.enable_grade !== false ? chip("&#9733;", "Grade", cert.grade) : "",
    settings?.enable_score !== false ? chip("&#127942;", "Score", cert.percentage ? cert.percentage + "%" : "") : "",
  ].join("");

  const sig = (name, designation) => (!name ? "" :
    "<div class='sig'><div class='sigscript'>" + name + "</div><div class='line'></div><div class='nm'>" + name + "</div><div class='role'>" + (designation || "").toUpperCase() + "</div></div>");
  const signatures = [
    sig(cert.trainer || settings?.trainer_sign_name, settings?.trainer_sign_designation || "Trainer"),
    settings?.secretary_sign_name ? sig(settings.secretary_sign_name, settings.secretary_sign_designation || "Secretary") : "",
  ].filter(Boolean).join("");

  const legalLines = org?.registration_number ? "<div>Regd. No.: " + org.registration_number + "</div>" : "";

  const footerParts = [
    org?.website ? "&#127760; " + org.website : "",
    [org?.district, org?.state].filter(Boolean).join(", ") ? "&#128205; " + [org?.district, org?.state].filter(Boolean).join(", ") : "",
    org?.email ? "&#9993; " + org.email : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  const css = "@page{size:landscape;margin:0;} " +
    "*{box-sizing:border-box;} body{margin:0;font-family:'Lato',Arial,sans-serif;background:#fff;}" +
    "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Great+Vibes&family=Lato:wght@400;700&display=swap');" +
    ".sheet{width:100vw;height:100vh;position:relative;padding:16px;background:#fdfbf5;}" +
    ".frame{position:relative;width:100%;height:100%;border:3px solid " + border + ";padding:8px;}" +
    ".frame:before{content:'';position:absolute;inset:6px;border:1.5px solid " + secondary + ";}" +
    ".corner{position:absolute;width:24px;height:24px;border:2px solid " + secondary + ";}" +
    ".corner.tl{top:14px;left:14px;border-right:none;border-bottom:none;} .corner.tr{top:14px;right:14px;border-left:none;border-bottom:none;}" +
    ".corner.bl{bottom:14px;left:14px;border-right:none;border-top:none;} .corner.br{bottom:14px;right:14px;border-left:none;border-top:none;}" +
    (settings?.enable_watermark !== false ? ".watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:100px;color:" + primary + ";opacity:0.045;letter-spacing:6px;transform:rotate(-18deg);pointer-events:none;}" : "") +
    ".legal{position:absolute;top:22px;left:26px;font-size:9px;color:#374151;line-height:1.5;}" +
    ".qrbox{position:absolute;top:20px;right:24px;text-align:center;}" +
    ".qrbox img{border:2px solid " + secondary + ";padding:3px;background:#fff;}" +
    ".scanlbl{margin-top:4px;background:" + primary + ";color:#fff;font-size:8px;font-weight:700;letter-spacing:1px;border-radius:10px;padding:2px 8px;}" +
    ".content{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:14px 60px 0;}" +
    ".logo{width:54px;height:54px;object-fit:contain;} .org{font-size:19px;font-weight:700;color:" + primary + ";letter-spacing:2px;margin-top:5px;text-transform:uppercase;}" +
    ".org-sub{font-size:10px;color:#6B7280;}" +
    ".title{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:" + secondary + ";margin:12px 0 0;letter-spacing:2px;}" +
    ".subtitle{font-size:13px;letter-spacing:3px;color:" + primary + ";font-weight:700;margin-top:2px;}" +
    ".rule{width:90px;height:2px;background:" + secondary + ";margin:8px auto 12px;}" +
    ".sub{font-size:12px;color:#6B7280;font-style:italic;}" +
    ".name{font-family:'Great Vibes',cursive;font-size:42px;color:" + primary + ";margin:4px 0 2px;line-height:1;}" +
    ".course{font-size:13.5px;color:#111827;margin:6px 0 2px;max-width:680px;}" +
    ".coursename{font-size:15px;font-weight:700;color:" + primary + ";text-transform:uppercase;margin-top:3px;}" +
    ".chips{display:flex;gap:0;margin:12px 0 4px;border-top:1px solid #E5E7EB;padding-top:8px;width:100%;max-width:760px;justify-content:center;flex-wrap:wrap;}" +
    ".chip{display:flex;align-items:center;gap:6px;padding:0 12px;border-right:1px dashed #E5E7EB;}" +
    ".chip:last-child{border-right:none;}" +
    ".chipicon{width:20px;height:20px;border-radius:50%;background:" + primary + ";color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;}" +
    ".chiplbl{font-size:8px;color:#9CA3AF;text-transform:uppercase;} .chipval{font-size:11px;font-weight:700;color:#111827;}" +
    ".certrow{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:760px;border:1px dashed " + secondary + ";border-radius:8px;padding:6px 16px;margin-top:10px;font-size:10px;color:#374151;}" +
    ".certrow b{color:#DC2626;}" +
    ".sigrow{display:flex;align-items:flex-end;justify-content:space-around;width:100%;max-width:780px;margin-top:26px;gap:10px;}" +
    ".sig{text-align:center;flex:1;} .sig .sigscript{font-family:'Great Vibes',cursive;font-size:20px;color:#111827;margin-bottom:2px;}" +
    ".sig .line{border-top:1px solid #9CA3AF;width:130px;margin:0 auto 4px;}" +
    ".sig .nm{font-size:10.5px;font-weight:700;color:#111827;} .sig .role{font-size:8.5px;color:#9CA3AF;letter-spacing:0.5px;}" +
    (settings?.enable_seal !== false ? ".seal{width:60px;height:60px;border-radius:50%;border:2px solid " + secondary + ";display:flex;align-items:center;justify-content:center;flex-direction:column;color:" + secondary + ";font-size:7.5px;font-weight:700;letter-spacing:0.5px;flex-shrink:0;}.seal .star{font-size:13px;line-height:1.2;}" : "") +
    ".footerbar{position:absolute;bottom:14px;left:14px;right:14px;background:" + primary + ";color:#fff;font-size:9.5px;padding:6px 20px;border-radius:6px;text-align:center;}";

  const html = "<!DOCTYPE html><html><head><title>Certificate " + cert.certificate_number + "</title><style>" + css + "</style></head><body>" +
    "<div class='sheet'><div class='frame'>" +
    "<div class='corner tl'></div><div class='corner tr'></div><div class='corner bl'></div><div class='corner br'></div>" +
    (settings?.enable_watermark !== false ? "<div class='watermark'>TAPASVI</div>" : "") +
    (legalLines ? "<div class='legal'>" + legalLines + "</div>" : "") +
    (settings?.enable_qr_code !== false ? "<div class='qrbox'><img src='" + qrImageUrl(qrData, 84) + "' width='84' height='84'/><div class='scanlbl'>SCAN TO VERIFY</div></div>" : "") +
    "<div class='content'>" +
    "<img class='logo' src='" + logoUrl + "'/>" +
    "<div class='org'>" + (org?.ngo_name || "TAPASVI Society") + "</div>" +
    (org?.registration_number ? "<div class='org-sub'>Society Registration No.: " + org.registration_number + "</div>" : "") +
    "<div class='title'>" + (settings?.certificate_title || "Certificate").toUpperCase() + "</div>" +
    "<div class='subtitle'>" + (settings?.certificate_subtitle || "OF COMPLETION") + "</div>" +
    "<div class='rule'></div>" +
    "<div class='sub'>This is to certify that</div>" +
    "<div class='name'>" + (cert.beneficiary_name || "") + "</div>" +
    "<div class='course'>" + (settings?.completion_text || "has successfully completed the training program in") + "</div>" +
    (settings?.enable_course_name !== false ? "<div class='coursename'>" + (cert.course || "") + "</div>" : "") +
    "<div class='course'>conducted by " + (org?.ngo_name || "TAPASVI Society") + "</div>" +
    "<div class='chips'>" + chips + "</div>" +
    "<div class='certrow'><div>Certificate No.: <b>" + cert.certificate_number + "</b></div><div>Issue Date: " + (cert.certificate_date || "") + "</div><div>" + (settings?.verification_text || "This certificate is valid for all official purposes.") + "</div></div>" +
    "<div class='sigrow'>" + signatures +
    (settings?.enable_seal !== false ? "<div class='seal'><span class='star'>&#9733;</span>" + (org?.ngo_name ? org.ngo_name.split(" ")[0].toUpperCase() : "TAPASVI") + "<br/>OFFICIAL SEAL</div>" : "") +
    "</div>" +
    "</div>" +
    "<div class='footerbar'>" + (footerParts || (settings?.footer_text || "Generated &amp; Verified by TAPASVI DMS")) + "</div>" +
    "</div></div>" +
    "</body></html>";
  w.document.write(html);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 800);
}

function CertificateManagement({ isAdmin, currentUser, showToast, logAppAudit, onClose }) {
  const [tab, setTab] = useState("issued"); // issued | eligible | verify
  const [certs, setCerts] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [orgSettings, setOrgSettings] = useState(null);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState("");
  const PER_PAGE = 8;

  const loadAll = async () => {
    setLoading(true);
    const [{ data: certData, error: certErr }, { data: marks }, { data: records }, { data: settingsData }, { data: orgData }, { data: batchData }, { data: attRecords }, { data: attRules }] = await Promise.all([
      supabase.from("certificates").select("*").order("generated_at", { ascending: false }),
      supabase.from("assessment_marks").select("*").eq("result", "Pass").eq("certificate_eligible", "Yes"),
      supabase.from("assessment_records").select("*"),
      supabase.from("training_certificate_settings").select("*").limit(1).maybeSingle(),
      supabase.from("org_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("batch_trainings").select("*"),
      supabase.from("attendance_records").select("*"),
      supabase.from("training_attendance_rules").select("*").limit(1).maybeSingle(),
    ]);
    if (certErr) { showToast("Error loading certificates: " + certErr.message, "error"); setLoading(false); return; }
    setCerts(certData || []);
    setSettings(settingsData || null);
    setOrgSettings(orgData || null);
    const minAttendance = Number(settingsData?.min_attendance_pct_for_cert) || Number(attRules?.min_attendance_pct) || 75;
    const issuedSet = new Set((certData || []).map(c => c.assessment_id + "::" + c.beneficiary_id));
    const merged = (marks || []).map(m => {
      const rec = (records || []).find(r => r.id === m.assessment_id);
      if (!rec) return null;
      if (issuedSet.has(m.assessment_id + "::" + m.beneficiary_id)) return null;
      const batch = (batchData || []).find(b => b.batch_id === rec.batch_id);
      const mySessions = (attRecords || []).filter(a => a.batch_id === rec.batch_id && a.beneficiary_id === m.beneficiary_id);
      const present = mySessions.filter(a => a.status === "Present" || a.status === "Late").length;
      const attendancePct = mySessions.length > 0 ? Math.round((present / mySessions.length) * 100) : 0;
      const reasons = [];
      if (!batch) reasons.push("Batch record not found");
      else if (batch.status !== "Completed") reasons.push(`Training not yet Completed (currently ${batch.status})`);
      if (mySessions.length > 0 && attendancePct < minAttendance) reasons.push(`Attendance ${attendancePct}% is below required ${minAttendance}%`);
      return { ...m, assessment: rec, batch, attendancePct, eligible: reasons.length === 0, reasons };
    }).filter(Boolean);
    setEligible(merged);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const courseOptions = useMemo(() => [...new Set(certs.map(c => c.course).filter(Boolean))], [certs]);
  const batchOptions = useMemo(() => [...new Set(certs.map(c => c.batch_label).filter(Boolean))], [certs]);
  const trainerOptions = useMemo(() => [...new Set(certs.map(c => c.trainer).filter(Boolean))], [certs]);

  const filteredCerts = useMemo(() => {
    let r = certs;
    if (courseFilter !== "all") r = r.filter(c => c.course === courseFilter);
    if (batchFilter !== "all") r = r.filter(c => c.batch_label === batchFilter);
    if (trainerFilter !== "all") r = r.filter(c => c.trainer === trainerFilter);
    if (statusFilter !== "all") r = r.filter(c => c.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(c => (c.certificate_number || "").toLowerCase().includes(q) || (c.beneficiary_name || "").toLowerCase().includes(q) || (c.course || "").toLowerCase().includes(q));
    }
    return r;
  }, [certs, courseFilter, batchFilter, trainerFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredCerts.length / PER_PAGE));
  const paginated = filteredCerts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const generateCertificate = async (row) => {
    const dup = certs.find(c => c.assessment_id === row.assessment_id && c.beneficiary_id === row.beneficiary_id);
    if (dup) { showToast("A certificate already exists for this assessment result.", "error"); return; }
    if (!row.eligible) { showToast("Cannot generate: " + row.reasons.join("; "), "error"); return; }
    const { number, settings: s } = await nextCertificateNumber();
    const who = currentUser?.username || currentUser?.email || "unknown";
    const now = new Date().toISOString();
    const rec = {
      certificate_number: number,
      certificate_date: now.slice(0, 10),
      assessment_id: row.assessment_id,
      beneficiary_id: row.beneficiary_id,
      beneficiary_name: row.beneficiary_name,
      course: row.assessment.course,
      batch_id: row.assessment.batch_id,
      batch_label: row.assessment.batch_label,
      trainer: row.assessment.trainer,
      village: row.batch?.venue || "",
      start_date: row.batch?.start_date || "",
      end_date: row.batch?.end_date || "",
      grade: row.grade,
      grade_tier: certificateGradeTier(row.percentage),
      percentage: row.percentage,
      status: "Active",
      generated_by: who, generated_at: now,
      reprint_count: 0,
    };
    const { data, error } = await supabase.from("certificates").insert(rec).select().single();
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setCerts(cs => [data, ...cs]);
    setEligible(es => es.filter(e => !(e.assessment_id === row.assessment_id && e.beneficiary_id === row.beneficiary_id)));
    await logAppAudit("CREATE", "Certificates", `Certificate generated: ${number} — ${row.beneficiary_name}`);
    showToast(`Certificate ${number} generated.`);
    setPreview({ ...data, settingsSnapshot: s });
    setTab("issued");
  };

  const doPrint = async (cert, isReprint) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    const now = new Date().toISOString();
    if (isReprint) {
      const { error } = await supabase.from("certificates").update({ reprint_count: (cert.reprint_count || 0) + 1, reprinted_by: who, reprinted_at: now }).eq("id", cert.id);
      if (!error) {
        setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, reprint_count: (c.reprint_count || 0) + 1, reprinted_by: who, reprinted_at: now } : c));
        await logAppAudit("REPRINT", "Certificates", `Certificate reprinted: ${cert.certificate_number}`);
      }
    } else {
      const { error } = await supabase.from("certificates").update({ printed_by: who, printed_at: now }).eq("id", cert.id);
      if (!error) {
        setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, printed_by: who, printed_at: now } : c));
        await logAppAudit("PRINT", "Certificates", `Certificate printed: ${cert.certificate_number}`);
      }
    }
    printCertificate(cert, settings, orgSettings);
  };

  const revokeCertificate = async (cert) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    const now = new Date().toISOString();
    const { error } = await supabase.from("certificates").update({ status: "Revoked", revoked_by: who, revoked_at: now, revoke_reason: revokeReason || null }).eq("id", cert.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, status: "Revoked", revoked_by: who, revoked_at: now, revoke_reason: revokeReason } : c));
    await logAppAudit("REVOKE", "Certificates", `Certificate revoked: ${cert.certificate_number}`);
    showToast("Certificate revoked.");
    setRevokeTarget(null); setRevokeReason("");
  };

  const reissueCertificate = async (cert) => {
    const { number, settings: s } = await nextCertificateNumber();
    const who = currentUser?.username || currentUser?.email || "unknown";
    const now = new Date().toISOString();
    const rec = {
      certificate_number: number, certificate_date: now.slice(0, 10),
      assessment_id: cert.assessment_id, beneficiary_id: cert.beneficiary_id, beneficiary_name: cert.beneficiary_name,
      course: cert.course, batch_id: cert.batch_id, batch_label: cert.batch_label, trainer: cert.trainer,
      village: cert.village, start_date: cert.start_date, end_date: cert.end_date,
      grade: cert.grade, grade_tier: cert.grade_tier, percentage: cert.percentage,
      status: "Active", generated_by: who, generated_at: now, reprint_count: 0,
      reissued_from: cert.certificate_number,
    };
    const { data, error } = await supabase.from("certificates").insert(rec).select().single();
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setCerts(cs => [data, ...cs]);
    await logAppAudit("REISSUE", "Certificates", `Certificate reissued: ${number} (replaces ${cert.certificate_number})`);
    showToast(`Certificate reissued as ${number}.`);
    setPreview({ ...data, settingsSnapshot: s });
  };

  if (preview) {
    return <CertificatePreview cert={preview} settings={settings} orgSettings={orgSettings} onPrint={() => doPrint(preview, false)} onClose={() => setPreview(null)} onVerify={() => { setPreview(null); setTab("verify"); }} />;
  }
  if (tab === "verify") {
    return <CertificateVerify onBack={() => setTab("issued")} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Certificate Generation</h2>
          <p className="text-[12px] text-[#6B7280]">{certs.length} issued · {eligible.length} eligible</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 mt-3 flex-wrap">
        <button onClick={() => setTab("issued")} className={"px-3.5 py-1.5 rounded-lg text-[12px] font-semibold " + (tab === "issued" ? "bg-[#1E3A8A] text-white" : "border border-[#E5E7EB] text-[#374151]")}>Issued Certificates</button>
        <button onClick={() => setTab("eligible")} className={"px-3.5 py-1.5 rounded-lg text-[12px] font-semibold " + (tab === "eligible" ? "bg-[#1E3A8A] text-white" : "border border-[#E5E7EB] text-[#374151]")}>Eligible Students</button>
        <button onClick={() => setTab("verify")} className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border border-[#E5E7EB] text-[#374151]">Verify Certificate</button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading...</p>
        </div>
      ) : tab === "eligible" ? (
        eligible.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF]">
            <Award size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">No new eligible students. Certificates already generated, or no Pass results yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {eligible.map(row => (
              <div key={row.assessment_id + row.beneficiary_id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                <p className="text-[13.5px] font-semibold text-[#111827]">{row.beneficiary_name}</p>
                <p className="text-[11px] text-[#6B7280]">{row.assessment.course} · {row.assessment.batch_label} · {row.assessment.trainer} · Grade {row.grade} · {row.percentage}% · Attendance {row.attendancePct}%</p>
                {!row.eligible && (
                  <p className="text-[11px] text-[#DC2626] mt-1.5">Cannot generate yet: {row.reasons.join("; ")}</p>
                )}
                {isAdmin && (
                  <button onClick={() => generateCertificate(row)} disabled={!row.eligible}
                    className="w-full mt-3 rounded-lg py-1.5 text-[11.5px] font-medium text-white disabled:opacity-40" style={{ background: row.eligible ? "#16A34A" : "#9CA3AF" }}>
                    Generate Certificate
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex gap-3 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search certificate #, name, course..." className={inputCls + " pl-9 text-[12.5px]"} />
            </div>
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Courses</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={batchFilter} onChange={e => { setBatchFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Batches</option>
              {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={trainerFilter} onChange={e => { setTrainerFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Trainers</option>
              {trainerOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>

          {filteredCerts.length === 0 ? (
            <div className="text-center py-16 text-[#9CA3AF]">
              <Award size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">No certificates found.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginated.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#111827]">{c.beneficiary_name} · {c.certificate_number}</p>
                      <p className="text-[11px] text-[#6B7280]">{c.course} · {c.batch_label} · Grade {c.grade} · {c.percentage}% · {c.certificate_date}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
                      style={{ background: c.status === "Active" ? "#DCFCE7" : "#FEE2E2", color: c.status === "Active" ? "#16A34A" : "#DC2626" }}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={() => setPreview(c)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">Preview</button>
                    <button onClick={() => doPrint(c, !!c.printed_at)} className="flex-1 rounded-lg py-1.5 text-[11.5px] font-medium text-white" style={{ background: "#1E3A8A" }}>
                      {c.printed_at ? "Reprint" : "Print"}
                    </button>
                    {isAdmin && c.status === "Active" && (
                      <button onClick={() => setRevokeTarget(c)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#DC2626]">Revoke</button>
                    )}
                    {isAdmin && c.status === "Revoked" && (
                      <button onClick={() => reissueCertificate(c)} className="flex-1 rounded-lg py-1.5 text-[11.5px] font-medium text-white" style={{ background: "#16A34A" }}>Reissue</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">Prev</button>
              <span className="text-[12px] text-[#6B7280]">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12px] disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setRevokeTarget(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle size={16} className="text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">Revoke Certificate?</p>
                <p className="text-[12px] text-[#6B7280]">{revokeTarget.certificate_number} — {revokeTarget.beneficiary_name}</p>
              </div>
            </div>
            <textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} rows={2} placeholder="Reason (optional)" className={inputCls + " mb-4"} />
            <div className="flex gap-2">
              <button onClick={() => revokeCertificate(revokeTarget)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Revoke</button>
              <button onClick={() => { setRevokeTarget(null); setRevokeReason(""); }} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatePreview({ cert, settings, orgSettings, onPrint, onClose, onVerify }) {
  const [logoPosition, setLogoPosition] = useState("center");
  const [logoSize, setLogoSize] = useState(44);
  const [showBorder, setShowBorder] = useState(true);
  const [showWatermark, setShowWatermark] = useState(settings?.enable_watermark !== false);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoadingPreview(false), 350);
    return () => clearTimeout(t);
  }, [cert?.id]);

  if (!cert) {
    return (
      <div>
        <div className="rounded-[20px] p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
          <p className="text-[10px] text-white/70">Dashboard / Certificate</p>
          <h2 className="text-[19px] font-bold mt-1">Certificate Management</h2>
          <p className="text-[11.5px] text-white/85 mt-0.5">Design, Preview and Generate Professional Certificates</p>
        </div>
        <div className="bg-white rounded-[20px] border border-dashed border-[#E5E7EB] p-14 text-center">
          <Award size={32} className="mx-auto mb-3 text-[#D1D5DB]" />
          <p className="text-[14px] font-semibold text-[#6B7280]">No Certificate Selected</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1">Pick a certificate from the list to preview it here.</p>
        </div>
      </div>
    );
  }

  const qrData = `CERT:${cert.certificate_number}|ID:${cert.beneficiary_id}|COURSE:${cert.course}|DATE:${cert.certificate_date}`;
  const org = orgSettings || {};
  const primary = settings?.primary_color || "#1E3A8A";
  const secondary = settings?.secondary_color || "#C9A227";
  const border = settings?.border_color || secondary;
  const durationText = cert.start_date && cert.end_date ? `${cert.start_date} to ${cert.end_date}` : "";
  const legalLines = [
    org.registration_number && `Regd. No.: ${org.registration_number}`,
  ].filter(Boolean);
  const chips = [
    settings?.enable_beneficiary_id !== false && cert.beneficiary_id && ["Beneficiary ID", cert.beneficiary_id],
    settings?.enable_batch_id !== false && cert.batch_id && ["Batch ID", cert.batch_id],
    settings?.enable_village !== false && cert.village && ["Village", cert.village],
    settings?.enable_duration !== false && durationText && ["Duration", durationText],
    settings?.enable_grade !== false && cert.grade && ["Grade", cert.grade],
    settings?.enable_score !== false && cert.percentage && ["Score", cert.percentage + "%"],
  ].filter(Boolean);
  const signatures = [
    (cert.trainer || settings?.trainer_sign_name) && [cert.trainer || settings.trainer_sign_name, settings?.trainer_sign_designation || "Trainer"],
    settings?.secretary_sign_name && [settings.secretary_sign_name, settings.secretary_sign_designation || "Secretary"],
  ].filter(Boolean);
  const footerParts = [
    org.website && `🌐 ${org.website}`,
    [org.district, org.state].filter(Boolean).join(", "),
    org.email && `✉ ${org.email}`,
  ].filter(Boolean);
  const logoAlign = logoPosition === "left" ? "justify-start" : logoPosition === "right" ? "justify-end" : "justify-center";

  return (
    <div>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Great+Vibes&display=swap" />

      <div className="rounded-[20px] p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><ChevronRight size={16} className="rotate-180" /></button>
          <p className="text-[10px] text-white/70">Dashboard / Certificate</p>
        </div>
        <h2 className="text-[19px] font-bold">Certificate Management</h2>
        <p className="text-[11.5px] text-white/85 mt-0.5">Design, Preview and Generate Professional Certificates</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: Controls */}
        <div className="space-y-4 order-2 lg:order-1">
          <div className="bg-white/70 backdrop-blur rounded-[20px] border border-[#E5E7EB] p-4">
            <p className="text-[12px] font-bold text-[#111827] mb-3">Design Controls</p>

            <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">Logo Position</label>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {["left", "center", "right"].map(pos => (
                <button key={pos} onClick={() => setLogoPosition(pos)}
                  className="py-1.5 rounded-lg text-[11px] font-semibold capitalize"
                  style={logoPosition === pos ? { background: primary, color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
                  {pos}
                </button>
              ))}
            </div>

            <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">Logo Size ({logoSize}px)</label>
            <input type="range" min={28} max={64} value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="w-full mb-3" />

            <label className="flex items-center justify-between text-[11.5px] text-[#374151] mb-2.5">
              Show Border
              <input type="checkbox" checked={showBorder} onChange={e => setShowBorder(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between text-[11.5px] text-[#374151]">
              Show Watermark
              <input type="checkbox" checked={showWatermark} onChange={e => setShowWatermark(e.target.checked)} />
            </label>
          </div>

          <div className="bg-white/70 backdrop-blur rounded-[20px] border border-[#E5E7EB] p-4 space-y-2">
            <p className="text-[12px] font-bold text-[#111827] mb-1">Actions</p>
            <button onClick={onPrint} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition active:scale-[0.98]" style={{ background: `linear-gradient(90deg,${primary},#16A34A)` }}>
              <Download size={15} /> Download PDF
            </button>
            <button onClick={onPrint} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] py-3 text-[13px] font-semibold text-[#374151]">
              <Printer size={15} /> Print
            </button>
            {onVerify && (
              <button onClick={onVerify} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] py-3 text-[13px] font-semibold text-[#374151]">
                <CheckCircle size={15} /> Verify QR
              </button>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="order-1 lg:order-2">
          {loadingPreview ? (
            <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-[#F3F4F6] mx-auto mb-3" />
              <div className="h-4 w-1/2 bg-[#F3F4F6] mx-auto mb-2 rounded" />
              <div className="h-8 w-2/3 bg-[#F3F4F6] mx-auto mb-3 rounded" />
              <div className="h-24 w-full bg-[#F3F4F6] rounded" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="relative bg-[#FDFBF5] p-2 min-w-[480px]" style={{ border: showBorder ? `3px solid ${border}` : "none" }}>
                <div className="relative p-4 pt-3 pb-14 text-center" style={{ border: showBorder ? `1.5px solid ${secondary}` : "none" }}>
                  {showBorder && ["top-3 left-3 border-r-0 border-b-0", "top-3 right-3 border-l-0 border-b-0", "bottom-3 left-3 border-r-0 border-t-0", "bottom-3 right-3 border-l-0 border-t-0"].map((pos, i) => (
                    <span key={i} className={"absolute w-5 h-5 " + pos} style={{ border: `2px solid ${secondary}` }} />
                  ))}
                  {showWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 60, color: primary, opacity: 0.05, transform: "rotate(-18deg)", letterSpacing: 4 }}>TAPASVI</span>
                    </div>
                  )}
                  {legalLines.length > 0 && (
                    <div className="absolute top-3 left-3 text-left text-[7.5px] text-[#374151] leading-[1.5] hidden sm:block">
                      {legalLines.map(l => <div key={l}>{l}</div>)}
                    </div>
                  )}
                  <div className="relative">
                    <div className={"flex mb-1 " + logoAlign}><Logo size={logoSize} /></div>
                    <p className="text-[13px] font-bold tracking-widest uppercase" style={{ color: primary }}>{org.ngo_name || "TAPASVI Society"}</p>
                    {org.registration_number && <p className="text-[8.5px] text-[#9CA3AF]">Society Registration No.: {org.registration_number}</p>}
                    <p className="mt-3 text-[24px] font-bold uppercase tracking-wide" style={{ fontFamily: "'Playfair Display', serif", color: secondary }}>{settings?.certificate_title || "Certificate"}</p>
                    <p className="text-[10.5px] font-bold tracking-[3px]" style={{ color: primary }}>{settings?.certificate_subtitle || "OF COMPLETION"}</p>
                    <div className="w-16 h-0.5 mx-auto my-2" style={{ background: secondary }} />
                    <p className="text-[11.5px] text-[#6B7280] italic">This is to certify that</p>
                    <p className="my-1 text-[32px] leading-none" style={{ fontFamily: "'Great Vibes', cursive", color: primary }}>{cert.beneficiary_name}</p>
                    <p className="text-[12px] text-[#111827] mt-2 max-w-[420px] mx-auto">{settings?.completion_text || "has successfully completed the training program in"}</p>
                    {settings?.enable_course_name !== false && <p className="text-[13.5px] font-bold uppercase mt-1" style={{ color: primary }}>{cert.course}</p>}
                    <p className="text-[11.5px] text-[#111827] mt-1">conducted by {org.ngo_name || "TAPASVI Society"}</p>

                    {chips.length > 0 && (
                      <div className="flex justify-center gap-3 mt-3 pt-2 border-t border-[#E5E7EB] flex-wrap max-w-[480px] mx-auto">
                        {chips.map(([label, val]) => (
                          <div key={label} className="text-center px-1">
                            <p className="text-[7px] text-[#9CA3AF] uppercase">{label}</p>
                            <p className="text-[10.5px] font-bold text-[#111827]">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1 items-center w-full max-w-[480px] mx-auto mt-3 rounded-lg px-3 py-2 text-[9px] text-[#374151]" style={{ border: `1px dashed ${secondary}` }}>
                      <div>Certificate No.: <b className="text-[#DC2626]">{cert.certificate_number}</b> &nbsp;·&nbsp; Issue Date: {cert.certificate_date}</div>
                      <div className="text-[8.5px] text-[#6B7280]">{settings?.verification_text || "This certificate is valid for all official purposes."}</div>
                    </div>

                    <div className="flex items-end justify-center gap-3 mt-6 flex-wrap">
                      {signatures[0] && (
                        <div className="text-center flex-1 min-w-[90px]">
                          <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: 16, color: "#111827" }}>{signatures[0][0]}</p>
                          <div className="border-t border-[#9CA3AF] w-20 mx-auto mb-1" />
                          <p className="text-[9px] font-bold text-[#111827]">{signatures[0][0]}</p>
                          <p className="text-[7.5px] text-[#9CA3AF] tracking-wide uppercase">{signatures[0][1]}</p>
                        </div>
                      )}
                      {settings?.enable_seal !== false && (
                        <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0" style={{ border: `2px solid ${secondary}`, color: secondary }}>
                          <span className="text-[11px]">★</span>
                          <span className="text-[5px] font-bold tracking-wide">OFFICIAL SEAL</span>
                        </div>
                      )}
                      {signatures[1] && (
                        <div className="text-center flex-1 min-w-[90px]">
                          <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: 16, color: "#111827" }}>{signatures[1][0]}</p>
                          <div className="border-t border-[#9CA3AF] w-20 mx-auto mb-1" />
                          <p className="text-[9px] font-bold text-[#111827]">{signatures[1][0]}</p>
                          <p className="text-[7.5px] text-[#9CA3AF] tracking-wide uppercase">{signatures[1][1]}</p>
                        </div>
                      )}
                      {signatures[2] && (
                        <div className="text-center flex-1 min-w-[90px]">
                          <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: 16, color: "#111827" }}>{signatures[2][0]}</p>
                          <div className="border-t border-[#9CA3AF] w-20 mx-auto mb-1" />
                          <p className="text-[9px] font-bold text-[#111827]">{signatures[2][0]}</p>
                          <p className="text-[7.5px] text-[#9CA3AF] tracking-wide uppercase">{signatures[2][1]}</p>
                        </div>
                      )}
                    </div>
                    {cert.status === "Revoked" && <p className="text-[12px] text-[#DC2626] font-bold mt-3">CERTIFICATE REVOKED</p>}
                  </div>
                  {settings?.enable_qr_code !== false && (
                    <div className="absolute top-3 right-3 text-center">
                      <img src={qrImageUrl(qrData, 54)} width={54} height={54} alt="QR" className="border-2 p-0.5 bg-white" style={{ borderColor: secondary }} />
                      <p className="text-[6px] font-bold text-white mt-1 rounded-full px-1.5 py-0.5" style={{ background: primary }}>SCAN TO VERIFY</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 rounded-md py-1.5 px-2 text-[8px] text-white text-center" style={{ background: primary }}>
                    {footerParts.length > 0 ? footerParts.join("   |   ") : (settings?.footer_text || "Generated & Verified by TAPASVI DMS")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificateVerify({ onBack }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [org, setOrg] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!input.trim()) return;
    setLoading(true); setNotFound(false); setResult(null);
    const match = input.match(/CERT:([^|]+)/);
    const certNumber = (match ? match[1] : input).trim();
    const [{ data, error }, { data: orgData }] = await Promise.all([
      supabase.from("certificates").select("*").eq("certificate_number", certNumber).maybeSingle(),
      supabase.from("org_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setLoading(false);
    setOrg(orgData || null);
    if (error || !data) { setNotFound(true); return; }
    setResult(data);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <h2 className="text-[18px] font-bold text-[#111827]">Verify Certificate</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
        <Field label="Certificate Number or scanned QR text">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. TAP-2026-000001" />
        </Field>
        <button onClick={verify} disabled={loading} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white mt-3 disabled:opacity-60" style={{ background: "#1E3A8A" }}>
          {loading ? "Checking..." : "Verify"}
        </button>
      </div>

      {notFound && (
        <div className="mt-4 bg-white rounded-2xl border border-[#FEE2E2] p-4 text-center">
          <XCircle size={24} className="mx-auto mb-2 text-[#DC2626]" />
          <p className="text-[13px] font-semibold text-[#DC2626]">Certificate not found.</p>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-3">
            {result.status === "Active" ? <CheckCircle size={20} className="text-[#16A34A]" /> : <XCircle size={20} className="text-[#DC2626]" />}
            <p className="text-[15px] font-bold" style={{ color: result.status === "Active" ? "#16A34A" : "#DC2626" }}>
              {result.status === "Active" ? "Valid Certificate" : "Certificate Revoked"}
            </p>
          </div>
          <p className="text-[12.5px] text-[#374151]"><b>Certificate No:</b> {result.certificate_number}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Beneficiary:</b> {result.beneficiary_name}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Program / Course:</b> {result.course}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Batch:</b> {result.batch_label}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Trainer:</b> {result.trainer}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Issued By:</b> {org?.ngo_name || "TAPASVI Society"}</p>
          <p className="text-[12.5px] text-[#374151]"><b>Issue Date:</b> {result.certificate_date}</p>
          {result.status === "Revoked" && (
            <div className="mt-2 rounded-lg bg-[#FEE2E2] p-2.5">
              <p className="text-[12.5px] text-[#DC2626] font-bold">This certificate was revoked on {result.revoked_at?.slice(0, 10)}.</p>
              {result.revoke_reason && <p className="text-[11.5px] text-[#DC2626] mt-0.5">Reason: {result.revoke_reason}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   REPORTS MODULE — enterprise reporting dashboard, live Supabase data.
   Self-contained: fetches its own data, doesn't touch other modules.
   ============================================================ */
function reportsGroupBy(arr, keyFn) {
  const m = {};
  arr.forEach(x => { const k = keyFn(x) || "Not specified"; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function ageBucket(age) {
  const n = Number(age);
  if (!n) return "Not specified";
  if (n < 18) return "Under 18";
  if (n <= 25) return "18–25";
  if (n <= 35) return "26–35";
  if (n <= 45) return "36–45";
  return "46+";
}

function incomeBucket(income) {
  const n = Number(income);
  if (!n) return "Not specified";
  if (n < 5000) return "Below ₹5,000";
  if (n < 10000) return "₹5,000–9,999";
  if (n < 15000) return "₹10,000–14,999";
  if (n < 20000) return "₹15,000–19,999";
  return "₹20,000+";
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 7); // YYYY-MM
}

function printSimpleTable(title, columns, rows) {
  const w = window.open("", "_blank");
  if (!w) return;
  const thead = "<tr>" + columns.map(c => "<th>" + c.label + "</th>").join("") + "</tr>";
  const tbody = rows.map(r => "<tr>" + columns.map(c => "<td>" + (r[c.key] ?? "") + "</td>").join("") + "</tr>").join("");
  const css = "@page{margin:80px 20px 30px;} body{font-family:Arial,sans-serif;font-size:11px;color:#111827;} " +
    ".hdr{position:fixed;top:0;left:0;right:0;padding:12px 20px;border-bottom:2px solid #1E3A8A;} .hdr b{color:#1E3A8A;font-size:15px;}" +
    "table{width:100%;border-collapse:collapse;margin-top:6px;} th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;} th{background:#F3F4F6;}";
  w.document.write("<!DOCTYPE html><html><head><title>" + title + "</title><style>" + css + "</style></head><body>" +
    "<div class='hdr'><b>TAPASVI Society</b><div style='font-size:11px;color:#666;'>" + title + "</div></div>" +
    "<table>" + thead + tbody + "</table></body></html>");
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 600);
}

function MiniBarChart({ data, color }) {
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[10.5px] text-[#6B7280] w-24 truncate shrink-0">{d.label}</span>
          <div className="flex-1 h-4 bg-[#F3F4F6] rounded overflow-hidden">
            <div className="h-full rounded" style={{ width: (d.count / max * 100) + "%", background: color || "#1E3A8A" }} />
          </div>
          <span className="text-[10.5px] font-semibold text-[#111827] w-8 text-right shrink-0">{d.count}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-[11px] text-[#9CA3AF] text-center py-4">No data</p>}
    </div>
  );
}

function MiniDonut({ data, colors }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let acc = 0;
  const palette = colors || ["#1E3A8A", "#16A34A", "#F97316", "#DB2777", "#7C3AED", "#0EA5E9", "#DC2626"];
  const stops = data.map((d, i) => {
    const start = (acc / total) * 360; acc += d.count;
    const end = (acc / total) * 360;
    return `${palette[i % palette.length]} ${start}deg ${end}deg`;
  }).join(", ");
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full shrink-0" style={{ background: data.length ? `conic-gradient(${stops})` : "#F3F4F6" }} />
      <div className="space-y-1 flex-1 min-w-0">
        {data.slice(0, 6).map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[10.5px] text-[#374151]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: palette[i % palette.length] }} />
            <span className="truncate flex-1">{d.label}</span>
            <span className="font-semibold shrink-0">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportTable({ title, columns, rows, filenamePrefix }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const filtered = useMemo(() => {
    let r = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(row => columns.some(c => String(row[c.key] ?? "").toLowerCase().includes(q)));
    }
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, query, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="text-[13px] font-bold text-[#111827]">{title}</p>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(rows, (filenamePrefix || "report") + ".csv")} className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[10.5px] text-[#374151]">
            <Download size={12} /> CSV
          </button>
          <button onClick={() => printSimpleTable(title, columns, rows)} className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[10.5px] text-[#374151]">
            <Printer size={12} /> Print / PDF
          </button>
        </div>
      </div>
      <div className="relative mb-2">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search..." className={inputCls + " pl-8 text-[11.5px] py-1.5"} />
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[11px] border-collapse min-w-[300px]">
          <thead>
            <tr className="text-left text-[#6B7280] border-b border-[#E5E7EB]">
              {columns.map(c => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className="py-1.5 pr-2 cursor-pointer select-none whitespace-nowrap">
                  {c.label} {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={i} className="border-b border-[#F3F4F6]">
                {columns.map(c => <td key={c.key} className="py-1.5 pr-2 whitespace-nowrap">{row[c.key]}</td>)}
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-6 text-[#9CA3AF]">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[10.5px] disabled:opacity-40">Prev</button>
          <span className="text-[10.5px] text-[#6B7280]">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] text-[10.5px] disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function ReportsModule({ currentUser, isAdmin, showToast }) {
  const [loading, setLoading] = useState(true);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [assessmentMarks, setAssessmentMarks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [employment, setEmployment] = useState([]);
  const [villages, setVillages] = useState([]);
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [section, setSection] = useState("beneficiary");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [fwFilter, setFwFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, bt, en, ar, asr, asm, ct, em, vl, us] = await Promise.all([
        supabase.from("beneficiaries").select("*"),
        supabase.from("batch_trainings").select("*"),
        supabase.from("training_enrollments").select("*"),
        supabase.from("attendance_records").select("*"),
        supabase.from("assessment_records").select("*"),
        supabase.from("assessment_marks").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("employment").select("*"),
        supabase.from("village_master").select("*"),
        supabase.from("users").select("*"),
      ]);
      setBeneficiaries(b.data || []); setBatches(bt.data || []); setEnrollments(en.data || []);
      setAttendanceRecords(ar.data || []); setAssessmentRecords(asr.data || []); setAssessmentMarks(asm.data || []);
      setCertificates(ct.data || []); setEmployment(em.data || []); setVillages(vl.data || []);
      setFieldWorkers((us.data || []).filter(u => u.role === "fieldworker"));
      setLoading(false);
    })();
  }, []);

  const isFW = currentUser?.role === "fieldworker";
  const myUsername = currentUser?.username;

  // Scope to Field Worker's own data first
  const scopedBeneficiaries = useMemo(() => isFW ? beneficiaries.filter(b => b.field_worker_name === myUsername) : beneficiaries, [beneficiaries, isFW, myUsername]);
  const scopedBatches = useMemo(() => isFW ? batches.filter(b => b.assigned_field_worker === myUsername) : batches, [batches, isFW, myUsername]);
  const scopedBatchIds = useMemo(() => new Set(scopedBatches.map(b => b.batch_id)), [scopedBatches]);
  const scopedBeneficiaryIds = useMemo(() => new Set(scopedBeneficiaries.map(b => b.beneficiary_id)), [scopedBeneficiaries]);
  const scopedEnrollments = useMemo(() => isFW ? enrollments.filter(e => scopedBatchIds.has(e.batch_id)) : enrollments, [enrollments, isFW, scopedBatchIds]);
  const scopedAttendance = useMemo(() => isFW ? attendanceRecords.filter(a => scopedBatchIds.has(a.batch_id)) : attendanceRecords, [attendanceRecords, isFW, scopedBatchIds]);
  const scopedAssessmentRecords = useMemo(() => isFW ? assessmentRecords.filter(r => scopedBatchIds.has(r.batch_id)) : assessmentRecords, [assessmentRecords, isFW, scopedBatchIds]);
  const scopedAssessmentIds = useMemo(() => new Set(scopedAssessmentRecords.map(r => r.id)), [scopedAssessmentRecords]);
  const scopedAssessmentMarks = useMemo(() => isFW ? assessmentMarks.filter(m => scopedAssessmentIds.has(m.assessment_id)) : assessmentMarks, [assessmentMarks, isFW, scopedAssessmentIds]);
  const scopedCertificates = useMemo(() => isFW ? certificates.filter(c => scopedBatchIds.has(c.batch_id)) : certificates, [certificates, isFW, scopedBatchIds]);
  const scopedEmployment = useMemo(() => isFW ? employment.filter(e => scopedBeneficiaryIds.has(e.beneficiary_id)) : employment, [employment, isFW, scopedBeneficiaryIds]);

  // Apply global filter bar on top of scope
  const filteredBeneficiaries = useMemo(() => scopedBeneficiaries.filter(b =>
    (programFilter === "all" || b.program === programFilter) &&
    (villageFilter === "all" || b.village === villageFilter) &&
    (fwFilter === "all" || b.field_worker_name === fwFilter) &&
    (!dateFrom || (b.registration_date || "") >= dateFrom) &&
    (!dateTo || (b.registration_date || "") <= dateTo)
  ), [scopedBeneficiaries, programFilter, villageFilter, fwFilter, dateFrom, dateTo]);

  const filteredBatches = useMemo(() => scopedBatches.filter(b =>
    (programFilter === "all" || b.program === programFilter) &&
    (villageFilter === "all" || b.venue === villageFilter) &&
    (trainerFilter === "all" || b.trainer_name === trainerFilter) &&
    (fwFilter === "all" || b.assigned_field_worker === fwFilter) &&
    (batchFilter === "all" || b.batch_id === batchFilter) &&
    (statusFilter === "all" || b.status === statusFilter) &&
    (!dateFrom || (b.start_date || "") >= dateFrom) &&
    (!dateTo || (b.start_date || "") <= dateTo)
  ), [scopedBatches, programFilter, villageFilter, trainerFilter, fwFilter, batchFilter, statusFilter, dateFrom, dateTo]);
  const filteredBatchIds = useMemo(() => new Set(filteredBatches.map(b => b.batch_id)), [filteredBatches]);

  const filteredEnrollments = useMemo(() => scopedEnrollments.filter(e => filteredBatchIds.has(e.batch_id)), [scopedEnrollments, filteredBatchIds]);
  const filteredAttendance = useMemo(() => scopedAttendance.filter(a => filteredBatchIds.has(a.batch_id)), [scopedAttendance, filteredBatchIds]);
  const filteredAssessmentRecords = useMemo(() => scopedAssessmentRecords.filter(r => filteredBatchIds.has(r.batch_id)), [scopedAssessmentRecords, filteredBatchIds]);
  const filteredAssessmentIds = useMemo(() => new Set(filteredAssessmentRecords.map(r => r.id)), [filteredAssessmentRecords]);
  const filteredAssessmentMarks = useMemo(() => scopedAssessmentMarks.filter(m => filteredAssessmentIds.has(m.assessment_id)), [scopedAssessmentMarks, filteredAssessmentIds]);
  const filteredCertificates = useMemo(() => scopedCertificates.filter(c => filteredBatchIds.has(c.batch_id)), [scopedCertificates, filteredBatchIds]);
  const filteredEmployment = useMemo(() => scopedEmployment.filter(e =>
    (statusFilter === "all" || e.status === statusFilter) &&
    (!dateFrom || (e.created_at || "").slice(0, 10) >= dateFrom) &&
    (!dateTo || (e.created_at || "").slice(0, 10) <= dateTo)
  ), [scopedEmployment, statusFilter, dateFrom, dateTo]);

  // Summary cards
  const totalBeneficiaries = filteredBeneficiaries.length;
  const totalTrainings = filteredBatches.length;
  const totalAssessments = filteredAssessmentRecords.length;
  const certsIssued = filteredCertificates.filter(c => c.status === "Active").length;
  const placements = filteredEmployment.filter(e => e.status === "Active").length;
  const totalVillages = new Set(filteredBeneficiaries.map(b => b.village).filter(Boolean)).size;
  const totalTrainers = new Set(filteredBatches.map(b => b.trainer_name).filter(Boolean)).size;
  const completionPct = totalTrainings > 0 ? Math.round(filteredBatches.filter(b => b.status === "Completed").length / totalTrainings * 100) : 0;
  const placementPct = totalBeneficiaries > 0 ? Math.round(placements / totalBeneficiaries * 100) : 0;

  const SUMMARY = [
    { label: "Total Beneficiaries", value: totalBeneficiaries, icon: Users, color: "#1E3A8A" },
    { label: "Total Trainings", value: totalTrainings, icon: BookOpen, color: "#DB2777" },
    { label: "Total Assessments", value: totalAssessments, icon: ClipboardList, color: "#F97316" },
    { label: "Certificates Issued", value: certsIssued, icon: Award, color: "#16A34A" },
    { label: "Placements", value: placements, icon: Briefcase, color: "#0EA5E9" },
    { label: "Total Villages", value: totalVillages, icon: MapPin, color: "#7C3AED" },
    { label: "Total Trainers", value: totalTrainers, icon: Users, color: "#DC2626" },
    { label: "Training Completion %", value: completionPct + "%", icon: CheckCircle, color: "#16A34A" },
    { label: "Placement %", value: placementPct + "%", icon: TrendingUp, color: "#0EA5E9" },
  ];

  // Beneficiary breakdowns
  const programWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.program), [filteredBeneficiaries]);
  const villageWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.village), [filteredBeneficiaries]);
  const genderWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.gender), [filteredBeneficiaries]);
  const ageWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => ageBucket(b.age)), [filteredBeneficiaries]);
  const educationWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.education), [filteredBeneficiaries]);
  const skillWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.skill_interest), [filteredBeneficiaries]);
  const fwWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.field_worker_name), [filteredBeneficiaries]);

  // Training breakdowns
  const batchWise = useMemo(() => filteredBatches.map(b => ({
    label: `${b.venue || ""} · ${b.training_type || ""}`, status: b.status,
    participants: filteredEnrollments.filter(e => e.batch_id === b.batch_id).length,
  })), [filteredBatches, filteredEnrollments]);
  const trainerWise = useMemo(() => reportsGroupBy(filteredBatches, b => b.trainer_name), [filteredBatches]);
  const attendancePctByBatch = useMemo(() => filteredBatches.map(b => {
    const recs = filteredAttendance.filter(a => a.batch_id === b.batch_id);
    const present = recs.filter(a => a.status === "Present" || a.status === "Late").length;
    return { label: `${b.venue || ""} · ${b.training_type || ""}`, pct: recs.length > 0 ? Math.round(present / recs.length * 100) : 0 };
  }), [filteredBatches, filteredAttendance]);
  const ongoingCount = filteredBatches.filter(b => b.status === "Ongoing").length;
  const completedCount = filteredBatches.filter(b => b.status === "Completed").length;
  const dropoutCount = filteredEnrollments.filter(e => e.enrollment_status === "Cancelled" || e.enrollment_status === "Dropped").length;

  // Assessment breakdowns
  const asmTotal = filteredAssessmentMarks.length;
  const asmPass = filteredAssessmentMarks.filter(m => m.result === "Pass").length;
  const asmFail = filteredAssessmentMarks.filter(m => m.result === "Fail").length;
  const gradeDist = useMemo(() => reportsGroupBy(filteredAssessmentMarks, m => m.grade), [filteredAssessmentMarks]);
  const scores = filteredAssessmentMarks.map(m => Number(m.percentage) || 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, c) => a + c, 0) / scores.length) : 0;
  const highScore = scores.length ? Math.max(...scores) : 0;
  const lowScore = scores.length ? Math.min(...scores) : 0;

  // Certificate breakdowns
  const certIssued = filteredCertificates.filter(c => c.status === "Active").length;
  const certRevoked = filteredCertificates.filter(c => c.status === "Revoked").length;
  const certReissued = filteredCertificates.filter(c => c.reissued_from).length;
  const certIssuedIds = new Set(filteredCertificates.map(c => c.assessment_id + "::" + c.beneficiary_id));
  const certPending = filteredAssessmentMarks.filter(m => m.result === "Pass" && m.certificate_eligible === "Yes" && !certIssuedIds.has(m.assessment_id + "::" + m.beneficiary_id)).length;

  // Placement breakdowns
  const companyWise = useMemo(() => reportsGroupBy(filteredEmployment, e => e.employer), [filteredEmployment]);
  const salaryWise = useMemo(() => reportsGroupBy(filteredEmployment, e => incomeBucket(e.monthly_income)), [filteredEmployment]);
  const pendingPlacement = Math.max(0, totalBeneficiaries - placements);

  // Charts
  const monthlyTrainings = useMemo(() => {
    const m = reportsGroupBy(filteredBatches, b => monthKey(b.start_date));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredBatches]);
  const certificateTrend = useMemo(() => {
    const m = reportsGroupBy(filteredCertificates, c => monthKey(c.certificate_date));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredCertificates]);
  const placementTrend = useMemo(() => {
    const m = reportsGroupBy(filteredEmployment, e => monthKey(e.created_at));
    return m.filter(x => x.label !== "Not specified").sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredEmployment]);

  const programOptions = [...new Set(batches.map(b => b.program).filter(Boolean))];
  const villageOptions = [...new Set([...beneficiaries.map(b => b.village), ...batches.map(b => b.venue)].filter(Boolean))];
  const trainerOptions = [...new Set(batches.map(b => b.trainer_name).filter(Boolean))];
  const batchOptions = scopedBatches;

  const SECTIONS = [
    { key: "beneficiary", label: "Beneficiary" },
    { key: "training", label: "Training" },
    { key: "assessment", label: "Assessment" },
    { key: "certificate", label: "Certificate" },
    { key: "placement", label: "Placement" },
  ];

  if (loading) {
    return (
      <div className="text-center py-20 text-[#9CA3AF]">
        <RefreshCw size={26} className="mx-auto mb-3 animate-spin opacity-50" />
        <p className="text-[13px]">Loading reports...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[19px] font-bold text-[#111827]">Reports</h2>
        <p className="text-[12px] text-[#6B7280]">{isFW ? "Showing data for your assigned villages, batches & beneficiaries" : "Live data across the organization"}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9.5px] text-[#9CA3AF] mb-1">From Date</p>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls + " text-[11.5px] py-1.5"} />
          </div>
          <div>
            <p className="text-[9.5px] text-[#9CA3AF] mb-1">To Date</p>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls + " text-[11.5px] py-1.5"} />
          </div>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Programs</option>
            {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Villages</option>
            {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={trainerFilter} onChange={e => setTrainerFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Trainers</option>
            {trainerOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {isAdmin && (
            <select value={fwFilter} onChange={e => setFwFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
              <option value="all">All Field Workers</option>
              {fieldWorkers.map(u => <option key={u.username} value={u.username}>{u.full_name || u.username}</option>)}
            </select>
          )}
          <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Batches</option>
            {batchOptions.map(b => <option key={b.batch_id} value={b.batch_id}>{b.venue} · {b.training_type}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Status</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
        {SUMMARY.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.color + "1A" }}>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <p className="text-[17px] font-bold text-[#111827]">{s.value}</p>
            <p className="text-[10px] text-[#6B7280] leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Program Distribution</p>
          <MiniDonut data={programWise} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Gender Distribution</p>
          <MiniDonut data={genderWise} colors={["#1E3A8A", "#DB2777", "#9CA3AF"]} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Monthly Trainings</p>
          <MiniBarChart data={monthlyTrainings} color="#DB2777" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Certificate Trend</p>
          <MiniBarChart data={certificateTrend} color="#16A34A" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:col-span-2">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Placement Trend</p>
          <MiniBarChart data={placementTrend} color="#0EA5E9" />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={"px-3.5 py-1.5 rounded-lg text-[12px] font-semibold " + (section === s.key ? "bg-[#1E3A8A] text-white" : "border border-[#E5E7EB] text-[#374151]")}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "beneficiary" && (
        <>
          <ReportTable title="Program-wise" columns={[{ key: "label", label: "Program" }, { key: "count", label: "Count" }]} rows={programWise} filenamePrefix="beneficiaries_program" />
          <ReportTable title="Village-wise" columns={[{ key: "label", label: "Village" }, { key: "count", label: "Count" }]} rows={villageWise} filenamePrefix="beneficiaries_village" />
          <ReportTable title="Gender-wise" columns={[{ key: "label", label: "Gender" }, { key: "count", label: "Count" }]} rows={genderWise} filenamePrefix="beneficiaries_gender" />
          <ReportTable title="Age-wise" columns={[{ key: "label", label: "Age Group" }, { key: "count", label: "Count" }]} rows={ageWise} filenamePrefix="beneficiaries_age" />
          <ReportTable title="Education-wise" columns={[{ key: "label", label: "Education" }, { key: "count", label: "Count" }]} rows={educationWise} filenamePrefix="beneficiaries_education" />
          <ReportTable title="Skill Interest-wise" columns={[{ key: "label", label: "Skill Interest" }, { key: "count", label: "Count" }]} rows={skillWise} filenamePrefix="beneficiaries_skill" />
          <ReportTable title="Field Worker-wise" columns={[{ key: "label", label: "Field Worker" }, { key: "count", label: "Count" }]} rows={fwWise} filenamePrefix="beneficiaries_fieldworker" />
        </>
      )}

      {section === "training" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["Ongoing", ongoingCount, "#F97316"], ["Completed", completedCount, "#16A34A"], ["Dropouts", dropoutCount, "#DC2626"]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <ReportTable title="Batch-wise" columns={[{ key: "label", label: "Batch" }, { key: "status", label: "Status" }, { key: "participants", label: "Participants" }]} rows={batchWise} filenamePrefix="training_batch" />
          <ReportTable title="Trainer-wise" columns={[{ key: "label", label: "Trainer" }, { key: "count", label: "Batches" }]} rows={trainerWise} filenamePrefix="training_trainer" />
          <ReportTable title="Attendance % by Batch" columns={[{ key: "label", label: "Batch" }, { key: "pct", label: "Attendance %" }]} rows={attendancePctByBatch} filenamePrefix="training_attendance" />
        </>
      )}

      {section === "assessment" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[["Total", asmTotal, "#1E3A8A"], ["Pass", asmPass, "#16A34A"], ["Fail", asmFail, "#DC2626"]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["Average Score", avgScore + "%"], ["Highest Score", highScore + "%"], ["Lowest Score", lowScore + "%"]].map(([l, v]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[15px] font-bold text-[#111827]">{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <ReportTable title="Grade Distribution" columns={[{ key: "label", label: "Grade" }, { key: "count", label: "Count" }]} rows={gradeDist} filenamePrefix="assessment_grade" />
        </>
      )}

      {section === "certificate" && (
        <div className="grid grid-cols-2 gap-2.5">
          {[["Issued", certIssued, "#16A34A"], ["Pending", certPending, "#F97316"], ["Revoked", certRevoked, "#DC2626"], ["Reissued", certReissued, "#0EA5E9"]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 text-center">
              <p className="text-[22px] font-bold" style={{ color: c }}>{v}</p>
              <p className="text-[11px] text-[#6B7280]">{l}</p>
            </div>
          ))}
        </div>
      )}

      {section === "placement" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["Total Placed", placements, "#16A34A"], ["Placement %", placementPct + "%", "#0EA5E9"], ["Pending", pendingPlacement, "#F97316"]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <ReportTable title="Company-wise" columns={[{ key: "label", label: "Employer" }, { key: "count", label: "Count" }]} rows={companyWise} filenamePrefix="placement_company" />
          <ReportTable title="Salary-wise" columns={[{ key: "label", label: "Income Range" }, { key: "count", label: "Count" }]} rows={salaryWise} filenamePrefix="placement_salary" />
        </>
      )}
    </div>
  );
}

function ProgramManagement({ currentUser, showToast, logAppAudit, beneficiaries, onBack }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subView, setSubView] = useState("list"); // list | form
  const [editing, setEditing] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("programs").select("*").order("display_order", { ascending: true });
    if (error) { showToast("Error loading programs: " + error.message, "error"); setLoading(false); return; }
    setPrograms(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const countFor = (key) => beneficiaries.filter(b => b.program === key).length;

  const filtered = useMemo(() => {
    let r = programs;
    if (statusFilter !== "all") r = r.filter(p => p.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(p => p.program_name?.toLowerCase().includes(q) || p.program_code?.toLowerCase().includes(q) || p.registration_prefix?.toLowerCase().includes(q));
    }
    return r;
  }, [programs, query, statusFilter]);

  const toggleStatus = async (p) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("programs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setPrograms(ps => ps.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    await logAppAudit("STATUS", "Settings", `Program "${p.program_name}" status: ${p.status} → ${newStatus}`);
    showToast(`Program ${newStatus === "active" ? "activated" : "deactivated"}.`);
  };

  const archiveProgram = async (p) => {
    const { error } = await supabase.from("programs").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setPrograms(ps => ps.map(x => x.id === p.id ? { ...x, status: "archived" } : x));
    await logAppAudit("STATUS", "Settings", `Program "${p.program_name}" archived (was ${p.status})`);
    showToast("Program archived. Existing beneficiary records are unaffected.");
    setArchiveTarget(null);
  };

  const saveProgram = async (form) => {
    const dupName = programs.find(p => p.id !== editing?.id && p.program_name.trim().toLowerCase() === form.program_name.trim().toLowerCase());
    const dupCode = programs.find(p => p.id !== editing?.id && p.program_code.trim().toLowerCase() === form.program_code.trim().toLowerCase());
    const dupPrefix = programs.find(p => p.id !== editing?.id && p.registration_prefix.trim().toLowerCase() === form.registration_prefix.trim().toLowerCase());
    if (dupName) { showToast("Program Name already exists.", "error"); return; }
    if (dupCode) { showToast("Program Code already exists.", "error"); return; }
    if (dupPrefix) { showToast("Registration Prefix already exists.", "error"); return; }
    if (form.registration_prefix.length > 10) { showToast("Prefix must be 10 characters or fewer.", "error"); return; }

    if (editing) {
      const { error } = await supabase.from("programs").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setPrograms(ps => ps.map(p => p.id === editing.id ? { ...p, ...form } : p));
      await logAppAudit("UPDATE", "Settings", `Program updated: ${form.program_name} (${form.program_code})`);
      showToast("Program updated.");
    } else {
      const rec = { ...form, key: form.program_code.toLowerCase().replace(/[^a-z0-9]/g, ""), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("programs").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setPrograms(ps => [...ps, data]);
      await logAppAudit("CREATE", "Settings", `Program created: ${form.program_name} (${form.program_code}, prefix ${form.registration_prefix})`);
      showToast("Program created.");
    }
    setEditing(null); setSubView("list");
  };

  const statusBadge = (status) => {
    const map = { active: ["#DCFCE7", "#16A34A", "Active"], inactive: ["#F3F4F6", "#6B7280", "Inactive"], archived: ["#FEE2E2", "#DC2626", "Archived"] };
    const [bg, fg, label] = map[status] || map.inactive;
    return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: bg, color: fg }}>{label}</span>;
  };

  if (subView === "form") {
    return <ProgramForm editing={editing} onSave={saveProgram} onCancel={() => { setEditing(null); setSubView("list"); }} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Program Management</h2>
          <p className="text-[12px] text-[#6B7280]">{programs.length} programs</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditing(null); setSubView("form"); }}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white" style={{ background: "#1E3A8A" }}>
          <Plus size={14} /> Add Program
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, code, prefix..." className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-[13px]">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ClipboardList size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No programs found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(p => {
            const PIcon = PROGRAM_ICON_MAP[p.icon] || ClipboardList;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: (p.color || "#1E3A8A") + "18" }}>
                      <PIcon size={18} style={{ color: p.color || "#1E3A8A" }} />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#111827]">{p.program_name}</p>
                      <p className="text-[11px] text-[#6B7280]">{p.program_code} · Prefix: {p.registration_prefix} · {countFor(p.key)} beneficiaries</p>
                    </div>
                  </div>
                  {statusBadge(p.status)}
                </div>
                {p.description && <p className="text-[11.5px] text-[#6B7280] mt-2">{p.description}</p>}
                <div className="flex gap-2 mt-3">
                  {p.status !== "archived" && (
                    <button onClick={() => toggleStatus(p)}
                      className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">
                      {p.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  )}
                  <button onClick={() => { setEditing(p); setSubView("form"); }}
                    className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">
                    Edit
                  </button>
                  {p.status !== "archived" && (
                    <button onClick={() => setArchiveTarget(p)}
                      className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#DC2626]">
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {archiveTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setArchiveTarget(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle size={16} className="text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#111827]">Archive Program?</p>
                <p className="text-[12px] text-[#6B7280]">{archiveTarget.program_name}</p>
              </div>
            </div>
            <p className="text-[12px] text-[#6B7280] mb-4">
              కొత్త రిజిస్ట్రేషన్‌లకు ఇది కనిపించదు. ఇప్పటికే ఉన్న {countFor(archiveTarget.key)} బెనిఫిషియరీ రికార్డులు సురక్షితంగా ఉంటాయి — ఇది వాటిని తీసేయదు.
            </p>
            <div className="flex gap-2">
              <button onClick={() => archiveProgram(archiveTarget)}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Archive</button>
              <button onClick={() => setArchiveTarget(null)}
                className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramForm({ editing, onSave, onCancel }) {
  const [form, setForm] = useState(editing || {
    program_name: "", program_code: "", registration_prefix: "", description: "",
    color: PROGRAM_COLOR_PRESETS[0], icon: "ClipboardList", display_order: 0, status: "active",
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = () => {
    if (!form.program_name.trim()) return;
    if (!form.program_code.trim()) return;
    if (!form.registration_prefix.trim()) return;
    onSave({
      ...form,
      program_code: form.program_code.trim().toUpperCase(),
      registration_prefix: form.registration_prefix.trim().toUpperCase(),
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <h2 className="text-[18px] font-bold text-[#111827]">{editing ? "Edit Program" : "Add Program"}</h2>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-1">
        <Field label="Program Name" required>
          <Input value={form.program_name} onChange={set("program_name")} placeholder="e.g. Skill Development" />
        </Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Program Code" required hint="Unique, e.g. SKILL">
            <Input value={form.program_code} onChange={set("program_code")} placeholder="SKILL" />
          </Field>
          <Field label="Registration Prefix" required hint="Unique, used in IDs like SKL-0001">
            <Input value={form.registration_prefix} onChange={set("registration_prefix")} placeholder="SKL" />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={inputCls} rows={2} placeholder="Short description" />
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {PROGRAM_COLOR_PRESETS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-8 h-8 rounded-full border-2"
                style={{ background: c, borderColor: form.color === c ? "#111827" : "transparent" }} />
            ))}
          </div>
        </Field>
        <Field label="Icon">
          <div className="flex gap-2 flex-wrap">
            {Object.keys(PROGRAM_ICON_MAP).map(name => {
              const IconComp = PROGRAM_ICON_MAP[name];
              return (
                <button key={name} type="button" onClick={() => setForm(f => ({ ...f, icon: name }))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border"
                  style={form.icon === name ? { background: (form.color || "#1E3A8A") + "18", borderColor: form.color || "#1E3A8A" } : { borderColor: "#E5E7EB" }}>
                  <IconComp size={16} style={{ color: form.icon === name ? (form.color || "#1E3A8A") : "#6B7280" }} />
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Display Order">
            <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className={inputCls} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")} options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]} />
          </Field>
        </div>
      </div>

      <button onClick={submit} className="mt-4 w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: "#1E3A8A" }}>
        {editing ? "Save Changes" : "Create Program"}
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [subView, setSubView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  // Multi-program auto-registration
  const [multiProgDialog, setMultiProgDialog] = useState(null); // { savedRec, eligible: [{key,label,checked}] }
  const [profileBeneficiary, setProfileBeneficiary] = useState(null); // beneficiary to show profile

  // Data state
  const [beneficiaries, setBeneficiaries] = useState([]);
  // Phase 2: dynamic active programs for Beneficiary Registration only (does not affect Dashboard/Training/Employment/Reports)
  const [dynPrograms, setDynPrograms] = useState([]);
  const [dynProgramsLoading, setDynProgramsLoading] = useState(true);
  const [dynProgramsError, setDynProgramsError] = useState(null);
  const [training, setTraining] = useState([]);
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]); // session-based daily attendance
  const [trainingSubView, setTrainingSubView] = useState(null); // null|"batch-form"|"enroll"|"attendance"|"certificates"|"attendance-report"
  const [activeBatch, setActiveBatch] = useState(null);
  const [employment, setEmployment] = useState([]);
  const [villages, setVillages] = useState([]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  // Field Workers only see beneficiaries they themselves registered — not other Field Workers' data
  const visibleBeneficiaries = user?.role === "fieldworker"
    ? beneficiaries.filter(b => b.field_worker_name === user.username)
    : beneficiaries;

  const showToast = (message, type = "success") => setToast({ message, type });

  const logAppAudit = async (action, module, details) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_email: user.username,
      action, module, details,
      created_at: new Date().toISOString()
    });
  };

  const handleLogout = async () => {
    await logAppAudit("LOGOUT", "Auth", `Logged out (${isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Field Worker"})`);
    try {
      if (user?.role === "fieldworker") {
        await supabase.from("app_users").update({ last_logout: new Date().toISOString() }).eq("id", user.userId);
      } else {
        await supabase.from("app_users").update({ last_logout: new Date().toISOString() }).eq("email", user.username);
        await supabase.auth.signOut();
      }
    } catch (e) { /* best-effort — proceed to log out locally regardless */ }
    setUser(null);
  };

  const loadAll = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [ben, trn, batchT, enrl, emp, vil] = await Promise.all([
        supabase.from("beneficiaries_v2").select("*").order("created_at", { ascending: false }),
        supabase.from("training").select("*").order("created_at", { ascending: false }),
        supabase.from("batch_trainings").select("*").order("created_at", { ascending: false }),
        supabase.from("training_enrollments").select("*").order("enrolled_at", { ascending: false }),
        supabase.from("employment").select("*").order("created_at", { ascending: false }),
        supabase.from("village_master").select("*").order("village_name"),
      ]);
      if (ben.error || trn.error || batchT.error || enrl.error || emp.error || vil.error) throw new Error((ben.error || trn.error || batchT.error || enrl.error || emp.error || vil.error).message);
      setBeneficiaries(ben.data || []);
      setTraining(trn.data || []);
      setEmployment(emp.data || []);
      setVillages(vil.data || []);
      setBatches(batchT.data || []);
      setEnrollments(enrl.data || []);
    } catch (err) {
      setLoadError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  // Phase 2: load active programs once for Beneficiary Registration — isolated from loadAll so a failure here
  // never affects Dashboard/Training/Employment/Reports, which continue using the static PROGRAM_MAP.
  const loadDynPrograms = useCallback(async () => {
    setDynProgramsLoading(true); setDynProgramsError(null);
    const { data, error } = await supabase.from("programs").select("*").eq("status", "active").order("display_order", { ascending: true });
    if (error) { setDynProgramsError(error.message); setDynProgramsLoading(false); return; }
    setDynPrograms(data || []);
    setDynProgramsLoading(false);
  }, []);
  useEffect(() => { if (user) loadDynPrograms(); }, [user, loadDynPrograms]);

  // Attendance Management: session-based daily records — isolated loader, same safe pattern as loadDynPrograms.
  const loadAttendanceRecords = useCallback(async () => {
    const { data, error } = await supabase.from("attendance_records").select("*").order("session_date", { ascending: false });
    if (error) { showToast("Error loading attendance history: " + error.message, "error"); return; }
    setAttendanceRecords(data || []);
  }, []);
  useEffect(() => { if (user) loadAttendanceRecords(); }, [user, loadAttendanceRecords]);

  // Map of active dynamic programs, shaped like the legacy PROGRAM_MAP so Registration code can use it the same way.
  // Falls back to the static PROGRAM_MAP for any key not found (keeps old data / a failed fetch working).
  const dynProgramMap = useMemo(() => {
    const m = {};
    dynPrograms.forEach(p => {
      m[p.key] = {
        key: p.key, label: p.program_name, short: p.program_name,
        color: p.color || "#1E3A8A", tint: (p.color || "#1E3A8A") + "18",
        icon: PROGRAM_ICON_MAP[p.icon] || ClipboardList,
        idPrefix: p.registration_prefix, status: p.status,
      };
    });
    return m;
  }, [dynPrograms]);

  // ---- BENEFICIARY CRUD ----
  // ---- ELIGIBILITY ENGINE ----
  const EDU_ORDER = ["No Formal Education", "Below 5th", "5th Class", "7th Class", "10th Class / SSC", "Intermediate / 12th", "ITI", "Diploma", "Degree / Graduate", "Post Graduate"];
  const eduLevel = (edu) => EDU_ORDER.indexOf(edu);

  const checkEligibility = (form, savedProgram, currentBeneficiaries) => {
    const age = parseInt(form.age) || 0;
    const gender = form.gender;
    const edu = form.education || "";
    const eligible = [];

    PROGRAMS.forEach(p => {
      if (p.key === savedProgram) return; // skip current program

      // Check if already registered (same identity in this program)
      const alreadyExists = currentBeneficiaries.find(b =>
        b.program === p.key && (
          (form.identity_type && b.identity_type === form.identity_type && b.identity_number === form.identity_number) ||
          (form.aadhaar_number && b.aadhaar_number === form.aadhaar_number)
        )
      );
      if (alreadyExists) return; // already registered, skip

      let isEligible = false;
      if (p.key === "rydeap") {
        isEligible = age >= 15 && age <= 35;
      } else if (p.key === "womens") {
        isEligible = gender === "Female" && age >= 18 && age <= 45 && eduLevel(edu) >= eduLevel("5th Class");
      } else if (p.key === "waste") {
        isEligible = true; // Everyone eligible
      }
      if (isEligible) {
        eligible.push({ key: p.key, label: p.label, short: p.short, color: p.color, tint: p.tint, checked: true });
      }
    });
    return eligible;
  };

  // Find an existing ACTIVE registration for the same person in the same program
  const findDuplicateRegistration = (form, program, currentBeneficiaries, excludeId) => {
    return currentBeneficiaries.find(b =>
      b.beneficiary_id !== excludeId &&
      b.program === program &&
      b.status !== "Archived" &&
      (
        (form.identity_number && b.identity_number === form.identity_number) ||
        (form.aadhaar_number && b.aadhaar_number === form.aadhaar_number) ||
        (form.phone && b.phone === form.phone)
      )
    );
  };

  const saveBeneficiary = async (form) => {
    if (editing) {
      const { error } = await supabase.from("beneficiaries_v2").update(form).eq("beneficiary_id", editing.beneficiary_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setBeneficiaries(bs => bs.map(b => b.beneficiary_id === editing.beneficiary_id ? { ...b, ...form } : b));
      await logAppAudit("UPDATE", "Beneficiaries", `Updated: ${form.name || editing.beneficiary_id} (${editing.beneficiary_id})`);
      showToast("Beneficiary updated.");
      setEditing(null); setSubView(null); setView("beneficiaries");
    } else {
      // Phase 2 validation: program must exist and be Active (dynamic list is authoritative when available)
      const progFromDynamic = dynProgramMap[form.program];
      const progFromStatic = PROGRAM_MAP[form.program];
      const dynSourceUsable = !dynProgramsError; // if dynamic fetch failed, don't block registration — fall back to static
      if (dynSourceUsable && dynPrograms.length > 0 && !progFromDynamic && !progFromStatic) {
        showToast("Selected program is not available or has been deactivated. Please choose an active program.", "error");
        return;
      }
      const resolvedProgram = progFromDynamic || progFromStatic;

      const dup = findDuplicateRegistration(form, form.program, beneficiaries);
      if (dup) {
        const replace = window.confirm(
          `This person is already registered in ${resolvedProgram?.label || form.program} as ${dup.beneficiary_id}.\n\nTap OK to update that existing registration instead of creating a duplicate, or Cancel to stop.`
        );
        if (!replace) { return; }
        const { error } = await supabase.from("beneficiaries_v2").update(form).eq("beneficiary_id", dup.beneficiary_id);
        if (error) { showToast("Error: " + error.message, "error"); return; }
        setBeneficiaries(bs => bs.map(b => b.beneficiary_id === dup.beneficiary_id ? { ...b, ...form } : b));
        await logAppAudit("UPDATE", "Beneficiaries", `Updated existing registration (duplicate merge): ${dup.beneficiary_id}`);
        showToast(`Updated existing registration: ${dup.beneficiary_id}`);
        setEditing(null); setSubView(null); setView("beneficiaries");
        return;
      }
      const prefix = resolvedProgram?.idPrefix || "BEN";
      const beneficiary_id = nextId(beneficiaries, prefix);
      if (beneficiaries.some(b => b.beneficiary_id === beneficiary_id)) {
        showToast("Registration ID collision detected — please try saving again.", "error");
        return;
      }
      const rec = { ...form, beneficiary_id, created_at: new Date().toISOString() };
      const { error } = await supabase.from("beneficiaries_v2").insert(rec);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      const updatedBeneficiaries = [rec, ...beneficiaries];
      setBeneficiaries(updatedBeneficiaries);
      await logAppAudit("CREATE", "Beneficiaries", `Registered: ${form.name || beneficiary_id} (${beneficiary_id}, ${resolvedProgram?.short || form.program})`);
      showToast(`Registered: ${beneficiary_id}`);

      // Check eligibility for other programs
      const eligible = checkEligibility(form, form.program, updatedBeneficiaries);
      if (eligible.length > 0) {
        setMultiProgDialog({ savedRec: rec, eligible });
        setSubView(null); setEditing(null);
        // Don't navigate away — show dialog first
      } else {
        setEditing(null); setSubView(null); setView("beneficiaries");
      }
    }
  };

  const registerAdditionalPrograms = async (selectedKeys) => {
    if (!multiProgDialog) return;
    const { savedRec } = multiProgDialog;
    const results = [];
    let currentBens = [...beneficiaries];

    for (const key of selectedKeys) {
      const progInfo = dynProgramMap[key] || PROGRAM_MAP[key];
      const dup = findDuplicateRegistration(savedRec, key, currentBens);
      if (dup) {
        results.push(`⚠️ ${progInfo?.short}: already registered as ${dup.beneficiary_id}, skipped`);
        continue;
      }
      const prefix = progInfo?.idPrefix || "BEN";
      const beneficiary_id = nextId(currentBens, prefix);
      const rec = {
        ...savedRec,
        program: key,
        beneficiary_id,
        status: "Registered",
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("beneficiaries_v2").insert(rec);
      if (error) {
        results.push(`❌ ${progInfo?.short}: ${error.message}`);
      } else {
        currentBens = [rec, ...currentBens];
        results.push(`✅ ${progInfo?.short}: ${beneficiary_id}`);
      }
    }
    setBeneficiaries(currentBens);
    setMultiProgDialog(null);
    await logAppAudit("CREATE", "Beneficiaries", `Additional programs for ${savedRec.name || savedRec.beneficiary_id}: ${results.join("; ")}`);
    showToast(`Registered in ${selectedKeys.length} additional program(s).`);
    setView("beneficiaries");
  };

  const deleteBeneficiary = async (b) => {
    const { error } = await supabase.from("beneficiaries_v2").delete().eq("beneficiary_id", b.beneficiary_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setBeneficiaries(bs => bs.filter(x => x.beneficiary_id !== b.beneficiary_id));
    await logAppAudit("DELETE", "Beneficiaries", `Deleted: ${b.name || b.beneficiary_id} (${b.beneficiary_id})`);
  };

  // ---- BATCH TRAINING CRUD ----
  const saveBatch = async (form) => {
    if (!isAdmin) { showToast("Only Admin or Super Admin can create or edit training batches.", "error"); return; }
    if (activeBatch) {
      const wasCompleted = activeBatch.status === "Completed";
      const { error } = await supabase.from("batch_trainings").update(form).eq("batch_id", activeBatch.batch_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setBatches(bs => bs.map(b => b.batch_id === activeBatch.batch_id ? { ...b, ...form } : b));
      await logTrainingAudit("Training Updated", `Updated: ${form.training_name}`);
      // If this batch just became Completed, release its beneficiaries so they're available for new enrollments.
      if (form.status === "Completed" && !wasCompleted) {
        const toRelease = enrollments.filter(e => e.batch_id === activeBatch.batch_id && (e.enrollment_status || "Active") === "Active");
        if (toRelease.length > 0) {
          const { error: relError } = await supabase.from("training_enrollments").update({ enrollment_status: "Completed" }).eq("batch_id", activeBatch.batch_id).eq("enrollment_status", "Active");
          if (!relError) {
            setEnrollments(es => es.map(e => e.batch_id === activeBatch.batch_id && (e.enrollment_status || "Active") === "Active" ? { ...e, enrollment_status: "Completed" } : e));
          }
        }
      }
      showToast("Training updated.");
    } else {
      const rec = { ...form, created_at: new Date().toISOString(), created_by: user.username };
      const { data, error } = await supabase.from("batch_trainings").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setBatches(bs => [data, ...bs]);
      await logTrainingAudit("Training Created", `Created: ${form.training_name}`);
      showToast("Training created.");
    }
    setTrainingSubView(null); setActiveBatch(null); setSubView(null);
  };

  const deleteBatch = async (batch) => {
    const { error } = await supabase.from("batch_trainings").delete().eq("batch_id", batch.batch_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setBatches(bs => bs.filter(b => b.batch_id !== batch.batch_id));
    await logTrainingAudit("Training Deleted", `Deleted: ${batch.training_name}`);
    showToast("Training deleted."); setDeleteTarget(null);
  };

  // A beneficiary counts as "actively enrolled elsewhere" if they have an enrollment with
  // enrollment_status === "Active" in a batch that hasn't finished (status is Upcoming/Ongoing).
  const isActivelyEnrolledElsewhere = (beneficiaryId, excludeBatchId) => {
    return enrollments.some(e => {
      if (e.beneficiary_id !== beneficiaryId) return false;
      if ((e.enrollment_status || "Active") !== "Active") return false;
      if (excludeBatchId && e.batch_id === excludeBatchId) return false;
      const eb = batches.find(b => b.batch_id === e.batch_id);
      const ebStatus = eb?.status || "Upcoming";
      return ebStatus === "Upcoming" || ebStatus === "Ongoing";
    });
  };

  const enrollBeneficiaries = async (beneficiaryIds) => {
    if (!activeBatch) return;
    if (activeBatch.status === "Completed" || activeBatch.status === "Cancelled") {
      showToast("This training is no longer active. Enrollment is closed.", "error");
      return;
    }
    if (!isAdmin && activeBatch.assigned_field_worker !== user.username) {
      showToast("This training is not assigned to you. You cannot enroll beneficiaries here.", "error");
      return;
    }
    const blocked = beneficiaryIds.filter(bid => isActivelyEnrolledElsewhere(bid, activeBatch.batch_id));
    const allowed = beneficiaryIds.filter(bid => !blocked.includes(bid));
    if (blocked.length > 0) {
      showToast(`${blocked.length > 1 ? blocked.length + " beneficiaries are" : "Beneficiary is"} already enrolled in another active training.`, "error");
    }
    if (allowed.length === 0) return;
    const recs = allowed.map(bid => {
      const ben = beneficiaries.find(b => b.beneficiary_id === bid);
      return {
        batch_id: activeBatch.batch_id,
        beneficiary_id: bid,
        beneficiary_name: ben?.name || "",
        program: activeBatch.program,
        attendance_status: "Present",
        attendance_pct: 0,
        certificate_status: "Pending",
        certificate_no: "",
        enrollment_status: "Active",
        enrolled_by: user.username,
        enrolled_at: new Date().toISOString(),
      };
    });
    const { data, error } = await supabase.from("training_enrollments").insert(recs).select();
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setEnrollments(es => [...es, ...(data || [])]);
    await logTrainingAudit("Enrollment", `Enrolled ${allowed.length} in ${activeBatch.training_name}`);
    showToast(`${allowed.length} beneficiaries enrolled!`);
    setTrainingSubView(null); setActiveBatch(null);
  };

  const cancelEnrollment = async (enrollment) => {
    const { error } = await supabase.from("training_enrollments").update({ enrollment_status: "Cancelled" }).eq("enrollment_id", enrollment.enrollment_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setEnrollments(es => es.map(e => e.enrollment_id === enrollment.enrollment_id ? { ...e, enrollment_status: "Cancelled" } : e));
    await logTrainingAudit("Enrollment Cancelled", `Cancelled enrollment for ${enrollment.beneficiary_name || enrollment.beneficiary_id}`);
    showToast("Enrollment cancelled. Beneficiary is available for new enrollments again.");
  };

  // Attendance Management: one call per session date. Upserts a record per beneficiary for that date,
  // then recomputes each beneficiary's overall attendance_pct from their FULL session history (not just today).
  const saveDailyAttendance = async (batchId, sessionDate, marksMap) => {
    const beneficiaryIds = Object.keys(marksMap);
    if (beneficiaryIds.length === 0) return;
    if (!isAdmin && activeBatch?.assigned_field_worker !== user.username) {
      showToast("This training is not assigned to you. You cannot mark attendance here.", "error");
      return;
    }
    const recs = beneficiaryIds.map(bid => {
      const enr = enrollments.find(e => e.batch_id === batchId && e.beneficiary_id === bid);
      return {
        batch_id: batchId,
        beneficiary_id: bid,
        enrollment_id: enr?.enrollment_id || null,
        session_date: sessionDate,
        status: marksMap[bid],
        marked_by: user.username,
      };
    });
    const { data, error } = await supabase.from("attendance_records")
      .upsert(recs, { onConflict: "batch_id,beneficiary_id,session_date" }).select();
    if (error) { showToast("Error: " + error.message, "error"); return; }

    // Merge the new/updated records into local state (replace same-day rows for this batch, keep the rest)
    const updatedRecords = [
      ...attendanceRecords.filter(r => !(r.batch_id === batchId && r.session_date === sessionDate)),
      ...(data || []),
    ];
    setAttendanceRecords(updatedRecords);

    // Recompute attendance_pct per beneficiary from their full history in this batch
    const presentStatuses = ["Present", "Late"];
    for (const bid of beneficiaryIds) {
      const beneficiarySessions = updatedRecords.filter(r => r.batch_id === batchId && r.beneficiary_id === bid);
      const total = beneficiarySessions.length;
      const present = beneficiarySessions.filter(r => presentStatuses.includes(r.status)).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      const enr = enrollments.find(e => e.batch_id === batchId && e.beneficiary_id === bid);
      if (enr) {
        await supabase.from("training_enrollments")
          .update({ attendance_pct: pct, attendance_status: marksMap[bid] })
          .eq("enrollment_id", enr.enrollment_id);
        setEnrollments(es => es.map(e => e.enrollment_id === enr.enrollment_id ? { ...e, attendance_pct: pct, attendance_status: marksMap[bid] } : e));
      }
    }
    await logTrainingAudit("Attendance Marked", `${activeBatch?.training_name || batchId}: ${sessionDate} (${beneficiaryIds.length} marked)`);
    showToast(`Attendance saved for ${sessionDate}.`);
  };

  const saveCertificates = async (certStatusMap) => {
    if (!activeBatch) return;
    const batchEnrollments = enrollments.filter(e => e.batch_id === activeBatch.batch_id);
    for (const e of batchEnrollments) {
      const newStatus = certStatusMap[e.enrollment_id];
      if (!newStatus || newStatus === e.certificate_status) continue;
      const certNo = newStatus === "Issued" && !e.certificate_no
        ? genCertNo(activeBatch.batch_id, e.beneficiary_id)
        : e.certificate_no;
      await supabase.from("training_enrollments")
        .update({ certificate_status: newStatus, certificate_no: certNo })
        .eq("enrollment_id", e.enrollment_id);
    }
    const { data } = await supabase.from("training_enrollments").select("*").order("enrolled_at");
    if (data) setEnrollments(data);
    await logTrainingAudit("Certificate Issued", `Certificates for ${activeBatch.training_name}`);
    showToast("Certificates updated!");
    setTrainingSubView(null); setActiveBatch(null);
  };

  const logTrainingAudit = async (action, details) => {
    await supabase.from("audit_logs").insert({
      user_email: user?.username || "system",
      action, module: "Training", details,
      created_at: new Date().toISOString(),
    });
  };

  const exportBatches = (rows) => { logAppAudit("EXPORT", "Training", `Exported ${rows.length} training batch record(s) (CSV)`); downloadCSV(rows.map(b => ({
    "Training Name": b.training_name, "Program": b.program, "Trainer": b.trainer_name,
    "Venue": b.venue, "Type": b.training_type, "Start": b.start_date, "End": b.end_date,
    "Capacity": b.max_capacity, "Status": b.status,
  })), `TAPASVI_Trainings_${new Date().toISOString().slice(0,10)}.csv`); };

  const printBatches = (rows) => { logAppAudit("PRINT", "Training", `Printed ${rows.length} training batch record(s)`); printTable(rows.map(b => ({
    "Name": b.training_name, "Program": b.program, "Trainer": b.trainer_name,
    "Venue": b.venue, "Dates": `${b.start_date}${b.end_date ? " to " + b.end_date : ""}`,
    "Capacity": b.max_capacity || "—", "Status": b.status,
  })), "Training Report"); };

  // ---- TRAINING CRUD ----
  const saveTraining = async (form) => {
    if (editing) {
      const { error } = await supabase.from("training").update(form).eq("training_id", editing.training_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setTraining(ts => ts.map(t => t.training_id === editing.training_id ? { ...t, ...form } : t));
      await logAppAudit("UPDATE", "Training", `Updated training record: ${editing.training_id}`);
    } else {
      const rec = { ...form, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from("training").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setTraining(ts => [data, ...ts]);
      await logAppAudit("CREATE", "Training", `Created training record: ${data.training_id}`);
    }
    showToast("Training record saved."); setEditing(null); setSubView(null);
  };

  const deleteTraining = async (t) => {
    const { error } = await supabase.from("training").delete().eq("training_id", t.training_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setTraining(ts => ts.filter(x => x.training_id !== t.training_id));
    await logAppAudit("DELETE", "Training", `Deleted training record: ${t.training_id}`);
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- EMPLOYMENT CRUD ----
  const saveEmployment = async (form) => {
    if (editing) {
      const { error } = await supabase.from("employment").update(form).eq("job_id", editing.job_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setEmployment(es => es.map(e => e.job_id === editing.job_id ? { ...e, ...form } : e));
      await logAppAudit("UPDATE", "Employment", `Updated employment record: ${editing.job_id}`);
    } else {
      const rec = { ...form, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from("employment").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setEmployment(es => [data, ...es]);
      await logAppAudit("CREATE", "Employment", `Created employment record: ${data.job_id}`);
    }
    showToast("Employment record saved."); setEditing(null); setSubView(null);
  };

  const deleteEmployment = async (e) => {
    const { error } = await supabase.from("employment").delete().eq("job_id", e.job_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setEmployment(es => es.filter(x => x.job_id !== e.job_id));
    await logAppAudit("DELETE", "Employment", `Deleted employment record: ${e.job_id}`);
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- VILLAGE CRUD ----
  const saveVillage = async (form) => {
    if (editing) {
      const { error } = await supabase.from("village_master").update(form).eq("village_id", editing.village_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setVillages(vs => vs.map(v => v.village_id === editing.village_id ? { ...v, ...form } : v));
      await logAppAudit("UPDATE", "Villages", `Updated village: ${editing.village_name || editing.village_id}`);
    } else {
      const { data, error } = await supabase.from("village_master").insert(form).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setVillages(vs => [...vs, data].sort((a, b) => a.village_name.localeCompare(b.village_name)));
      await logAppAudit("CREATE", "Villages", `Added village: ${data.village_name || data.village_id}`);
    }
    showToast("Village saved."); setEditing(null); setSubView(null);
  };

  const deleteVillage = async (v) => {
    const { error } = await supabase.from("village_master").delete().eq("village_id", v.village_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setVillages(vs => vs.filter(x => x.village_id !== v.village_id));
    await logAppAudit("DELETE", "Villages", `Deleted village: ${v.village_name || v.village_id}`);
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- EXPORTS ----
  const exportBeneficiaries = (rows) => { logAppAudit("EXPORT", "Beneficiaries", `Exported ${rows.length} beneficiary record(s) (CSV)`); downloadCSV(rows.map(b => ({
    "Beneficiary ID": b.beneficiary_id, Program: b.program, Name: b.name, Age: b.age, Gender: b.gender,
    Phone: b.phone, "Aadhaar Verified": b.aadhaar_verified, "eKYC": b.ekyc_status,
    Education: b.education, "Skill Interest": b.skill_interest, Status: b.status,
    "House No": b.house_no, Village: b.village, Mandal: b.mandal, District: b.district, Category: b.category,
    "Field Worker": b.field_worker_name, "Survey Date": b.registration_date || b.survey_date,
  })), `TAPASVI_Beneficiaries_${new Date().toISOString().slice(0, 10)}.csv`); };

  const printBeneficiaries = (rows) => {
    logAppAudit("PRINT", "Beneficiaries", `Printed ${rows.length} beneficiary record(s)`);
    const uniquePrograms = [...new Set(rows.map(b => b.program))];
    const uniqueWorkers = [...new Set(rows.map(b => b.field_worker_name).filter(Boolean))];
    let programLabel = uniquePrograms.length === 1 ? (PROGRAM_MAP[uniquePrograms[0]]?.label || uniquePrograms[0]) : "All Programs";
    if (uniqueWorkers.length === 1) programLabel += ` — ${uniqueWorkers[0]}`;
    const rowsWithAadhaar = rows.map(b => ({ ...b, _aadhaarDisplay: aadhaarForRole(b.identity_number || b.aadhaar_number, isSuperAdmin, isAdmin) }));
    printBeneficiaryReport(rowsWithAadhaar, programLabel, user?.username);
  };

  const exportTraining = (rows) => { logAppAudit("EXPORT", "Training", `Exported ${rows.length} training record(s) (CSV)`); downloadCSV(rows, `TAPASVI_Training_${new Date().toISOString().slice(0, 10)}.csv`); };
  const printTraining = (rows) => { logAppAudit("PRINT", "Training", `Printed ${rows.length} training record(s)`); printTable(rows.map(t => ({
    "Training ID": t.training_id, "Beneficiary ID": t.beneficiary_id, "Course": t.course_name,
    "Trainer": t.trainer_name, "Center": t.center, "Start": t.start_date, "End": t.end_date,
    "Attendance %": t.attendance_pct, "Certificate": t.certificate_issued,
  })), "Training Report"); };

  const exportEmployment = (rows) => { logAppAudit("EXPORT", "Employment", `Exported ${rows.length} employment record(s) (CSV)`); downloadCSV(rows, `TAPASVI_Employment_${new Date().toISOString().slice(0, 10)}.csv`); };
  const printEmployment = (rows) => { logAppAudit("PRINT", "Employment", `Printed ${rows.length} employment record(s)`); printTable(rows.map(e => ({
    "Job ID": e.job_id, "Beneficiary ID": e.beneficiary_id, "Type": e.employment_type,
    "Role": e.job_role, "Employer": e.employer, "Income": e.monthly_income, "Status": e.status,
  })), "Employment Report"); };

  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.mustChangePassword) return <ChangePasswordScreen user={user} onDone={() => setUser(u => ({ ...u, mustChangePassword: false }))} />;

  if (loading) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <Logo size={40} /><p className="text-[13px] text-[#6B7280]">Loading MIS data…</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-[360px] text-center">
        <AlertCircle size={28} className="mx-auto mb-3 text-red-600" />
        <p className="text-[13px] text-[#111827] mb-2 font-medium">Failed to load data</p>
        <p className="text-[11.5px] text-[#6B7280] mb-4">{loadError}</p>
        <button onClick={loadAll} className="rounded-lg px-4 py-2 text-[13px] font-medium text-white" style={{ background: "#16A34A" }}>Retry</button>
      </div>
    </div>
  );

  const NAVITEMS = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "beneficiaries", label: "Beneficiaries", icon: Users },
    { key: "training", label: "Training", icon: BookOpen },
    { key: "employment", label: "Employment", icon: Briefcase },
    { key: "reports", label: "Reports", icon: BarChart3 },
    ...(isAdmin ? [{ key: "villages", label: "Villages", icon: MapPin }] : []),
    ...(isAdmin ? [{ key: "users", label: "Users", icon: Lock }] : []),
    ...(isSuperAdmin ? [{ key: "settings", label: "Settings", icon: SettingsIcon }] : []),
  ];

  const goTo = (v) => { setView(v); setSubView(null); setEditing(null); setProfileBeneficiary(null); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif" }}>
      <style>{`* { box-sizing: border-box; } @keyframes fadein { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>

      {/* Sidebar (desktop) */}
      <aside className="w-[220px] bg-white border-r border-[#E5E7EB] hidden md:flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#F3F4F6]">
          <Logo size={30} />
          <div>
            <p className="text-[13px] font-bold text-[#1E3A8A]" style={{fontFamily:"Manrope,Arial,sans-serif",fontWeight:900}}>TAPASVI</p>
            <p className="text-[10px] text-[#999]">{isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Field Worker"}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAVITEMS.map(item => (
            <button key={item.key} onClick={() => goTo(item.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition"
              style={view === item.key ? { background: "#16A34A", color: "#fff" } : { color: "#374151" }}>
              <item.icon size={16} />{item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-3 space-y-0.5">
          <button onClick={loadAll} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] transition">
            <RefreshCw size={15} /> Refresh Data
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#F97316] hover:bg-[#FFF7ED] transition">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-[13px] font-bold text-[#1E3A8A]" style={{fontFamily:"Manrope,Arial,sans-serif",fontWeight:900}}>TAPASVI</span>
        </div>
        <button onClick={handleLogout} className="p-1.5"><LogOut size={16} className="text-[#F97316]" /></button>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-[56px] md:pt-0 pb-20 md:pb-0">
        <div className="max-w-[1100px] mx-auto px-4 md:px-7 py-5">

          {/* FAB for new registration */}
          {(view === "beneficiaries" || view === "dashboard") && !subView && (
            <button onClick={() => { setEditing(null); setSubView("beneficiary-form"); setView("beneficiaries"); }}
              className="fixed bottom-24 md:bottom-6 right-5 z-20 w-13 h-13 rounded-full shadow-lg flex items-center justify-center" style={{ background: "#1E3A8A", width: 52, height: 52, boxShadow: "0 4px 16px rgba(30,58,138,0.4)" }}>
              <Plus size={22} color="white" />
            </button>
          )}

          {/* FORMS */}
          {subView === "beneficiary-form" && (
            <BeneficiaryForm editing={editing} onSave={saveBeneficiary} onCancel={() => { setSubView(null); setEditing(null); }}
              currentUser={user} beneficiaries={beneficiaries}
              dynPrograms={dynPrograms} dynProgramsLoading={dynProgramsLoading} dynProgramsError={dynProgramsError} />
          )}
          {subView === "training-form" && isAdmin && (
            <BatchTrainingForm editing={activeBatch}
              onSave={saveBatch} dynPrograms={dynPrograms}
              onCancel={() => { setTrainingSubView(null); setActiveBatch(null); setSubView(null); }} />
          )}
          {subView === "employment-form" && (
            <EmploymentForm editing={editing} onSave={saveEmployment} onCancel={() => { setSubView(null); setEditing(null); }} beneficiaries={beneficiaries} />
          )}
          {subView === "village-form" && (
            <VillageForm editing={editing} onSave={saveVillage} onCancel={() => { setSubView(null); setEditing(null); }} />
          )}

          {/* Training sub-views */}
          {view === "training" && trainingSubView === "enroll" && activeBatch && (
            <EnrollmentScreen
              batch={activeBatch}
              beneficiaries={visibleBeneficiaries}
              enrollments={enrollments}
              batches={batches}
              onEnroll={enrollBeneficiaries}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "attendance" && activeBatch && (
            <AttendanceScreen
              batch={activeBatch}
              enrollments={enrollments}
              attendanceRecords={attendanceRecords}
              onSaveDailyAttendance={saveDailyAttendance}
              onCancelEnrollment={cancelEnrollment}
              currentUser={user}
              isAdmin={isAdmin}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "certificates" && activeBatch && (
            <CertificateScreen
              batch={activeBatch}
              enrollments={enrollments}
              onIssueCertificates={saveCertificates}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "attendance-report" && (
            <AttendanceReport
              attendanceRecords={attendanceRecords}
              batches={batches}
              beneficiaries={beneficiaries}
              dynPrograms={dynPrograms}
              onClose={() => setTrainingSubView(null)} />
          )}
          {view === "training" && trainingSubView === "assessment-management" && (
            <AssessmentManagement
              batches={batches}
              beneficiaries={beneficiaries}
              enrollments={enrollments}
              currentUser={user}
              isAdmin={isAdmin}
              showToast={showToast}
              logAppAudit={logAppAudit}
              onClose={() => setTrainingSubView(null)} />
          )}
          {view === "training" && trainingSubView === "certificate-generation" && (
            <CertificateManagement
              isAdmin={isAdmin}
              currentUser={user}
              showToast={showToast}
              logAppAudit={logAppAudit}
              onClose={() => setTrainingSubView(null)} />
          )}

          {/* VIEWS */}
          {!subView && view === "dashboard" && (
            <Dashboard beneficiaries={visibleBeneficiaries} training={training} employment={employment} villages={villages} isAdmin={isAdmin} currentUser={user}
              onQuickAction={(key) => {
                setSubView(null); setEditing(null);
                if (key === "beneficiary") { setView("beneficiaries"); setSubView("beneficiary-form"); }
                else if (key === "training") { setView("training"); setTrainingSubView(null); }
                else if (key === "attendance") { setView("training"); setTrainingSubView(null); }
                else if (key === "assessment") { setView("training"); setTrainingSubView("assessment-management"); }
                else if (key === "certificate") { setView("training"); setTrainingSubView("certificate-generation"); }
                else if (key === "employment") { setView("employment"); setSubView("employment-form"); }
                else if (key === "reports") { setView("reports"); }
              }} />
          )}
          {!subView && view === "beneficiaries" && !profileBeneficiary && (
            <BeneficiaryList beneficiaries={visibleBeneficiaries} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} dynPrograms={dynPrograms}
              onEdit={b => { setEditing(b); setSubView("beneficiary-form"); }}
              onDelete={b => setDeleteTarget({ type: "beneficiary", record: b })}
              onExport={exportBeneficiaries} onPrint={printBeneficiaries}
              onPrintProfile={b => { logAppAudit("PRINT", "Beneficiaries", `Printed profile: ${b.name || b.beneficiary_id} (${b.beneficiary_id})`); pdfIndividual(b, aadhaarForRole(b.identity_number || b.aadhaar_number, isSuperAdmin, isAdmin)); }}
              onViewProfile={b => setProfileBeneficiary(b)}
              onAddPrograms={b => {
                const eligible = checkEligibility(b, b.program, beneficiaries);
                if (eligible.length === 0) {
                  showToast("No additional eligible programs available for this beneficiary.", "info");
                } else {
                  setMultiProgDialog({ savedRec: b, eligible });
                }
              }} />
          )}
          {!subView && view === "beneficiaries" && profileBeneficiary && (
            <BeneficiaryProfile
              beneficiary={profileBeneficiary}
              beneficiaries={visibleBeneficiaries}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              enrollments={enrollments}
              onClose={() => setProfileBeneficiary(null)} />
          )}
          {!subView && !trainingSubView && view === "training" && (
            <TrainingList
              batches={batches}
              enrollments={enrollments}
              beneficiaries={beneficiaries}
              isAdmin={isAdmin}
              currentUser={user}
              dynPrograms={dynPrograms}
              onAdd={() => { setActiveBatch(null); setSubView("training-form"); }}
              onEdit={b => { setActiveBatch(b); setSubView("training-form"); }}
              onDelete={b => setDeleteTarget({ type: "batch", record: b })}
              onEnroll={b => { setActiveBatch(b); setTrainingSubView("enroll"); }}
              onAttendance={b => { setActiveBatch(b); setTrainingSubView("attendance"); }}
              onCertificates={b => { setActiveBatch(b); setTrainingSubView("certificates"); }}
              onAttendanceReport={() => setTrainingSubView("attendance-report")}
              onAssessments={() => setTrainingSubView("assessment-management")}
              onCertificateGeneration={() => setTrainingSubView("certificate-generation")}
              onExport={exportBatches}
              onPrint={printBatches} />
          )}
          {!subView && view === "employment" && (
            <EmploymentList employment={employment} beneficiaries={beneficiaries} isAdmin={isAdmin}
              onAdd={() => { setEditing(null); setSubView("employment-form"); }}
              onEdit={e => { setEditing(e); setSubView("employment-form"); }}
              onDelete={e => setDeleteTarget({ type: "employment", record: e })}
              onExport={exportEmployment} onPrint={printEmployment} />
          )}
          {!subView && view === "villages" && isAdmin && (
            <VillageMasterList villages={villages} isAdmin={isAdmin}
              onAdd={() => { setEditing(null); setSubView("village-form"); }}
              onEdit={v => { setEditing(v); setSubView("village-form"); }}
              onDelete={v => setDeleteTarget({ type: "village", record: v })} />
          )}
          {!subView && view === "reports" && (
            <ReportsModule currentUser={user} isAdmin={isAdmin} showToast={showToast} />
          )}
          {!subView && view === "users" && isAdmin && (
            <UserManagement currentUser={user} showToast={showToast} />
          )}
          {view === "settings" && isSuperAdmin && (
            <SettingsHub currentUser={user} showToast={showToast} logAppAudit={logAppAudit} beneficiaries={beneficiaries} />
          )}
        </div>
      </main>

      {/* Mobile bottom nav - all tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E7EB] flex items-center justify-around py-1.5 px-1">
        {NAVITEMS.map(function(navItem) {
          return (
            <button key={navItem.key} onClick={() => goTo(navItem.key)} className="flex flex-col items-center gap-0.5 px-2 py-1.5">
              <navItem.icon size={17} style={{ color: view === navItem.key ? "#16A34A" : "#9CA3AF" }} />
              <span className="text-[9px] font-medium" style={{ color: view === navItem.key ? "#16A34A" : "#9CA3AF" }}>{navItem.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Multi-Program Auto Registration Dialog */}
      {multiProgDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[400px] w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E7EB]" style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #16A34A 100%)" }}>
              <p className="text-[15px] font-bold text-white">🎯 Eligible Additional Programs</p>
              <p className="text-[11.5px] text-white/80 mt-1">This beneficiary qualifies for additional TAPASVI programs based on age, gender and education.</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] text-[#6B7280] mb-3">Select programs to auto-register:</p>
              <div className="space-y-2.5">
                {multiProgDialog.eligible.map((prog, idx) => {
                  const PIcon = PROGRAM_MAP[prog.key]?.icon;
                  return (
                    <label key={prog.key} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition"
                      style={{ borderColor: prog.checked ? prog.color : "#E5E7EB", background: prog.checked ? prog.tint : "white" }}>
                      <input type="checkbox" checked={prog.checked}
                        onChange={() => setMultiProgDialog(d => ({
                          ...d, eligible: d.eligible.map((p, i) => i === idx ? { ...p, checked: !p.checked } : p)
                        }))}
                        className="w-4 h-4" />
                      {PIcon && <PIcon size={18} style={{ color: prog.color }} />}
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: prog.color }}>{prog.short}</p>
                        <p className="text-[10.5px] text-[#6B7280]">{prog.label}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: prog.color, color: "white" }}>Eligible ✓</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={() => {
                  const selected = multiProgDialog.eligible.filter(p => p.checked).map(p => p.key);
                  if (selected.length === 0) { showToast("Select at least one program", "error"); return; }
                  registerAdditionalPrograms(selected);
                }} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A" }}>
                  ✅ Register Selected
                </button>
                <button onClick={() => registerAdditionalPrograms(multiProgDialog.eligible.map(p => p.key))}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>
                  🚀 Register All
                </button>
              </div>
              <button onClick={() => { setMultiProgDialog(null); setView("beneficiaries"); }}
                className="w-full rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#6B7280]">
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-5 max-w-[340px] w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-[14px] font-semibold text-[#111827] mb-2">Delete this record?</p>
            <p className="text-[12px] text-[#6B7280] mb-4">
              {deleteTarget.record?.name || deleteTarget.record?.beneficiary_id || deleteTarget.record?.village_name || "This record"} will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={() => {
                const { type, record } = deleteTarget;
                if (type === "beneficiary") deleteBeneficiary(record);
                else if (type === "training") deleteTraining(record);
                else if (type === "batch") deleteBatch(record);
                else if (type === "employment") deleteEmployment(record);
                else if (type === "village") deleteVillage(record);
              }} className="flex-1 rounded-lg py-2.5 text-[13px] font-bold" style={{ background: "#F97316", color: "#fff" }}>Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
