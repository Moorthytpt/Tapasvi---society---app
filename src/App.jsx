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
    (isAdmin || e.enrolled_by === currentUser?.username)
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
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Mark Attendance</h2>
          <p className="text-[12px] text-[#6B7280]">{batch.training_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-black text-[#1E3A8A]">{totalSessions}</p>
          <p className="text-[10px] text-[#6B7280]">Total Sessions</p>
        </div>
      </div>

      {/* Session date picker */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4 flex items-center gap-3 flex-wrap">
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

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
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
                <div key={e.enrollment_id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827]">{e.beneficiary_name || e.beneficiary_id}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {e.beneficiary_id} · {PROGRAM_MAP[e.program]?.short || e.program} · {s.total} sessions · {s.present}P / {s.absent}A · <b style={{ color: s.pct >= 80 ? "#16A34A" : "#DC2626" }}>{s.pct}%</b>
                        {e.enrolled_by && <> · Enrolled by {e.enrolled_by}</>}
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
                  <div className="flex gap-2 mt-2">
                    {statusOptions.map(st => (
                      <button key={st} onClick={() => setMarks(m => ({ ...m, [e.beneficiary_id]: st }))}
                        className="flex-1 py-2 rounded-lg text-[12px] font-bold transition"
                        style={marks[e.beneficiary_id] === st
                          ? { background: statusColors[st], color: "white" }
                          : { background: "#F3F4F6", color: "#6B7280" }}>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="p-4 border-t border-[#F3F4F6] flex gap-3">
          <button onClick={save} disabled={saving || batchEnrollments.length === 0}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: saving ? "#888" : "#1E3A8A" }}>
            {saving ? "Saving..." : `Save Attendance — ${sessionDate}`}
          </button>
          <button onClick={onClose} className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#374151]">Close</button>
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

  const batchesInProgram = useMemo(() => {
    if (programFilter === "all") return batches;
    return batches.filter(b => b.program === programFilter);
  }, [batches, programFilter]);

  const filtered = useMemo(() => {
    let r = attendanceRecords;
    if (programFilter !== "all") r = r.filter(rec => batchMap[rec.batch_id]?.program === programFilter);
    if (batchFilter !== "all") r = r.filter(rec => rec.batch_id === batchFilter);
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
  }, [attendanceRecords, programFilter, batchFilter, fromDate, toDate, beneficiaryQuery, batchMap, beneficiaryMap]);

  const rowsForExport = () => filtered.map(rec => {
    const bt = batchMap[rec.batch_id];
    const ben = beneficiaryMap[rec.beneficiary_id];
    return {
      "Date": rec.session_date,
      "Training": bt?.training_name || rec.batch_id,
      "Program": PROGRAM_MAP[bt?.program]?.short || bt?.program || "—",
      "Beneficiary ID": rec.beneficiary_id,
      "Beneficiary Name": ben?.name || "—",
      "Status": rec.status,
      "Marked By": rec.marked_by || "—",
    };
  });

  const exportCSV = () => downloadCSV(rowsForExport(), `TAPASVI_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  const exportPDF = () => printTable(rowsForExport(), "Attendance Report");

  const totalPresent = filtered.filter(r => r.status === "Present" || r.status === "Late").length;
  const totalAbsent = filtered.filter(r => r.status === "Absent").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <h2 className="text-[18px] font-bold text-[#111827]">Attendance Report</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} records · {totalPresent} present · {totalAbsent} absent</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
          <FileSpreadsheet size={13} /> CSV
        </button>
        <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827] hover:bg-white">
          <Printer size={13} /> PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4 grid grid-cols-2 gap-3">
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
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">FROM DATE</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={inputCls + " text-[12.5px]"} />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">TO DATE</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={inputCls + " text-[12.5px]"} />
        </div>
        <div className="col-span-2">
          <label className="text-[10.5px] font-semibold text-[
