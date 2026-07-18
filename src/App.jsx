 // TAPASVI DMS 
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Users, Leaf, Scissors, Laptop, Search, LayoutDashboard, ClipboardList,
  Plus, Download, Printer, Edit2, Trash2, LogOut, Lock, User,
  ChevronRight, X, Check, Globe, MapPin, BarChart3, FileSpreadsheet,
  AlertCircle, Filter, BookOpen, Briefcase, Calendar, TrendingUp,
  CheckCircle, XCircle, Clock, Award, Home, Settings, ChevronDown, RefreshCw
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
  { key: "rydeap", label: "RYDEAP", short: "RYDEAP", color: "#1E3A8A", tint: "#EFF6FF", icon: Laptop, idPrefix: "RYDEAP" },
  { key: "womens", label: "Women's Tailoring & Embroidery", short: "Women's", color: "#F97316", tint: "#FFF7ED", icon: Scissors, idPrefix: "WOMENS" },
  { key: "waste", label: "Waste Segregation & Recycling", short: "Waste", color: "#16A34A", tint: "#DCFCE7", icon: Leaf, idPrefix: "WASTE" },
];
const PROGRAM_MAP = Object.fromEntries(PROGRAMS.map(p => [p.key, p]));

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

/* ── LETTERHEAD HTML shared by both PDF types ── */
const LETTERHEAD_HTML = (title, meta = "") => `
  <div class="header">
    <div class="logo-wrap">
      <img src="https://tapasvi-society-app-rftz.vercel.app/icon-512.png" alt="TAPASVI" style="width:64px;height:64px;object-fit:contain;"/>
    </div>
    <div class="org-info">
      <div class="org-name">TAPASVI SOCIETY</div>
      <div class="org-sub">Society for Rural Development, Social Issues and Health Organization</div>
      <div class="org-addr">Andhra Pradesh, India &nbsp;|&nbsp; tapasvi-society-app-rftz.vercel.app</div>
    </div>
    <div class="report-info">
      <div class="report-title">${title}</div>
      <div class="report-meta">Generated: ${new Date().toLocaleString("en-IN")}</div>
      ${meta ? `<div class="report-meta">${meta}</div>` : ""}
    </div>
  </div>`;

const SHARED_CSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');",
  "* { box-sizing: border-box; margin: 0; padding: 0; }",
  "body { font-family: Inter, Arial, sans-serif; color: #111827; background: white; }",
  ".header { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; border-bottom: 3px solid #1E3A8A; margin-bottom: 10px; }",
  ".org-info { flex: 1; }",
  ".org-name { font-size: 18px; font-weight: 900; color: #1E3A8A; letter-spacing: 1px; }",
  ".org-sub { font-size: 9px; color: #374151; margin-top: 2px; }",
  ".org-addr { font-size: 8px; color: #6B7280; margin-top: 1px; }",
  ".report-info { text-align: right; }",
  ".report-title { font-size: 13px; font-weight: 700; color: #1E3A8A; }",
  ".report-meta { font-size: 8px; color: #6B7280; margin-top: 2px; }",
  ".footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 8px; color: #9CA3AF; }",
].join(" ");

/* ── PDF TYPE 1: Individual Beneficiary Profile (A4 Portrait) ── */
function pdfIndividual(b) {
  const w = window.open("", "_blank");
  if (!w) return;
  const prog = { rydeap: "RYDEAP", womens: "Women's Tailoring & Embroidery", waste: "Waste Management" };
  const pdfCSS = [
    SHARED_CSS,
    "@page { size: A4 portrait; margin: 12mm 15mm; }",
    ".profile-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 12px; }",
    ".section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1E3A8A; border-bottom: 1px solid #DBEAFE; padding-bottom: 4px; margin-bottom: 10px; }",
    ".field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }",
    ".field-item { }",
    ".field-label { font-size: 7.5px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }",
    ".field-value { font-size: 10px; font-weight: 600; color: #111827; border-bottom: 1px solid #F3F4F6; padding-bottom: 3px; min-height: 16px; }",
    ".reg-id { font-family: monospace; font-size: 14px; font-weight: 900; color: #1E3A8A; background: #EFF6FF; padding: 6px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px; }",
    ".program-badge { display: inline-block; background: #DCFCE7; color: #16A34A; font-size: 9px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-left: 8px; }",
    ".photo-placeholder { width: 80px; height: 100px; border: 2px dashed #D1D5DB; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #9CA3AF; text-align: center; flex-shrink: 0; }",
    ".top-row { display: flex; gap: 16px; align-items: flex-start; }",
    ".top-info { flex: 1; }",
    ".sign-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 16px; }",
    ".sign-box { border-top: 1px solid #374151; padding-top: 4px; font-size: 8px; color: #374151; text-align: center; }",
    "@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
  ].join(" ");
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI — " + b.name + " Profile</title><style>" + pdfCSS + "</style></head><body>
    ${LETTERHEAD_HTML("Beneficiary Profile", "Registration ID: " + (b.beneficiary_id || "—"))}

    <div class="profile-card">
      <div class="top-row">
        <div class="top-info">
          <div class="reg-id">${b.beneficiary_id || "—"}
            <span class="program-badge">${prog[b.program] || b.program || "—"}</span>
          </div>
          <div class="field-grid">
            <div class="field-item">
              <div class="field-label">Registration Date</div>
              <div class="field-value">${b.registration_date || b.survey_date || "—"}</div>
            </div>
            <div class="field-item">
              <div class="field-label">Status</div>
              <div class="field-value">${b.status || "Registered"}</div>
            </div>
          </div>
        </div>
        <div class="photo-placeholder">Photo<br/>Here</div>
      </div>
    </div>

    <div class="profile-card">
      <div class="section-title">Personal Information</div>
      <div class="field-grid">
        <div class="field-item"><div class="field-label">Full Name</div><div class="field-value">${b.name || "—"}</div></div>
        <div class="field-item"><div class="field-label">Gender</div><div class="field-value">${b.gender || "—"}</div></div>
        <div class="field-item"><div class="field-label">Age</div><div class="field-value">${b.age ? b.age + " years" : "—"}</div></div>
        <div class="field-item"><div class="field-label">Mobile Number</div><div class="field-value">${b.phone || "—"}</div></div>
        <div class="field-item"><div class="field-label">Aadhaar Number</div><div class="field-value">${b.aadhaar_number ? "XXXX XXXX " + String(b.aadhaar_number).slice(-4) : "—"}</div></div>
        <div class="field-item"><div class="field-label">Education</div><div class="field-value">${b.education || "—"}</div></div>
      </div>
    </div>

    <div class="profile-card">
      <div class="section-title">Address</div>
      <div class="field-grid">
        <div class="field-item"><div class="field-label">Village</div><div class="field-value">${b.village || "—"}</div></div>
        <div class="field-item"><div class="field-label">Mandal</div><div class="field-value">${b.mandal || "—"}</div></div>
        <div class="field-item"><div class="field-label">District</div><div class="field-value">${b.district || "—"}</div></div>
        <div class="field-item"><div class="field-label">State</div><div class="field-value">${b.state || "Andhra Pradesh"}</div></div>
      </div>
    </div>

    <div class="profile-card">
      <div class="section-title">Social Information</div>
      <div class="field-grid">
        <div class="field-item"><div class="field-label">Category</div><div class="field-value">${b.category || "—"}</div></div>
        <div class="field-item"><div class="field-label">Disability</div><div class="field-value">${b.disability || "No"}</div></div>
        <div class="field-item"><div class="field-label">SHG Member</div><div class="field-value">${b.shg || "No"}</div></div>
        <div class="field-item"><div class="field-label">Field Worker</div><div class="field-value">${b.field_worker_name || "—"}</div></div>
      </div>
      ${b.notes ? '<div style="margin-top:8px"><div class="field-label">Notes</div><div style="font-size:9px;color:#374151;margin-top:3px;padding:6px;background:#F9FAFB;border-radius:4px;">' + b.notes + '</div></div>' : ""}
    </div>

    <div class="sign-section">
      <div class="sign-box">Field Worker Signature</div>
      <div class="sign-box">Beneficiary Signature / Thumb</div>
      <div class="sign-box">Authorized Signatory</div>
    </div>

    <div class="footer">
      <span>TAPASVI Society — Confidential | For Official Use Only</span>
      <span>Printed: ${new Date().toLocaleDateString("en-IN")}</span>
    </div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

/* ── PDF TYPE 2: All Beneficiaries List (A4 Landscape) ── */
function printTable(rows, title, cols) {
  const w = window.open("", "_blank");
  if (!w) return;
  const headers = cols || (rows.length ? Object.keys(rows[0]) : []);
  const tableCss = [
    SHARED_CSS,
    "@page { size: A4 landscape; margin: 10mm 12mm; }",
    ".summary { display: flex; gap: 16px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px; padding: 5px 10px; margin-bottom: 8px; font-size: 9px; color: #1E3A8A; font-weight: 600; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 4px; }",
    "thead tr { background: #1E3A8A; }",
    "thead th { color: white; padding: 5px 6px; text-align: left; font-size: 8.5px; font-weight: 700; border: 1px solid #1730A0; white-space: nowrap; }",
    "tbody tr:nth-child(even) { background: #F8FAFF; }",
    "tbody tr:nth-child(odd) { background: #FFFFFF; }",
    "tbody td { padding: 4px 6px; font-size: 8.5px; border: 1px solid #E5E7EB; vertical-align: middle; }",
    "tbody td:first-child { font-weight: 700; color: #1E3A8A; font-family: monospace; }",
    ".status-registered { color: #1E3A8A; font-weight: 700; }",
    ".status-training { color: #D97706; font-weight: 700; }",
    ".status-completed { color: #16A34A; font-weight: 700; }",
    ".status-dropped { color: #DC2626; font-weight: 700; }",
    "@media print { thead { display: table-header-group; } tbody tr { page-break-inside: avoid; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
  ].join(" ");
  const summaryHtml = rows.some(r => r["Status"]) ? "<span>Completed: " + rows.filter(r => r["Status"] === "Completed").length + "</span> <span>Training: " + rows.filter(r => r["Status"] === "Training").length + "</span> <span>Registered: " + rows.filter(r => r["Status"] === "Registered").length + "</span> <span>Dropped: " + rows.filter(r => r["Status"] === "Dropped").length + "</span>" : "";
  const genderHtml = rows.some(r => r["Gender"]) ? "<span>Women: " + rows.filter(r => r["Gender"] === "Female").length + "</span> <span>Men: " + rows.filter(r => r["Gender"] === "Male").length + "</span>" : "";
  const theadHtml = "<thead><tr>" + headers.map(h => "<th>" + h + "</th>").join("") + "</tr></thead>";
  const tbodyHtml = "<tbody>" + rows.map(r => "<tr>" + headers.map(h => { const val = r[h] ?? ""; const cls = h === "Status" ? "status-" + String(val).toLowerCase() : ""; return '<td class="' + cls + '">' + val + "</td>"; }).join("") + "</tr>").join("") + "</tbody>";
  const footerDate = new Date().toLocaleDateString("en-IN");
  const generatedDate = new Date().toLocaleString("en-IN");
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI — " + title + "</title><style>" + tableCss + "</style></head><body>" + LETTERHEAD_HTML(title, "Total Records: " + rows.length) + '<div class="summary">' + summaryHtml + " " + genderHtml + "</div><table>" + theadHtml + tbodyHtml + "</table>" + '<div class="footer"><span>TAPASVI Database Management System — Confidential | For Official Use Only</span><span>Printed: ' + footerDate + "</span></div></body></html>");
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}
  const w = window.open("", "_blank");
  if (!w) return;
  const headers = cols || (rows.length ? Object.keys(rows[0]) : []);
  const css3 = [
    "@page { size: A4 landscape; margin: 10mm 12mm; }",
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { font-family: Manrope, Inter, Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: white; }",
    ".header { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 3px solid #1E3A8A; margin-bottom: 6px; }",
    ".logo-circle { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }",
    ".org-name { font-size: 16px; font-weight: 900; color: #1E3A8A; font-family: Manrope, Arial, sans-serif; letter-spacing: 1px; }",
    ".org-sub { font-size: 8.5px; color: #444; margin-top: 2px; }",
    ".org-address { font-size: 7.5px; color: #666; margin-top: 1px; }",
    ".header-right { margin-left: auto; text-align: right; }",
    ".report-title { font-size: 12px; font-weight: 700; color: #1E3A8A; }",
    ".report-meta { font-size: 8px; color: #888; margin-top: 3px; }",
    ".summary { display: flex; gap: 16px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px; padding: 5px 10px; margin-bottom: 8px; font-size: 9px; color: #1E3A8A; font-weight: 600; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 4px; }",
    "thead tr { background: #1E3A8A; }",
    "thead th { color: white; padding: 5px 6px; text-align: left; font-size: 8.5px; font-weight: 700; border: 1px solid #1730A0; white-space: nowrap; }",
    "tbody tr:nth-child(even) { background: #F8FAFF; }",
    "tbody tr:nth-child(odd) { background: #FFFFFF; }",
    "tbody td { padding: 4px 6px; font-size: 8.5px; border: 1px solid #E5E7EB; vertical-align: middle; }",
    "tbody td:first-child { font-weight: 700; color: #1E3A8A; font-family: monospace; }",
    ".status-registered { color: #1E3A8A; font-weight: 700; }",
    ".status-training { color: #D97706; font-weight: 700; }",
    ".status-completed { color: #16A34A; font-weight: 700; }",
    ".status-dropped { color: #DC2626; font-weight: 700; }",
    ".footer { margin-top: 8px; padding-top: 5px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 7.5px; color: #999; }",
    "@media print { thead { display: table-header-group; } tbody tr { page-break-inside: avoid; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }",
  ].join(" ");
  const th3 = "<thead><tr>" + headers.map(h => "<th>" + h + "</th>").join("") + "</tr></thead>";
  const tb3 = "<tbody>" + rows.map(r => "<tr>" + headers.map(h => { const val = r[h] ?? ""; const cls = h === "Status" ? "status-" + String(val).toLowerCase() : ""; return '<td class="' + cls + '">' + val + "</td>"; }).join("") + "</tr>").join("") + "</tbody>";
  const sum3 = rows.some(r => r["Status"]) ? "<span>Completed: " + rows.filter(r => r["Status"] === "Completed").length + "</span> <span>Training: " + rows.filter(r => r["Status"] === "Training").length + "</span>" : "";
  const gen3 = rows.some(r => r["Gender"]) ? "<span>Women: " + rows.filter(r => r["Gender"] === "Female").length + "</span> <span>Men: " + rows.filter(r => r["Gender"] === "Male").length + "</span>" : "";
  const logoImg3 = '<img src="https://tapasvi-society-app-rftz.vercel.app/icon-512.png" alt="TAPASVI" style="width:56px;height:56px;object-fit:contain;"/>';
  const hdr3 = '<div class="header"><div class="logo-circle">' + logoImg3 + '</div><div><div class="org-name">TAPASVI SOCIETY</div><div class="org-sub">Society for Rural Development, Social Issues and Health Organization</div><div class="org-address">Andhra Pradesh, India</div></div><div class="header-right"><div class="report-title">' + title + '</div><div class="report-meta">Total: ' + rows.length + '</div><div class="report-meta">Generated: ' + new Date().toLocaleString("en-IN") + '</div></div></div>';
  const ftr3 = '<div class="footer"><span>TAPASVI DMS — Confidential</span><span>Printed: ' + new Date().toLocaleDateString("en-IN") + '</span></div>';
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI — " + title + "</title><style>" + css3 + "</style></head><body>" + hdr3 + '<div class="summary">' + sum3 + " " + gen3 + "</div><table>" + th3 + tb3 + "</table>" + ftr3 + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/* ============================================================
   UI ATOMS
   ============================================================ */
/* ── OFFICIAL TAPASVI LOGO ── same SVG used everywhere in the app and in print */
const TAPASVI_LOGO_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="38" cy="50" r="36" fill="#F97316"/>
  <path d="M38 14 C55 14 70 28 68 50 C66 65 52 72 38 70 C48 60 52 44 38 34 Z" fill="white" opacity="0.95"/>
  <circle cx="33" cy="24" r="6" fill="white"/>
  <path d="M22 42 C22 34 27 30 33 30 C39 30 44 34 44 42 Z" fill="white"/>
  <path d="M8 58 C8 58 20 48 38 52 C56 56 68 48 72 50 C72 50 58 72 38 72 C18 72 8 58 8 58 Z" fill="#16A34A"/>
  <path d="M12 62 Q25 56 38 60 Q51 64 64 58" stroke="#4ADE80" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M14 67 Q27 61 40 65 Q53 69 65 63" stroke="#4ADE80" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M32 52 C32 52 31 46 35 43" stroke="#4ADE80" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M35 43 C35 43 38 40 41 43" stroke="#4ADE80" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M42 51 C42 51 42 45 46 42" stroke="#4ADE80" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.8"/>
</svg>`;

function Logo({ size = 40 }) {
  return (
    <img
      src="/icon-512.png"
      alt="TAPASVI Logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
    />
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

function Input(props) { return <input {...props} className={inputCls} />; }
function Select({ options, placeholder, ...props }) {
  return (
    <select {...props} className={selectCls}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o === "string"
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
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 flex items-center gap-3.5">
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
    <div className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-[13px] shadow-xl" style={{ background: type === "error" ? "#B71C1C" : "#16A34A", color: "#fff" }}>
      {type === "error" ? <AlertCircle size={15} /> : <Check size={15} />} {message}
    </div>
  );
}

function SectionHeader({ title, color = "#16A34A" }) {
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError("Please enter username and password."); return; }
    setLoading(true); setError("");
    if (role === "admin") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: username.trim(), password });
      if (authError || !data.user) { setError("Invalid email or password."); setLoading(false); return; }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", data.user.id).single();
      if (!roleData || roleData.role !== "admin") { await supabase.auth.signOut(); setError("Access denied. Admin only."); setLoading(false); return; }
      onLogin({ role: "admin", username: data.user.email, supabaseUser: data.user });
    } else {
      if (password !== LOGIN_PASSWORDS.fieldworker) { setError("Incorrect password."); setLoading(false); return; }
      onLogin({ role: "fieldworker", username: username.trim() });
    }
    setLoading(false);
  };

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
          <Field label={role === "admin" ? "Email" : "Username"} required>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder={role === "admin" ? "admin@tapasvi.org" : "fieldworker1"} inputMode={role === "admin" ? "email" : "text"} />
          </Field>
          <Field label="Password" required error={error}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </Field>
          <button type="submit" onClick={submit} disabled={loading} className="w-full rounded-lg py-3 text-[14px] font-bold mt-1" style={{ background: loading ? "#888" : "#1E3A8A", color: "#fff" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-[10.5px] text-[#AAA] text-center mt-3">
            {role === "admin" ? "Admin: registered email & password" : "Field Worker password: tapasvi"}
          </p>
        </form>
        <p className="text-[10px] text-[#BBB] text-center mt-4">TAPASVI DMS v2.0 • Secure Access Only</p>
      </div>
    </div>
  );
}

/* ============================================================
   BENEFICIARY FORM
   ============================================================ */
function BeneficiaryForm({ editing, onSave, onCancel, currentUser, beneficiaries }) {
  const today = new Date().toISOString().slice(0, 10);

  const blank = {
    program: "rydeap",
    registration_date: today,
    name: "",
    gender: "Female",
    age: "",
    aadhaar_number: "",
    phone: "",
    state: "Andhra Pradesh",
    education: "",
    village: "",
    mandal: "",
    district: "Tirupati",
    category: "BC",
    disability: "No",
    shg: "No",
    field_worker_name: currentUser.role === "fieldworker" ? currentUser.username : "",
    notes: "",
  };

  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.age || form.age < 1 || form.age > 120) e.age = "Valid age required";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!/^\d{10}$/.test(form.phone)) e.phone = "10 digits required";
    else {
      const dup = beneficiaries.find(b => b.phone === form.phone && b.beneficiary_id !== editing?.beneficiary_id);
      if (dup) e.phone = `Already registered: ${dup.name} (${dup.beneficiary_id})`;
    }
    if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar)) e.aadhaar = "Must be exactly 12 digits";
    if (!form.village.trim()) e.village = "Required";
    if (!form.mandal.trim()) e.mandal = "Required";
    if (!form.field_worker_name.trim()) e.field_worker_name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const p = PROGRAM_MAP[form.program] || PROGRAMS[0];

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h2 className="text-[17px] font-bold text-[#111827]">
              {editing ? "Edit Beneficiary" : "New Beneficiary Registration"}
            </h2>
            <p className="text-[11.5px] text-[#6B7280]">TAPASVI Society — {p.label}</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6]"><X size={18} className="text-[#6B7280]" /></button>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">

        {/* Program selector */}
        {!editing && (
          <div className="px-5 pt-5 pb-4 border-b border-[#F3F4F6] bg-[#F8FAFC]">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] mb-3">Select Program</p>
            <div className="grid grid-cols-3 gap-2">
              {PROGRAMS.map(pr => {
                const Icon = pr.icon;
                const active = form.program === pr.key;
                return (
                  <button key={pr.key} type="button"
                    onClick={() => setForm(f => ({ ...blank, program: pr.key, field_worker_name: f.field_worker_name }))}
                    className="flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-[11.5px] font-semibold transition"
                    style={active
                      ? { background: pr.tint, borderColor: pr.color, color: pr.color }
                      : { borderColor: "#E5E7EB", color: "#6B7280", background: "white" }}>
                    <Icon size={18} />{pr.short}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-5 space-y-0">

          {/* SYSTEM INFORMATION */}
          <SectionHeader title="System Information" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Registration ID" hint="Auto-generated after save">
              <Input value={editing?.beneficiary_id || "Auto"} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono"} />
            </Field>
            <Field label="Registration Date">
              <Input value={form.registration_date} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
            </Field>
            <Field label="Program">
              <Input value={p.label} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
            </Field>
            <Field label="Field Worker" required error={errors.field_worker_name}>
              <Input
                value={form.field_worker_name}
                onChange={currentUser.role === "fieldworker" ? undefined : set("field_worker_name")}
                readOnly={currentUser.role === "fieldworker"}
                className={currentUser.role === "fieldworker" ? inputCls + " bg-[#F3F4F6] text-[#6B7280]" : inputCls}
              />
            </Field>
          </div>

          {/* PERSONAL INFORMATION */}
          <SectionHeader title="Personal Information" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Beneficiary Name" required error={errors.name}>
              <Input value={form.name} onChange={set("name")} placeholder="Full name as per Aadhaar" />
            </Field>
            <Field label="Gender" required>
              <Select value={form.gender} onChange={set("gender")} options={["Male", "Female", "Other"]} />
            </Field>
            <Field label="Age" required error={errors.age} hint="Enter age in years">
              <Input
                type="number" min="1" max="120"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                placeholder="e.g. 25"
                inputMode="numeric"
              />
            </Field>
            <Field label="Aadhaar Number" error={errors.aadhaar} hint="12-digit Aadhaar number">
              <Input
                value={form.aadhaar}
                onChange={e => setForm(f => ({ ...f, aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) }))}
                placeholder="Enter 12-digit Aadhaar"
                inputMode="numeric"
              />
            </Field>
            <Field label="Mobile Number" required error={errors.phone}>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
              />
            </Field>
          </div>

          {/* EDUCATION */}
          <SectionHeader title="Education" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Education Qualification">
              <Select value={form.education} onChange={set("education")}
                options={EDUCATION_OPTIONS} placeholder="Select qualification" />
            </Field>
          </div>

          {/* ADDRESS */}
          <SectionHeader title="Address" color={p.color} />
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Village" required error={errors.village}>
              <Input value={form.village} onChange={set("village")} placeholder="Village name" />
            </Field>
            <Field label="Mandal" required error={errors.mandal}>
              <Input value={form.mandal} onChange={set("mandal")} placeholder="Mandal name" />
            </Field>
            <Field label="District" required>
              <Select value={form.district} onChange={set("district")} options={DISTRICTS_AP} />
            </Field>
            <Field label="State">
              <Input value="Andhra Pradesh" readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
            </Field>
          </div>

          {/* SOCIAL INFORMATION */}
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

          {/* NOTES */}
          <Field label="Notes / Remarks">
            <textarea value={form.notes || ""} onChange={set("notes")} rows={2}
              className={inputCls} placeholder="Any additional observations..." />
          </Field>

        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center gap-3">
          <button type="submit" onClick={submit}
            className="rounded-xl px-6 py-2.5 text-[13.5px] font-bold transition"
            style={{ background: p.color, color: "#fff" }}>
            {editing ? "Update Record" : "Save Registration"}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-[#E5E7EB] px-6 py-2.5 text-[13.5px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
            Cancel
          </button>
          {!editing && (
            <span className="text-[11px] text-[#9CA3AF] ml-auto">
              * Registration ID will be auto-generated on save
            </span>
          )}
        </div>
      </form>
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
function BeneficiaryList({ beneficiaries, isAdmin, onEdit, onDelete, onExport, onPrint }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let r = beneficiaries;
    if (programFilter !== "all") r = r.filter(b => b.program === programFilter);
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(b => b.name?.toLowerCase().includes(q) || b.beneficiary_id?.toLowerCase().includes(q) || b.phone?.includes(q) || b.village?.toLowerCase().includes(q) || b.field_worker_name?.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [beneficiaries, query, programFilter, statusFilter]);

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
          {PROGRAMS.map(p => <option key={p.key} value={p.key}>{p.short}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ClipboardList size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No records match your search.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(b => {
            const p = PROGRAM_MAP[b.program] || PROGRAMS[0];
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
                    <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                      <span className="font-mono">{b.beneficiary_id}</span>
                      <span>•</span>
                      <span>{b.age}{b.gender ? `, ${b.gender}` : ""}</span>
                      <span>•</span>
                      <span><MapPin size={10} className="inline mr-0.5" />{b.village}, {b.mandal}</span>
                      <span>•</span>
                      <span>📞 {b.phone}</span>
                      {b.field_worker_name && <><span>•</span><span>👤 {b.field_worker_name}</span></>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isAdmin && (
                      <button onClick={() => pdfIndividual(b)} title="Download PDF Profile"
                        className="p-2 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2]">
                        <Download size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onEdit(b)} className="p-2 rounded-lg text-[#1E3A8A] hover:bg-[#EFF6FF]"><Edit2 size={14} /></button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onDelete(b)} className="p-2 rounded-lg text-[#F97316] hover:bg-[#FFF7ED]"><Trash2 size={14} /></button>
                    )}
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
function TrainingList({ training, beneficiaries, isAdmin, onAdd, onEdit, onDelete, onExport, onPrint }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return training;
    const q = query.toLowerCase();
    return training.filter(t => t.beneficiary_id?.toLowerCase().includes(q) || t.course_name?.toLowerCase().includes(q) || t.trainer_name?.toLowerCase().includes(q) || t.center?.toLowerCase().includes(q));
  }, [training, query]);

  const getBeneficiaryName = id => beneficiaries.find(b => b.beneficiary_id === id)?.name || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Training Records</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold" style={{ background: "#1E3A8A", color: "#fff" }}>
            <Plus size={14} /> Add Training
          </button>
          {isAdmin && (
            <>
              <button onClick={() => onExport(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><FileSpreadsheet size={13} /> CSV</button>
              <button onClick={() => onPrint(filtered)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><Printer size={13} /> Print</button>
            </>
          )}
        </div>
      </div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by beneficiary, course, trainer..." className={inputCls + " pl-9 text-[12.5px]"} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]"><BookOpen size={28} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No training records yet.</p></div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(t => (
            <div key={t.training_id} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3" style={{ borderLeft: "4px solid #1E3A8A" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] text-[#111827]">{getBeneficiaryName(t.beneficiary_id)}</span>
                  <Badge label={t.course_name} color="#1E3A8A" tint="#EFF6FF" />
                  {t.certificate_issued === "Yes" && <Badge label="Certificate ✓" color="#16A34A" tint="#DCFCE7" />}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                  <span className="font-mono">{t.beneficiary_id}</span>
                  <span>•</span><span>Trainer: {t.trainer_name}</span>
                  <span>•</span><span>Center: {t.center}</span>
                  {t.attendance_pct && <><span>•</span><span>Attendance: {t.attendance_pct}%</span></>}
                  {t.start_date && <><span>•</span><span>{t.start_date}{t.end_date ? ` → ${t.end_date}` : ""}</span></>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(t)} className="p-2 rounded-lg text-[#1E3A8A] hover:bg-[#EFF6FF]"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(t)} className="p-2 rounded-lg text-[#F97316] hover:bg-[#FFF7ED]"><Trash2 size={14} /></button>
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
   USER MANAGEMENT MODULE — Admin Only
   ============================================================ */
function UserManagement({ currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState("list"); // list | form | audit
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
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
      const { error } = await supabase.from("app_users").update(form).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setUsers(us => us.map(u => u.id === editing.id ? { ...u, ...form } : u));
      await logAudit("UPDATE", `Updated user: ${form.full_name} (${form.email})`);
      showToast("User updated successfully.");
    } else {
      const rec = { ...form, created_by: currentUser.username, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from("app_users").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setUsers(us => [data, ...us]);
      await logAudit("CREATE", `Created user: ${form.full_name} (${form.email})`);
      showToast("User created successfully.");
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
    downloadCSV(rows, `TAPASVI_Users_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const printUsersPDF = () => {
    printTable(filtered.map(u => ({
      "Name": u.full_name, "Email": u.email, "Role": u.role,
      "Phone": u.phone || "—", "Program": u.program || "—",
      "Status": u.status,
      "Created": new Date(u.created_at).toLocaleDateString("en-IN"),
    })), "User Management Report");
  };

  const filtered = useMemo(() => {
    let r = users;
    if (roleFilter !== "all") r = r.filter(u => u.role === roleFilter);
    if (statusFilter !== "all") r = r.filter(u => u.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.village?.toLowerCase().includes(q));
    }
    return r;
  }, [users, query, roleFilter, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const roleColor = { admin: "#1E3A8A", fieldworker: "#16A34A" };
  const roleLabel = { admin: "Admin", fieldworker: "Field Worker" };

  // ── USER FORM ──────────────────────────────────────────────
  if (subView === "form") {
    const blank = { full_name: "", email: "", role: "fieldworker", phone: "", program: "", village: "", status: "active" };
    return <UserForm editing={editing} blank={blank} onSave={saveUser} onCancel={() => { setEditing(null); setSubView("list"); }} />;
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
                <th className="text-left px-4 py-3 text-white font-semibold">By</th>
                <th className="text-left px-4 py-3 text-white font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAFF]"}>
                  <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{new Date(log.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: log.action === "CREATE" ? "#DCFCE7" : log.action === "DELETE" ? "#FEE2E2" : log.action === "STATUS" ? "#FFF7ED" : "#EFF6FF",
                        color: log.action === "CREATE" ? "#16A34A" : log.action === "DELETE" ? "#DC2626" : log.action === "STATUS" ? "#F97316" : "#1E3A8A"
                      }}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-[#374151] font-medium">{log.user_email}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{log.details}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[#9CA3AF]">No audit logs yet.</td></tr>
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
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">User Management</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} users · Admin only</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSubView("audit")}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
            <Clock size={13} /> Audit Logs
          </button>
          <button onClick={exportUsersCSV}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
            <FileSpreadsheet size={13} /> CSV
          </button>
          <button onClick={printUsersPDF}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] hover:bg-[#F3F4F6]">
            <Printer size={13} /> PDF
          </button>
          <button onClick={() => { setEditing(null); setSubView("form"); }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold"
            style={{ background: "#1E3A8A", color: "#fff" }}>
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Users", value: users.length, color: "#1E3A8A", tint: "#EFF6FF" },
          { label: "Active", value: users.filter(u => u.status === "active").length, color: "#16A34A", tint: "#DCFCE7" },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, color: "#F97316", tint: "#FFF7ED" },
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

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone, village..."
            className={inputCls + " pl-9 text-[12.5px]"} />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="fieldworker">Field Worker</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls + " w-auto text-[12.5px]"}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
            style={{ background: "#1E3A8A" }}>Add First User</button>
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
                      style={{ background: u.status === "active" ? "#DCFCE7" : "#F3F4F6", color: u.status === "active" ? "#16A34A" : "#6B7280" }}>
                      {u.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                    <span>✉ {u.email}</span>
                    {u.phone && <><span>•</span><span>📞 {u.phone}</span></>}
                    {u.program && <><span>•</span><span>📋 {PROGRAM_MAP[u.program]?.short || u.program}</span></>}
                    {u.village && <><span>•</span><span><MapPin size={10} className="inline" /> {u.village}</span></>}
                    <span>•</span>
                    <span>📅 {new Date(u.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
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
function UserForm({ editing, blank, onSave, onCancel }) {
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
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
            <Field label="Email Address" required error={errors.email}>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="user@tapasvi.org" inputMode="email"
                readOnly={!!editing} className={editing ? inputCls + " bg-[#F3F4F6] text-[#6B7280]" : inputCls} />
            </Field>
            <Field label="Role" required>
              <Select value={form.role} onChange={set("role")} options={[
                { value: "admin", label: "Admin" },
                { value: "fieldworker", label: "Field Worker" },
              ]} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={set("status")} options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]} />
            </Field>
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

          {!editing && (
            <div className="bg-[#EFF6FF] rounded-xl p-4 mt-2">
              <p className="text-[12px] font-semibold text-[#1E3A8A] mb-1">ℹ Password Note</p>
              <p className="text-[11.5px] text-[#374151]">
                Default passwords: <strong>Admin → admin123</strong> | <strong>Field Worker → tapasvi</strong>
              </p>
              <p className="text-[11px] text-[#6B7280] mt-1">Ask the user to change their password after first login.</p>
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
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [subView, setSubView] = useState(null); // "beneficiary-form" | "training-form" | "employment-form" | "village-form"
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Data state
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [training, setTraining] = useState([]);
  const [employment, setEmployment] = useState([]);
  const [villages, setVillages] = useState([]);

  const isAdmin = user?.role === "admin";

  const showToast = (message, type = "success") => setToast({ message, type });

  const loadAll = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [b, t, e, v] = await Promise.all([
        supabase.from("beneficiaries_v2").select("*").order("created_at", { ascending: false }),
        supabase.from("training").select("*").order("created_at", { ascending: false }),
        supabase.from("employment").select("*").order("created_at", { ascending: false }),
        supabase.from("village_master").select("*").order("village_name"),
      ]);
      if (b.error || t.error || e.error || v.error) throw new Error((b.error || t.error || e.error || v.error).message);
      setBeneficiaries(b.data || []);
      setTraining(t.data || []);
      setEmployment(e.data || []);
      setVillages(v.data || []);
    } catch (err) {
      setLoadError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  // ---- BENEFICIARY CRUD ----
  const saveBeneficiary = async (form) => {
    if (editing) {
      const { error } = await supabase.from("beneficiaries_v2").update(form).eq("beneficiary_id", editing.beneficiary_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setBeneficiaries(bs => bs.map(b => b.beneficiary_id === editing.beneficiary_id ? { ...b, ...form } : b));
      showToast("Beneficiary updated.");
    } else {
      const prefix = PROGRAM_MAP[form.program]?.idPrefix || "BEN";
      const beneficiary_id = nextId(beneficiaries, prefix);
      const rec = { ...form, beneficiary_id, created_at: new Date().toISOString() };
      const { error } = await supabase.from("beneficiaries_v2").insert(rec);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setBeneficiaries(bs => [rec, ...bs]);
      showToast(`Registered: ${beneficiary_id}`);
    }
    setEditing(null); setSubView(null); setView("beneficiaries");
  };

  const deleteBeneficiary = async (b) => {
    const { error } = await supabase.from("beneficiaries_v2").delete().eq("beneficiary_id", b.beneficiary_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setBeneficiaries(bs => bs.filter(x => x.beneficiary_id !== b.beneficiary_id));
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- TRAINING CRUD ----
  const saveTraining = async (form) => {
    if (editing) {
      const { error } = await supabase.from("training").update(form).eq("training_id", editing.training_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setTraining(ts => ts.map(t => t.training_id === editing.training_id ? { ...t, ...form } : t));
    } else {
      const rec = { ...form, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from("training").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setTraining(ts => [data, ...ts]);
    }
    showToast("Training record saved."); setEditing(null); setSubView(null);
  };

  const deleteTraining = async (t) => {
    const { error } = await supabase.from("training").delete().eq("training_id", t.training_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setTraining(ts => ts.filter(x => x.training_id !== t.training_id));
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- EMPLOYMENT CRUD ----
  const saveEmployment = async (form) => {
    if (editing) {
      const { error } = await supabase.from("employment").update(form).eq("job_id", editing.job_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setEmployment(es => es.map(e => e.job_id === editing.job_id ? { ...e, ...form } : e));
    } else {
      const rec = { ...form, created_at: new Date().toISOString() };
      const { data, error } = await supabase.from("employment").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setEmployment(es => [data, ...es]);
    }
    showToast("Employment record saved."); setEditing(null); setSubView(null);
  };

  const deleteEmployment = async (e) => {
    const { error } = await supabase.from("employment").delete().eq("job_id", e.job_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setEmployment(es => es.filter(x => x.job_id !== e.job_id));
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- VILLAGE CRUD ----
  const saveVillage = async (form) => {
    if (editing) {
      const { error } = await supabase.from("village_master").update(form).eq("village_id", editing.village_id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setVillages(vs => vs.map(v => v.village_id === editing.village_id ? { ...v, ...form } : v));
    } else {
      const { data, error } = await supabase.from("village_master").insert(form).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setVillages(vs => [...vs, data].sort((a, b) => a.village_name.localeCompare(b.village_name)));
    }
    showToast("Village saved."); setEditing(null); setSubView(null);
  };

  const deleteVillage = async (v) => {
    const { error } = await supabase.from("village_master").delete().eq("village_id", v.village_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setVillages(vs => vs.filter(x => x.village_id !== v.village_id));
    showToast("Deleted."); setDeleteTarget(null);
  };

  // ---- EXPORTS ----
  const exportBeneficiaries = (rows) => downloadCSV(rows.map(b => ({
    "Beneficiary ID": b.beneficiary_id, Program: b.program, Name: b.name, Age: b.age, Gender: b.gender,
    Phone: b.phone, "Aadhaar Verified": b.aadhaar_verified, "eKYC": b.ekyc_statu
