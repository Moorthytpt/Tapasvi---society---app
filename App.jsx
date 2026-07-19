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
  var logoUrl = window.location.origin + "/icon-512.png";
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
  var logoUrl = window.location.origin + "/icon-512.png";
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
  var logoUrl = window.location.origin + "/icon-512.png";
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

function Logo({ size = 40 }) {
  return (
    <img src="/icon-512.png" alt="TAPASVI" width={size} height={size}
      style={{ objectFit: "contain", display: "block" }} />
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
      onLogin({ role: roleData.role, username: data.user.email, supabaseUser: data.user });
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
      onLogin({ role: "fieldworker", username: fwData.full_name, mustChangePassword: !!fwData.must_change_password, userId: fwData.id });
    }
    setLoading(false);
  };

  if (showForgot) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] px-4 py-10" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif" }}>
        <div className="w-full max-w-[400px] bg-white rounded-2xl border border-[#E5E7EB] shadow-md p-6">
          <p className="text-[14px] font-bold text-[#111827] mb-3">Forgot Password</p>
          <p className="text-[12.5px] text-[#374151] leading-relaxed mb-4">
            For security, only a <b>Super Admin</b> can reset your password. Please contact your Super Admin — they will set a new temporary password for you, and you'll be asked to change it on your next login.
          </p>
          <button onClick={() => setShowForgot(false)} className="w-full rounded-lg py-2.5 text-[13px] font-semibold" style={{ background: "#1E3A8A", color: "#fff" }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] px-4 py-10 overflow-y-auto" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif" }}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1E3A8A] via-[#F97316] to-[#16A34A]" />
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <Logo size={60} />
          <h1 className="mt-3 text-[22px] font-bold text-[#16A34A] text-center">TAPASVI</h1>
          <p className="text-[11.5px] text-[#666] text-center mt-1 max-w-[280px]">Society for Rural Development, Social Issues & Health</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-md p-6">
          <p className="text-[13px] font-semibold text-[#111827] mb-4">Sign in to continue</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[["admin", "Admin", Lock], ["fieldworker", "Field Worker", User]].map(([r, label, Icon]) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition"
                style={role === r ? { background: "#16A34A", color: "#fff", borderColor: "#16A34A" } : { borderColor: "#E5E7EB", color: "#111827" }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <Field label={role === "admin" ? "Email" : "Full Name"} required>
            <Input value={username} onChange={e => setUsername(e.target.value)}
              placeholder={role === "admin" ? "admin@tapasvi.org" : "మీ పూర్తి పేరు టైప్ చేయండి"}
              inputMode={role === "admin" ? "email" : "text"} />
          </Field>
          <Field label="Password" required error={error}>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                className={inputCls} placeholder="••••••••" style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#6B7280] px-1.5">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between mt-1 mb-1">
            <label className="flex items-center gap-1.5 text-[12px] text-[#374151]">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Remember Me
            </label>
            <button type="button" onClick={() => setShowForgot(true)} className="text-[12px] font-medium" style={{ color: "#1E3A8A" }}>
              Forgot Password?
            </button>
          </div>
          <button type="submit" onClick={submit} disabled={loading} className="w-full rounded-lg py-3 text-[14px] font-bold mt-2" style={{ background: loading ? "#888" : "#1E3A8A", color: "#fff" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-[10.5px] text-[#AAA] text-center mt-3">
            {role === "admin" ? "Admin: registered email & password" : "Contact Admin for your login credentials"}
          </p>
        </form>
        <p className="text-[10px] text-[#BBB] text-center mt-4">TAPASVI DMS v2.0 • Secure Access Only</p>
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
    category: "BC", disability: "No", shg: "No",
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
    onSave({
      ...form, program: activeProgram,
      aadhaar_number: form.identity_type === "aadhaar" ? form.identity_number : (form.aadhaar_number || ""),
    });
  };

  const p = resolvedProgramMap[activeProgram] || resolvedPrograms[0] || { color: "#1E3A8A", tint: "#EFF6FF", label: "" };

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <div>
            <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Beneficiary" : "Quick Registration"}</h2>
            <p className="text-[11.5px] text-[#6B7280]">Complete in 2–3 minutes</p>
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

      {!editing && !dynProgramsLoading && resolvedPrograms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {resolvedPrograms.map(pr => { const Icon = pr.icon; return (
            <button key={pr.key} type="button" onClick={() => setActiveProgram(pr.key)}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-3 px-3 text-[11.5px] font-semibold transition flex-1 min-w-[90px]"
              style={activeProgram === pr.key ? { background: pr.tint, borderColor: pr.color, color: pr.color } : { borderColor: "#E5E7EB", color: "#6B7280", background: "white" }}>
              <Icon size={18} />{pr.short}
            </button>
          );})}
        </div>
      )}

      {(editing || (!dynProgramsLoading && !noActiveProgramsAvailable)) && (
      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-5">

          <SectionHeader title="System Information" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Registration ID" hint="Auto-generated">
              <Input value={editing?.beneficiary_id || "Auto"} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono text-[12px]"} />
            </Field>
            <Field label="Date">
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

          <SectionHeader title="Personal Information" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Beneficiary Name" required error={errors.name}>
              <Input value={form.name} onChange={set("name")} placeholder="Full name" />
            </Field>
            <Field label="Gender" required>
              <Select value={form.gender} onChange={set("gender")} options={["Male","Female","Other"]} />
            </Field>
            <Field label="Age" required error={errors.age}>
              <Input type="number" min="1" max="120" value={form.age} onChange={set("age")} placeholder="Years" inputMode="numeric" />
            </Field>
            <Field label="Mobile Number" required error={errors.phone}>
              <Input value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,"").slice(0,10) }))}
                placeholder="10-digit mobile" inputMode="numeric" />
            </Field>
          </div>

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
            <p className="text-[10.5px] text-[#6B7280]">ℹ Additional documents can be added from Beneficiary Profile later.</p>
          </div>

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

          <SectionHeader title="Social Information" color={p.color} />
          <div className="grid grid-cols-3 gap-x-4">
            <Field label="Category">
              <Select value={form.category} onChange={set("category")} options={["SC","ST","BC","OC","Minority"]} />
            </Field>
            <Field label="Disability">
              <Select value={form.disability} onChange={set("disability")} options={["No","Yes"]} />
            </Field>
            <Field label="SHG Member">
              <Select value={form.shg} onChange={set("shg")} options={["No","Yes"]} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={form.notes||""} onChange={set("notes")} rows={2} className={inputCls} placeholder="Field worker observations..." />
          </Field>

        </div>
        <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center gap-3">
          <button type="submit" onClick={submit} className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold text-white" style={{ background: p.color }}>
            {editing ? "Update Record" : "Save Registration"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-[#F3F4F6]">Cancel</button>
          {!editing && <span className="text-[10.5px] text-[#9CA3AF] ml-auto">* ID auto-generated on save</span>}
        </div>
      </form>
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
function Dashboard({ beneficiaries, training, employment, villages, isAdmin }) {
  const total = beneficiaries.length;
  const women = beneficiaries.filter(b => b.gender === "Female").length;
  const youth = beneficiaries.filter(b => b.gender !== "Female").length;
  const trained = training.length;
  const certIssued = training.filter(t => t.certificate_issued === "Yes").length;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[18px] font-bold text-[#1E3A8A]" style={{fontFamily:"Manrope,Arial,sans-serif"}}>Dashboard</h2>
          <p className="text-[12px] text-[#6B7280]">TAPASVI — Program Overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users} label="Total Beneficiaries" value={total} color="#16A34A" tint="#DCFCE7" />
        <StatCard icon={Award} label="Trained" value={trained} color="#1E3A8A" tint="#EFF6FF" sub={`${certIssued} certificates issued`} />
        <StatCard icon={Briefcase} label="Employed" value={employed} color="#F97316" tint="#FFF7ED" sub={`${employmentRate}% rate`} />
        <StatCard icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} color="#F97316" tint="#FFF7ED" />
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
  const compRate  = totalPart > 0 ? Math.round((enrollments.filter(e => e.attendance_pct >= 75).length / totalPart) * 100) : 0;

  const stats = [
    { label: "Total Trainings", value: total,    color: "#1E3A8A", tint: "#EFF6FF", icon: BookOpen },
    { label: "Upcoming",        value: upcoming,  color: "#6366F1", tint: "#EEF2FF", icon: Clock },
    { label: "Ongoing",         value: ongoing,   color: "#F97316", tint: "#FFF7ED", icon: TrendingUp },
    { label: "Completed",       value: completed, color: "#16A34A", tint: "#DCFCE7", icon: CheckCircle },
    { label: "Participants",    value: totalPart, color: "#0369A1", tint: "#E0F2FE", icon: Users },
    { label: "Completion Rate", value: compRate + "%", color: "#7C3AED", tint: "#F5F3FF", icon: Award },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-3" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.tint }}>
            <s.icon size={18} style={{ color: s.color }} />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[#111827] leading-none">{s.value}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{s.label}</p>
          </div>
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
              placeholder="Search name, ID, village..."
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
function AttendanceScreen({ batch, enrollments, onSaveAttendance, onCancelEnrollment, onClose }) {
  const batchEnrollments = enrollments.filter(e => e.batch_id === batch.batch_id && (e.enrollment_status || "Active") !== "Cancelled");
  const [attendance, setAttendance] = useState(() => {
    const init = {};
    batchEnrollments.forEach(e => { init[e.enrollment_id] = e.attendance_status || "Present"; });
    return init;
  });

  const statusOptions = ["Present","Absent","Late","Leave"];
  const statusColors  = { Present: "#16A34A", Absent: "#DC2626", Late: "#F97316", Leave: "#6B7280" };
  const statusTints   = { Present: "#DCFCE7", Absent: "#FEF2F2", Late: "#FFF7ED", Leave: "#F3F4F6" };

  const presentCount = Object.values(attendance).filter(s => s === "Present" || s === "Late").length;
  const total        = batchEnrollments.length;
  const pct          = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="max-w-[720px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Mark Attendance</h2>
          <p className="text-[12px] text-[#6B7280]">{batch.training_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-black text-[#1E3A8A]">{pct}%</p>
          <p className="text-[10px] text-[#6B7280]">{presentCount}/{total}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        {batchEnrollments.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Users size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">No beneficiaries enrolled yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] max-h-[60vh] overflow-y-auto">
            {batchEnrollments.map(e => (
              <div key={e.enrollment_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827]">{e.beneficiary_name || e.beneficiary_id}</p>
                  <p className="text-[11px] text-[#6B7280]">{e.beneficiary_id}</p>
                </div>
                <div className="flex gap-1">
                  {statusOptions.map(s => (
                    <button key={s} onClick={() => setAttendance(a => ({ ...a, [e.enrollment_id]: s }))}
                      className="px-2 py-1 rounded-lg text-[10.5px] font-semibold transition"
                      style={attendance[e.enrollment_id] === s
                        ? { background: statusColors[s], color: "white" }
                        : { background: "#F3F4F6", color: "#6B7280" }}>
                      {s}
                    </button>
                  ))}
                </div>
                {onCancelEnrollment && (
                  <button type="button" onClick={() => { if (window.confirm(`Cancel ${e.beneficiary_name || e.beneficiary_id}'s enrollment? They'll become available for new enrollments again.`)) onCancelEnrollment(e); }}
                    title="Cancel Enrollment"
                    className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="p-4 border-t border-[#F3F4F6] flex gap-3">
          <button onClick={() => onSaveAttendance(attendance)}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A" }}>
            Save Attendance
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
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

  const eligible = batchEnrollments.filter(e => (e.attendance_pct || 0) >= 75);
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
        <p className="text-[12px] text-[#1E3A8A] font-semibold">ℹ Eligibility: Attendance ≥ 75%</p>
        <p className="text-[11px] text-[#374151] mt-1">{eligible.length} of {batchEnrollments.length} beneficiaries are eligible.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="divide-y divide-[#F3F4F6] max-h-[55vh] overflow-y-auto">
          {batchEnrollments.map(e => {
            const attPct = e.attendance_pct || 0;
            const canIssue = attPct >= 75;
            const current = certStatus[e.enrollment_id];
            return (
              <div key={e.enrollment_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827]">{e.beneficiary_name || e.beneficiary_id}</p>
                  <p className="text-[11px] text-[#6B7280]">Attendance: {attPct}% {!canIssue && "· Below 75% — not eligible"}</p>
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

/* ── BATCH TRAINING LIST (replaces old TrainingList) ────────── */

function TrainingList({ batches, enrollments, beneficiaries, isAdmin, currentUser,
  onAdd, onEdit, onDelete, onEnroll, onAttendance, onCertificates,
  onExport, onPrint, dynPrograms }) {
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

  const filtered = useMemo(() => {
    let r = batches || [];
    if (programFilter !== "all") r = r.filter(b => b.program === programFilter);
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(b => b.training_name?.toLowerCase().includes(q) || b.trainer_name?.toLowerCase().includes(q) || b.venue?.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [batches, query, programFilter, statusFilter]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const getEnrollCount = batchId => (enrollments || []).filter(e => e.batch_id === batchId).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Training Management</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} trainings</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button onClick={() => onExport(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                <FileSpreadsheet size={13} /> CSV
              </button>
              <button onClick={() => onPrint(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
                <Printer size={13} /> PDF
              </button>
            </>
          )}
          <button onClick={onAdd}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white"
            style={{ background: "#1E3A8A" }}>
            <Plus size={14} /> New Training
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <TrainingDashboard batches={batches || []} enrollments={enrollments || []} />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
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
          <button onClick={onAdd} className="mt-3 rounded-xl px-4 py-2 text-[12px] font-bold text-white" style={{ background: "#1E3A8A" }}>
            Create First Training
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(batch => {
            const p = resolvedProgramMap[batch.program] || resolvedPrograms[0] || { color: "#6B7280", tint: "#F3F4F6", short: batch.program, icon: ClipboardList };
            const sc = trainingStatusColor(batch.status);
            const enrollCount = getEnrollCount(batch.batch_id);
            const capacity = batch.max_capacity ? `${enrollCount}/${batch.max_capacity}` : enrollCount;
            return (
              <div key={batch.batch_id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition overflow-hidden">
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
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <button onClick={() => onEnroll(batch)} title="Enroll Beneficiaries"
                          className="px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                          style={{ background: "#1E3A8A" }}>
                          + Enroll
                        </button>
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
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-black text-white shrink-0"
          style={{ background: p.color }}>
          {(b.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-bold text-[#111827]">{b.name || "—"}</h3>
          <p className="text-[12px] text-[#6B7280] mt-0.5">{b.age ? `${b.age} years` : "—"} · {b.gender || "—"}</p>
          <p className="text-[12px] text-[#6B7280]">📞 {b.phone || "—"}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge label={b.status || "Registered"} color={statusColors[b.status] || "#1E3A8A"} tint={(statusColors[b.status] || "#1E3A8A") + "18"} />
            {b.field_worker_name && <span className="text-[10.5px] text-[#6B7280]">👤 {b.field_worker_name}</span>}
          </div>
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
      {(() => {
        const myEnrollments = (enrollments || []).filter(e => e.beneficiary_id === b.beneficiary_id);
        if (myEnrollments.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
            <h4 className="text-[13px] font-bold text-[#111827] mb-3">🎓 Training History</h4>
            <div className="space-y-2.5">
              {myEnrollments.map(e => (
                <div key={e.enrollment_id} className="bg-[#F8FAFC] rounded-xl p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-[12.5px] font-semibold text-[#111827]">{e.training_name || e.batch_id}</p>
                    <div className="flex gap-2">
                      {e.attendance_pct > 0 && <Badge label={`${e.attendance_pct}% Attendance`} color="#1E3A8A" tint="#EFF6FF" />}
                      {e.certificate_status === "Issued" && <Badge label="Certificate ✓" color="#16A34A" tint="#DCFCE7" />}
                    </div>
                  </div>
                  {e.certificate_no && <p className="text-[10.5px] font-mono text-[#6B7280] mt-1">{e.certificate_no}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Notes */}
      {b.notes && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
          <h4 className="text-[13px] font-bold text-[#111827] mb-2">📝 Field Worker Notes</h4>
          <p className="text-[12.5px] text-[#374151]">{b.notes}</p>
        </div>
      )}

      {/* Future Modules */}
      <div className="bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E5E7EB] p-5 mb-4">
        <h4 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wide mb-3">🚀 Coming Soon</h4>
        <div className="grid grid-cols-3 gap-2">
          {["Training","Employment","Attendance","Certificates","Govt Schemes","AI Insights"].map(m => (
            <div key={m} className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center">
              <p className="text-[11px] text-[#9CA3AF] font-medium">{m}</p>
            </div>
          ))}
        </div>
      </div>
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
    { key: "training", label: "Training Settings", desc: "Training types, trainers, certificates", icon: BookOpen, color: "#DB2777", tint: "#FDF2F8", ready: false },
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

  const BLANK = { id: 1, ngo_name: "", logo_url: "", registration_number: "", address: "", phone: "", email: "", website: "" };

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
  const [trainingSubView, setTrainingSubView] = useState(null); // null|"batch-form"|"enroll"|"attendance"|"certificates"
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

  const saveAttendance = async (attendanceMap) => {
    if (!activeBatch) return;
    const batchEnrollments = enrollments.filter(e => e.batch_id === activeBatch.batch_id);
    const updates = batchEnrollments.map(e => ({
      enrollment_id: e.enrollment_id,
      attendance_status: attendanceMap[e.enrollment_id] || "Present",
    }));
    // Update each enrollment
    let hasError = false;
    for (const u of updates) {
      const presentStatuses = ["Present","Late"];
      const batchTotal = batchEnrollments.length;
      const presentCount = updates.filter(x => presentStatuses.includes(x.attendance_status)).length;
      const pct = batchTotal > 0 ? Math.round((presentCount / batchTotal) * 100) : 0;
      const { error } = await supabase.from("training_enrollments")
        .update({ attendance_status: u.attendance_status, attendance_pct: pct })
        .eq("enrollment_id", u.enrollment_id);
      if (error) hasError = true;
    }
    if (hasError) { showToast("Some updates failed.", "error"); return; }
    // Refresh enrollments
    const { data } = await supabase.from("training_enrollments").select("*").order("enrolled_at");
    if (data) setEnrollments(data);
    await logTrainingAudit("Attendance Updated", `Attendance for ${activeBatch.training_name}`);
    showToast("Attendance saved!");
    setTrainingSubView(null); setActiveBatch(null);
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
          {subView === "training-form" && (
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
              beneficiaries={beneficiaries}
              enrollments={enrollments}
              batches={batches}
              onEnroll={enrollBeneficiaries}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "attendance" && activeBatch && (
            <AttendanceScreen
              batch={activeBatch}
              enrollments={enrollments}
              onSaveAttendance={saveAttendance}
              onCancelEnrollment={cancelEnrollment}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "certificates" && activeBatch && (
            <CertificateScreen
              batch={activeBatch}
              enrollments={enrollments}
              onIssueCertificates={saveCertificates}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}

          {/* VIEWS */}
          {!subView && view === "dashboard" && (
            <Dashboard beneficiaries={visibleBeneficiaries} training={training} employment={employment} villages={villages} isAdmin={isAdmin} />
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
