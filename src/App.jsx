import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Users, Leaf, Scissors, Laptop, Search, LayoutDashboard, ClipboardList,
  Plus, Download, Printer, Edit2, Trash2, LogOut, Lock, User,
  ChevronRight, X, Check, Globe, MapPin, BarChart3, FileSpreadsheet,
  AlertCircle, Filter
} from "lucide-react";

/* ============================================================
   SUPABASE CONNECTION
   These are public-facing keys (safe to embed in client code).
   Project: tapasvi-society
   ============================================================ */
const supabase = createClient(
  "https://srdfsdqitsmpzjfsxkib.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyZGZzZHFpdHNtcHpqZnN4a2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MjQxMTQsImV4cCI6MjA5ODMwMDExNH0.LlbXgr9R-6ODYCm3rwJ2gv0F6b2lVditY4temE1flXU"
);

/* Map between the app's camelCase fields and the database's snake_case columns */
const FIELD_TO_DB = {
  eduQualification: "edu_qualification", eduLevel: "edu_level", interestedSkill: "interested_skill",
  houseNo: "house_no", segregateWaste: "segregate_waste", wetWaste: "wet_waste", dryWaste: "dry_waste",
  plasticWaste: "plastic_waste", sellsRecyclables: "sells_recyclables", interestedRecycling: "interested_recycling",
  enumeratorName: "enumerator_name", surveyDate: "survey_date", createdAt: "created_at",
};
const DB_TO_FIELD = Object.fromEntries(Object.entries(FIELD_TO_DB).map(([a, b]) => [b, a]));

function recordToDbRow(r) {
  const row = {};
  for (const [key, val] of Object.entries(r)) {
    const dbKey = FIELD_TO_DB[key] || key;
    row[dbKey] = val;
  }
  return row;
}
function dbRowToRecord(row) {
  const r = {};
  for (const [key, val] of Object.entries(row)) {
    const appKey = DB_TO_FIELD[key] || key;
    r[appKey] = val;
  }
  return r;
}

/* ============================================================
   TAPASVI SOCIETY — Baseline Survey & Beneficiary Management
   Single-session demo build (in-memory store).
   For real multi-device sync, connect a backend (e.g. Supabase).
   ============================================================ */

/* ---------------- i18n ---------------- */
const STR = {
  en: {
    appName: "TAPASVI Society",
    appSub: "Rural Development, Social Issues & Health Organization",
    loginTitle: "Sign in to continue",
    role: "Role", admin: "Admin", enumerator: "Enumerator",
    username: "Username", password: "Password", signIn: "Sign in",
    loginHint: "Demo — any username works. Admin password: admin123. Enumerator password: tapasvi",
    invalidLogin: "Check your username and password and try again.",
    dashboard: "Dashboard", register: "New Registration", records: "Records",
    reports: "Reports", logout: "Sign out",
    totalBeneficiaries: "Total beneficiaries", thisMonth: "Added this month",
    villagesCovered: "Villages covered", pendingSync: "Pending sync",
    programWise: "Program-wise", villageWise: "Village-wise", mandalWise: "Mandal-wise",
    genderWise: "Gender-wise", recent: "Recent registrations", viewAll: "View all",
    searchPlaceholder: "Search by name, Aadhaar, phone, village or enumerator",
    filterProgram: "Program", allPrograms: "All programs",
    sno: "S.No.", regId: "Registration ID", name: "Name", age: "Age", gender: "Gender",
    village: "Village", mandal: "Mandal", phone: "Phone", program: "Program",
    enumeratorName: "Enumerator", surveyDate: "Survey date", actions: "Actions",
    noRecords: "No records match your search yet.",
    exportExcel: "Export Excel", exportPdf: "Export PDF", print: "Print",
    adminOnly: "Admins only",
    save: "Save registration", cancel: "Cancel", required: "Required",
    invalidAadhaar: "Aadhaar must be exactly 12 digits.",
    duplicateAadhaar: "This Aadhaar number is already registered in another program. Multiple program registrations are not allowed.",
    invalidPhone: "Phone number must be exactly 10 digits.",
    invalidPin: "PIN code must be 6 digits.",
    confirmDelete: "Delete this record permanently?",
    delete: "Delete", edit: "Edit", close: "Close",
    male: "Male", female: "Female", other: "Other",
    yes: "Yes", no: "No",
    low: "Low", medium: "Medium", high: "High",
    selectOption: "Select",
    noMandalsAvailable: "No mandals available yet — select Tirupati or Chittoor district",
    savedToast: "Registration saved.", updatedToast: "Record updated.", deletedToast: "Record deleted.",
    offlineNote: "Working offline — entries sync when connection returns.",
    rydeap: "Rural Youth Digital & Employability Advancement Program",
    tailoring: "Women's Tailoring & Embroidery Skill Development Program",
    waste: "Waste Segregation, Recycling & Circular Economy Initiative",
    programInfo: "Program information", personalDetails: "Personal details",
    educationInfo: "Education", addressInfo: "Address", socialInfo: "Social information",
    wasteInfo: "Waste management baseline survey",
    eduQualification: "Education qualification", eduLevel: "Education level",
    interestedSkill: "Interested skill training",
    houseNo: "House No.", district: "District", state: "State", pin: "PIN code",
    category: "Category", disability: "Disability status", shg: "SHG member",
    segregateWaste: "Segregates waste at home?", wetWaste: "Wet waste generated (kg/day)",
    dryWaste: "Dry waste generated (kg/day)", plasticWaste: "Plastic waste generated (kg/month)",
    compost: "Composts organic waste?", sellsRecyclables: "Sells recyclable materials?",
    awareness: "Awareness of waste segregation", interestedRecycling: "Interested in recycling training?",
    remarks: "Remarks",
  },
  te: {
    appName: "తపస్వి సొసైటీ",
    appSub: "గ్రామీణాభివృద్ధి, సామాజిక సమస్యలు & ఆరోగ్య సంస్థ",
    loginTitle: "కొనసాగించడానికి సైన్ ఇన్ చేయండి",
    role: "పాత్ర", admin: "అడ్మిన్", enumerator: "ఎన్యూమరేటర్",
    username: "యూజర్‌నేమ్", password: "పాస్‌వర్డ్", signIn: "సైన్ ఇన్",
    loginHint: "డెమో — ఏ యూజర్‌నేమ్ అయినా పనిచేస్తుంది. అడ్మిన్ పాస్‌వర్డ్: admin123. ఎన్యూమరేటర్ పాస్‌వర్డ్: tapasvi",
    invalidLogin: "యూజర్‌నేమ్ మరియు పాస్‌వర్డ్ సరిచూసి మళ్ళీ ప్రయత్నించండి.",
    dashboard: "డాష్‌బోర్డ్", register: "కొత్త నమోదు", records: "రికార్డులు",
    reports: "నివేదికలు", logout: "సైన్ అవుట్",
    totalBeneficiaries: "మొత్తం లబ్ధిదారులు", thisMonth: "ఈ నెలలో చేర్చబడింది",
    villagesCovered: "కవర్ చేసిన గ్రామాలు", pendingSync: "సింక్ పెండింగ్‌లో",
    programWise: "కార్యక్రమం వారీగా", villageWise: "గ్రామం వారీగా", mandalWise: "మండలం వారీగా",
    genderWise: "లింగం వారీగా", recent: "ఇటీవలి నమోదులు", viewAll: "అన్నీ చూడండి",
    searchPlaceholder: "పేరు, ఆధార్, ఫోన్, గ్రామం లేదా ఎన్యూమరేటర్ ద్వారా శోధించండి",
    filterProgram: "కార్యక్రమం", allPrograms: "అన్ని కార్యక్రమాలు",
    sno: "క్ర.సం.", regId: "నమోదు ID", name: "పేరు", age: "వయసు", gender: "లింగం",
    village: "గ్రామం", mandal: "మండలం", phone: "ఫోన్", program: "కార్యక్రమం",
    enumeratorName: "ఎన్యూమరేటర్", surveyDate: "సర్వే తేదీ", actions: "చర్యలు",
    noRecords: "మీ శోధనకు సరిపోలే రికార్డులు లేవు.",
    exportExcel: "ఎక్సెల్ ఎగుమతి", exportPdf: "PDF ఎగుమతి", print: "ప్రింట్",
    adminOnly: "అడ్మిన్‌లకు మాత్రమే",
    save: "నమోదు సేవ్ చేయండి", cancel: "రద్దు చేయండి", required: "అవసరం",
    invalidAadhaar: "ఆధార్ ఖచ్చితంగా 12 అంకెలు ఉండాలి.",
    duplicateAadhaar: "ఈ ఆధార్ నంబర్ ఇప్పటికే మరో కార్యక్రమంలో నమోదు చేయబడింది. ఒకటి కంటే ఎక్కువ కార్యక్రమాలలో నమోదు అనుమతించబడదు.",
    invalidPhone: "ఫోన్ నంబర్ ఖచ్చితంగా 10 అంకెలు ఉండాలి.",
    invalidPin: "పిన్ కోడ్ 6 అంకెలు ఉండాలి.",
    confirmDelete: "ఈ రికార్డును శాశ్వతంగా తొలగించాలా?",
    delete: "తొలగించు", edit: "సవరించు", close: "మూసివేయి",
    male: "పురుషుడు", female: "స్త్రీ", other: "ఇతర",
    yes: "అవును", no: "కాదు",
    low: "తక్కువ", medium: "మధ్యస్థం", high: "ఎక్కువ",
    selectOption: "ఎంచుకోండి",
    noMandalsAvailable: "ఇంకా మండలాలు అందుబాటులో లేవు — తిరుపతి లేదా చిత్తూరు జిల్లాను ఎంచుకోండి",
    savedToast: "నమోదు సేవ్ చేయబడింది.", updatedToast: "రికార్డు అప్‌డేట్ చేయబడింది.", deletedToast: "రికార్డు తొలగించబడింది.",
    offlineNote: "ఆఫ్‌లైన్‌లో పని చేస్తోంది — కనెక్షన్ వచ్చినప్పుడు సింక్ అవుతుంది.",
    rydeap: "గ్రామీణ యువత డిజిటల్ & ఉద్యోగ సామర్థ్య కార్యక్రమం",
    tailoring: "మహిళల టైలరింగ్ & ఎంబ్రాయిడరీ నైపుణ్యాభివృద్ధి కార్యక్రమం",
    waste: "వ్యర్థాల వేరు, రీసైక్లింగ్ & సర్క్యులర్ ఎకానమీ కార్యక్రమం",
    programInfo: "కార్యక్రమ సమాచారం", personalDetails: "వ్యక్తిగత వివరాలు",
    educationInfo: "విద్య", addressInfo: "చిరునామా", socialInfo: "సామాజిక సమాచారం",
    wasteInfo: "వ్యర్థాల నిర్వహణ సర్వే",
    eduQualification: "విద్యా అర్హత", eduLevel: "విద్యా స్థాయి",
    interestedSkill: "ఆసక్తి గల నైపుణ్య శిక్షణ",
    houseNo: "ఇంటి నెం.", district: "జిల్లా", state: "రాష్ట్రం", pin: "పిన్ కోడ్",
    category: "వర్గం", disability: "వికలాంగత స్థితి", shg: "SHG సభ్యుడు",
    segregateWaste: "ఇంట్లో వ్యర్థాలను వేరు చేస్తారా?", wetWaste: "తడి వ్యర్థం (కేజీ/రోజు)",
    dryWaste: "పొడి వ్యర్థం (కేజీ/రోజు)", plasticWaste: "ప్లాస్టిక్ వ్యర్థం (కేజీ/నెల)",
    compost: "సేంద్రీయ వ్యర్థాన్ని కంపోస్ట్ చేస్తారా?", sellsRecyclables: "రీసైకిల్ చేయగల వస్తువులను అమ్ముతారా?",
    awareness: "వ్యర్థాల విభజన అవగాహన", interestedRecycling: "రీసైక్లింగ్ శిక్షణలో ఆసక్తి?",
    remarks: "వ్యాఖ్యలు",
  },
};

/* ============================================================
   LOGIN PASSWORDS — change these to update sign-in credentials.
   Demo only: passwords are plain text and visible in this file.
   For a real deployed app, move authentication to a backend
   (see note in chat) instead of editing this file each time.
   ============================================================ */
const LOGIN_PASSWORDS = {
  admin: "admin123",
  enumerator: "tapasvi",
};

/* ---------------- Program config ---------------- */
const PROGRAMS = {
  rydeap: { key: "rydeap", labelKey: "rydeap", short: "RYDEAP", icon: Laptop, color: "#0E5C73", tint: "#E7F1F3", code: "RY" },
  tailoring: { key: "tailoring", labelKey: "tailoring", short: "Tailoring", icon: Scissors, color: "#B0581F", tint: "#FBEEE3", code: "TE" },
  waste: { key: "waste", labelKey: "waste", short: "Waste Mgmt", icon: Leaf, color: "#1B5E3F", tint: "#E7F2EB", code: "WS" },
};

const EDU_LEVELS = ["Illiterate", "Primary", "Upper Primary", "Secondary", "Higher Secondary", "Graduate", "Post Graduate"];
const EDU_QUALIFICATIONS = [
  "Below 5th Class", "5th Class", "7th Class", "10th Class / SSC", "Intermediate / 12th",
  "ITI", "Diploma", "Graduate (BA/BSc/BCom/BTech etc.)", "Post Graduate (MA/MSc/MCom/MTech etc.)",
  "Professional Degree (B.Ed/LLB/MBBS etc.)", "No Formal Education",
];
const CATEGORIES_FULL = ["SC", "ST", "BC", "OC", "Minority"];
const CATEGORIES_TAILORING = ["SC", "ST", "BC", "OC"];

const SKILLS_RYDEAP = [
  "Digital Literacy Training",
  "Employability Skills Development",
  "Advanced Digital Skills",
  "Career Guidance & Counseling",
  "Entrepreneurship Development",
];
const SKILLS_TAILORING = [
  "Skill Training",
  "Entrepreneurship Development",
];

// Full current list of Andhra Pradesh districts (28, post Dec 2025 reorganisation)
const DISTRICTS_AP_FULL = [
  "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla",
  "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada",
  "Dr. B. R. Ambedkar Konaseema", "Krishna", "Kurnool", "Markapuram", "NTR",
  "Nandyal", "Palnadu", "Parvathipuram Manyam", "Polavaram", "Prakasam",
  "Sri Sathya Sai", "Sri Potti Sriramulu Nellore", "Srikakulam", "Tirupati",
  "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa",
];

// Focused district list for the Waste Management program (Tirupati/Chittoor area focus)
const DISTRICTS_WASTE = ["Tirupati", "Chittoor", "Ananthapuramu", "YSR Kadapa", "Sri Potti Sriramulu Nellore", "Kurnool", "Other"];

// Mandals available per district (only populated for Tirupati and Chittoor for now)
const MANDALS_BY_DISTRICT = {
  "Tirupati": ["Pakala", "Chandragiri", "Vedurukuppam", "Rompicherla"],
  "Chittoor": ["Penumuru", "Puthalapattu"],
};

/* ---------------- Helpers ---------------- */
function nextRegId(records, programKey) {
  const code = PROGRAMS[programKey].code;
  const nums = records.filter(r => r.program === programKey).map(r => {
    const m = r.id.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `TPS-${code}-${String(next).padStart(4, "0")}`;
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printRows(rows, title) {
  const w = window.open("", "_blank");
  if (!w) return;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const style = `
    body{font-family:Arial,sans-serif;padding:24px;color:#23282B}
    h1{color:#1B5E3F;font-size:18px;margin-bottom:4px}
    p{color:#666;font-size:12px;margin-top:0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border:1px solid #ccc;padding:6px 8px;font-size:11px;text-align:left}
    th{background:#1B5E3F;color:#fff}
    tr:nth-child(even){background:#F7F5EF}
  `;
  const tableHtml = `
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  w.document.write(`<html><head><title>${title}</title><style>${style}</style></head>
    <body><h1>TAPASVI Society — ${title}</h1><p>Generated ${new Date().toLocaleString()}</p>${tableHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function flattenForExport(r, t) {
  const p = PROGRAMS[r.program];
  const base = {
    [t.regId]: r.id, [t.program]: t[p.labelKey] || p.short, [t.name]: r.name, [t.age]: r.age, [t.gender]: r.gender,
    "Aadhaar": r.aadhaar, [t.phone]: r.phone, [t.houseNo]: r.houseNo, [t.village]: r.village,
    [t.mandal]: r.mandal, [t.district]: r.district, [t.state]: r.state, [t.pin]: r.pin,
    [t.category]: r.category, [t.disability]: r.disability,
    [t.enumeratorName]: r.enumeratorName, [t.surveyDate]: r.surveyDate,
  };
  if (r.program === "rydeap") {
    base[t.eduQualification] = r.eduQualification; base[t.eduLevel] = r.eduLevel;
    base[t.interestedSkill] = r.interestedSkill; base["SHG"] = r.shg;
  } else if (r.program === "tailoring") {
    base[t.eduLevel] = r.eduLevel; base[t.interestedSkill] = r.interestedSkill; base["SHG"] = r.shg;
  } else if (r.program === "waste") {
    base[t.segregateWaste] = r.segregateWaste; base[t.wetWaste] = r.wetWaste; base[t.dryWaste] = r.dryWaste;
    base[t.plasticWaste] = r.plasticWaste; base[t.compost] = r.compost; base[t.sellsRecyclables] = r.sellsRecyclables;
    base[t.awareness] = r.awareness; base[t.interestedRecycling] = r.interestedRecycling; base[t.remarks] = r.remarks;
  }
  return base;
}

/* ---------------- Small UI atoms ---------------- */
function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="23" fill="#1B5E3F" />
      <path d="M24 8 C24 8 14 16 14 26 C14 33.7 18.7 38 24 38 C29.3 38 34 33.7 34 26 C34 16 24 8 24 8 Z" fill="#F7F5EF" opacity="0.95" />
      <path d="M24 14 C24 14 19 19 19 25.5 C19 30 21.5 33 24 33" stroke="#0E5C73" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="26" r="3.2" fill="#D98E04" />
    </svg>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-[13px] font-medium text-[#23282B] mb-1.5">
        {label}{required && <span className="text-[#B0581F]"> *</span>}
      </span>
      {children}
      {error && <span className="block text-[12px] text-[#B0581F] mt-1">{error}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-[#D9D4C7] bg-white px-3.5 py-2.5 text-[14px] text-[#23282B] outline-none transition focus:border-[#1B5E3F] focus:ring-2 focus:ring-[#1B5E3F]/15 placeholder:text-[#A8A299]";
const selectCls = inputCls + " appearance-none";

function TextInput({ className, ...props }) { return <input {...props} className={className || inputCls} />; }
function Select({ options, ...props }) {
  return (
    <select {...props} className={selectCls}>
      {options.map(o => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

function Toast({ message, onDone }) {
  React.useEffect(() => { const id = setTimeout(onDone, 2600); return () => clearTimeout(id); }, [onDone]);
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-[13px] shadow-lg animate-[fadein_.2s_ease]" style={{ background: "#23282B", color: "#FFFFFF" }}>
      <Check size={16} className="text-[#7FD99A]" /> {message}
    </div>
  );
}

/* ============================================================
   LOGIN
   ============================================================ */
function LoginScreen({ t, lang, setLang, onLogin }) {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!username.trim() || password !== LOGIN_PASSWORDS[role]) {
      setError(t.invalidLogin);
      return;
    }
    onLogin({ role, username: username.trim() });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5EF] px-4 py-10 overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B5E3F] via-[#0E5C73] to-[#1B5E3F]" />
      <button
        onClick={() => setLang(lang === "en" ? "te" : "en")}
        className="absolute top-5 right-5 flex items-center gap-1.5 rounded-full border border-[#D9D4C7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#23282B] hover:border-[#1B5E3F] transition"
      >
        <Globe size={14} /> {lang === "en" ? "తెలుగు" : "English"}
      </button>

      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-7">
          <Logo size={56} />
          <h1 className="mt-3 text-[22px] font-bold text-[#1B5E3F] text-center" style={{ fontFamily: "Archivo, sans-serif" }}>{t.appName}</h1>
          <p className="mt-1 text-[12.5px] text-[#666] text-center max-w-[300px] leading-snug">{t.appSub}</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E1D5] shadow-sm p-6">
          <h2 className="text-[15px] font-semibold text-[#23282B] mb-5">{t.loginTitle}</h2>

          <span className="block text-[13px] font-medium text-[#23282B] mb-2">{t.role}</span>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {["admin", "enumerator"].map(r => (
              <button
                type="button" key={r}
                onClick={() => setRole(r)}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition ${
                  role === r ? "" : "border-[#D9D4C7] text-[#23282B] hover:border-[#1B5E3F]"
                }`}
                style={role === r ? { borderColor: "#1B5E3F", background: "#1B5E3F", color: "#FFFFFF" } : undefined}
              >
                {r === "admin" ? <Lock size={14} /> : <User size={14} />}
                {r === "admin" ? t.admin : t.enumerator}
              </button>
            ))}
          </div>

          <Field label={t.username} required>
            <TextInput value={username} onChange={e => setUsername(e.target.value)} placeholder={role === "admin" ? "admin" : "enumerator1"} />
          </Field>
          <Field label={t.password} required error={error}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </Field>

          <button type="submit" onClick={submit} className="w-full mt-2 rounded-lg py-3 text-[14px] font-semibold transition active:opacity-90" style={{ background: "#1B5E3F", color: "#FFFFFF" }}>
            {t.signIn}
          </button>
          <p className="mt-3 text-[11.5px] text-[#999] text-center">{t.loginHint}</p>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   FIELD CARD — signature element for records list
   ============================================================ */
function FieldCard({ r, t, onEdit, onDelete, isAdmin }) {
  const p = PROGRAMS[r.program];
  const Icon = p.icon;
  return (
    <div className="relative rounded-xl bg-white border border-[#E5E1D5] shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: p.color }} />
      <div className="pl-5 pr-4 py-3.5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
          <Icon size={18} style={{ color: p.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14px] text-[#23282B]">{r.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: p.tint, color: p.color }}>{p.short}</span>
            {!r.synced && (
              <span className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-[#FBEFD6] text-[#9A6B00]">
                <AlertCircle size={10} /> {t.pendingSync}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[#727870] flex-wrap">
            <span>{r.id}</span>
            <span>•</span>
            <span>{r.age}{r.gender ? `, ${r.gender}` : ""}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin size={11} />{r.village}, {r.mandal}</span>
            <span>•</span>
            <span>{r.enumeratorName}</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(r)} className="p-2 rounded-lg text-[#0E5C73] hover:bg-[#E7F1F3] transition" title={t.edit}><Edit2 size={15} /></button>
            <button onClick={() => onDelete(r)} className="p-2 rounded-lg text-[#B0581F] hover:bg-[#FBEEE3] transition" title={t.delete}><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   REGISTRATION FORM
   ============================================================ */
function RegistrationForm({ t, lang, programKey, setProgramKey, records, editing, onSave, onCancel, currentUser }) {
  const blank = {
    program: programKey, name: "", age: "", gender: "Male", aadhaar: "", phone: "",
    eduQualification: "", eduLevel: "", interestedSkill: "",
    houseNo: "", village: "", mandal: "", district: programKey === "waste" ? "Tirupati" : "", state: "Andhra Pradesh", pin: "",
    category: "BC", disability: "No", shg: "No",
    segregateWaste: "No", wetWaste: "", dryWaste: "", plasticWaste: "", compost: "No", sellsRecyclables: "No",
    awareness: "Medium", interestedRecycling: "No", remarks: "",
    enumeratorName: currentUser.role === "enumerator" ? currentUser.username : "",
    surveyDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t.required;
    if (!form.age) e.age = t.required;
    if (!/^\d{12}$/.test(form.aadhaar)) {
      e.aadhaar = t.invalidAadhaar;
    } else if (form.program === "rydeap" || form.program === "tailoring") {
      const dup = records.find(r =>
        r.aadhaar === form.aadhaar &&
        r.id !== (editing && editing.id) &&
        (r.program === "rydeap" || r.program === "tailoring")
      );
      if (dup) e.aadhaar = t.duplicateAadhaar;
    }
    if (!/^\d{10}$/.test(form.phone)) e.phone = t.invalidPhone;
    if (form.pin && !/^\d{6}$/.test(form.pin)) e.pin = t.invalidPin;
    if (!form.village.trim()) e.village = t.required;
    if (!MANDALS_BY_DISTRICT[form.district]) {
      e.district = t.noMandalsAvailable;
    } else if (!form.mandal.trim()) {
      e.mandal = t.required;
    }
    if (!form.enumeratorName.trim()) e.enumeratorName = t.required;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  const p = PROGRAMS[form.program];

  return (
    <div className="max-w-[820px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-[#23282B]" style={{ fontFamily: "Archivo, sans-serif" }}>
            {editing ? t.edit : t.register}
          </h2>
          <p className="text-[13px] text-[#727870] mt-0.5">{t[p.labelKey]}</p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#EDEAE0] text-[#727870] transition"><X size={18} /></button>
      </div>

      {!editing && (
        <div className="mb-6">
          <span className="block text-[13px] font-medium text-[#23282B] mb-2">{t.program}</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(PROGRAMS).map(pr => {
              const Icon = pr.icon;
              const active = form.program === pr.key;
              return (
                <button
                  key={pr.key} type="button"
                  onClick={() => { setForm(f => ({ ...blank, program: pr.key, name: f.name, surveyDate: f.surveyDate, enumeratorName: f.enumeratorName, district: pr.key === "waste" ? "Tirupati" : "" })); setProgramKey(pr.key); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition ${active ? "border-current shadow-sm" : "border-[#E5E1D5] text-[#727870] hover:border-[#C9C3B4]"}`}
                  style={active ? { color: pr.color, background: pr.tint, borderColor: pr.color } : {}}
                >
                  <Icon size={18} />
                  <span className="text-[11.5px] font-medium text-center leading-tight">{pr.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E1D5] p-6">
        {/* Program info */}
        <SectionLabel text={t.programInfo} color={p.color} />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label={t.enumeratorName} required error={errors.enumeratorName}>
            <TextInput
              value={form.enumeratorName}
              onChange={currentUser.role === "enumerator" ? undefined : set("enumeratorName")}
              readOnly={currentUser.role === "enumerator"}
              placeholder="Enumerator name"
              className={currentUser.role === "enumerator" ? inputCls + " bg-[#F7F5EF] text-[#727870] cursor-not-allowed" : inputCls}
            />
          </Field>
          <Field label={t.surveyDate} required>
            <input type="date" value={form.surveyDate} onChange={set("surveyDate")} className={inputCls} />
          </Field>
        </div>

        {/* Personal */}
        <SectionLabel text={t.personalDetails} color={p.color} />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label={t.name} required error={errors.name}>
            <TextInput value={form.name} onChange={set("name")} placeholder="Full name" />
          </Field>
          <Field label={t.age} required error={errors.age}>
            <TextInput type="number" min="0" max="120" value={form.age} onChange={set("age")} placeholder="Age" />
          </Field>
          <Field label={t.gender}>
            <Select value={form.gender} onChange={set("gender")} options={
              form.program === "tailoring" ? [{ value: "Female", label: t.female }]
                : [{ value: "Male", label: t.male }, { value: "Female", label: t.female }, { value: "Other", label: t.other }]
            } disabled={form.program === "tailoring"} />
          </Field>
          <Field label="Aadhaar" required error={errors.aadhaar}>
            <TextInput
              value={form.aadhaar}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                setForm(f => ({ ...f, aadhaar: digits }));
                if (digits.length === 12 && (form.program === "rydeap" || form.program === "tailoring")) {
                  const dup = records.find(r =>
                    r.aadhaar === digits &&
                    r.id !== (editing && editing.id) &&
                    (r.program === "rydeap" || r.program === "tailoring")
                  );
                  setErrors(prev => ({ ...prev, aadhaar: dup ? t.duplicateAadhaar : undefined }));
                } else {
                  setErrors(prev => ({ ...prev, aadhaar: undefined }));
                }
              }}
              placeholder="12-digit Aadhaar" inputMode="numeric"
            />
          </Field>
          <Field label={t.phone} required error={errors.phone}>
            <TextInput value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit phone" inputMode="numeric" />
          </Field>
        </div>

        {/* Education (rydeap + tailoring) */}
        {form.program !== "waste" && (
          <>
            <SectionLabel text={t.educationInfo} color={p.color} />
            <div className="grid grid-cols-2 gap-x-4">
              {form.program === "rydeap" && (
                <Field label={t.eduQualification}>
                  <Select value={form.eduQualification} onChange={set("eduQualification")} options={[{ value: "", label: t.selectOption }, ...EDU_QUALIFICATIONS]} />
                </Field>
              )}
              <Field label={t.eduLevel}>
                <Select value={form.eduLevel} onChange={set("eduLevel")} options={[{ value: "", label: t.selectOption }, ...EDU_LEVELS]} />
              </Field>
              <Field label={t.interestedSkill}>
                <Select
                  value={form.interestedSkill}
                  onChange={set("interestedSkill")}
                  options={[{ value: "", label: t.selectOption }, ...(form.program === "tailoring" ? SKILLS_TAILORING : SKILLS_RYDEAP)]}
                />
              </Field>
            </div>
          </>
        )}

        {/* Address */}
        <SectionLabel text={t.addressInfo} color={p.color} />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label={t.houseNo}>
            <TextInput value={form.houseNo} onChange={set("houseNo")} />
          </Field>
          <Field label={t.village} required error={errors.village}>
            <TextInput value={form.village} onChange={set("village")} />
          </Field>
          <Field label={t.district} required error={errors.district}>
            {form.program === "waste" ? (
              <Select
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value, mandal: "" }))}
                options={DISTRICTS_WASTE}
              />
            ) : (
              <Select
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value, mandal: "" }))}
                options={[{ value: "", label: t.selectOption }, ...DISTRICTS_AP_FULL]}
              />
            )}
          </Field>
          <Field label={t.mandal} required error={errors.mandal}>
            {MANDALS_BY_DISTRICT[form.district] ? (
              <Select
                value={form.mandal}
                onChange={set("mandal")}
                options={[
                  { value: "", label: t.selectOption },
                  ...(form.mandal && !MANDALS_BY_DISTRICT[form.district].includes(form.mandal) ? [form.mandal] : []),
                  ...MANDALS_BY_DISTRICT[form.district],
                ]}
              />
            ) : (
              <select disabled className={selectCls + " bg-[#F7F5EF] text-[#A8A299] cursor-not-allowed"}>
                <option>{form.mandal || t.noMandalsAvailable}</option>
              </select>
            )}
          </Field>
          <Field label={t.state}>
            <TextInput value={form.state} disabled className={inputCls + " bg-[#F7F5EF] text-[#888]"} />
          </Field>
          <Field label={t.pin} error={errors.pin}>
            <TextInput value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="6-digit PIN" inputMode="numeric" />
          </Field>
        </div>

        {/* Social */}
        <SectionLabel text={t.socialInfo} color={p.color} />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label={t.category}>
            <Select value={form.category} onChange={set("category")} options={form.program === "tailoring" ? CATEGORIES_TAILORING : CATEGORIES_FULL} />
          </Field>
          <Field label={t.disability}>
            <Select value={form.disability} onChange={set("disability")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
          </Field>
          {form.program !== "waste" && (
            <Field label={t.shg}>
              <Select value={form.shg} onChange={set("shg")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
            </Field>
          )}
        </div>

        {/* Waste-specific */}
        {form.program === "waste" && (
          <>
            <SectionLabel text={t.wasteInfo} color={p.color} />
            <div className="grid grid-cols-2 gap-x-4">
              <Field label={t.segregateWaste}>
                <Select value={form.segregateWaste} onChange={set("segregateWaste")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
              </Field>
              <Field label={t.wetWaste}>
                <TextInput type="number" step="0.1" value={form.wetWaste} onChange={set("wetWaste")} />
              </Field>
              <Field label={t.dryWaste}>
                <TextInput type="number" step="0.1" value={form.dryWaste} onChange={set("dryWaste")} />
              </Field>
              <Field label={t.plasticWaste}>
                <TextInput type="number" step="0.1" value={form.plasticWaste} onChange={set("plasticWaste")} />
              </Field>
              <Field label={t.compost}>
                <Select value={form.compost} onChange={set("compost")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
              </Field>
              <Field label={t.sellsRecyclables}>
                <Select value={form.sellsRecyclables} onChange={set("sellsRecyclables")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
              </Field>
              <Field label={t.awareness}>
                <Select value={form.awareness} onChange={set("awareness")} options={[{ value: "Low", label: t.low }, { value: "Medium", label: t.medium }, { value: "High", label: t.high }]} />
              </Field>
              <Field label={t.interestedRecycling}>
                <Select value={form.interestedRecycling} onChange={set("interestedRecycling")} options={[{ value: "No", label: t.no }, { value: "Yes", label: t.yes }]} />
              </Field>
            </div>
            <Field label={t.remarks}>
              <textarea value={form.remarks} onChange={set("remarks")} rows={3} className={inputCls} />
            </Field>
          </>
        )}

        <div className="flex items-center gap-3 mt-2 pt-4 border-t border-[#EFEBDE]">
          <button type="submit" onClick={submit} className="rounded-lg px-5 py-2.5 text-[14px] font-semibold transition active:opacity-90" style={{ background: p.color, color: "#FFFFFF" }}>
            {t.save}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-[#D9D4C7] px-5 py-2.5 text-[14px] font-medium text-[#23282B] hover:bg-[#F7F5EF] transition">
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionLabel({ text, color }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3 first:mt-0">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color }}>{text}</span>
      <div className="flex-1 h-px bg-[#EFEBDE]" />
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function StatCard({ icon: Icon, label, value, color, tint }) {
  return (
    <div className="rounded-xl bg-white border border-[#E5E1D5] p-4 flex items-center gap-3.5">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tint }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-[20px] font-bold text-[#23282B] leading-none" style={{ fontFamily: "Archivo, sans-serif" }}>{value}</p>
        <p className="text-[12px] text-[#727870] mt-1">{label}</p>
      </div>
    </div>
  );
}

function BarRow({ label, count, max, color }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12.5px] text-[#23282B] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#EFEBDE] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[12.5px] font-semibold text-[#23282B] w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

function Dashboard({ t, records, isAdmin, onGoRecords }) {
  const total = records.length;
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return records.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [records]);
  const villages = useMemo(() => new Set(records.map(r => r.village)).size, [records]);
  const pendingSync = records.filter(r => !r.synced).length;

  const byProgram = useMemo(() => {
    const m = {};
    Object.keys(PROGRAMS).forEach(k => m[k] = 0);
    records.forEach(r => m[r.program] = (m[r.program] || 0) + 1);
    return m;
  }, [records]);

  const byVillage = useMemo(() => {
    const m = {};
    records.forEach(r => m[r.village] = (m[r.village] || 0) + 1);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [records]);

  const byMandal = useMemo(() => {
    const m = {};
    records.forEach(r => m[r.mandal] = (m[r.mandal] || 0) + 1);
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [records]);

  const byGender = useMemo(() => {
    const m = {};
    records.forEach(r => { if (r.gender) m[r.gender] = (m[r.gender] || 0) + 1; });
    return m;
  }, [records]);

  const recent = useMemo(() => [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5), [records]);
  const maxVillage = Math.max(1, ...byVillage.map(v => v[1]));
  const maxMandal = Math.max(1, ...byMandal.map(v => v[1]));

  return (
    <div>
      <h2 className="text-[19px] font-bold text-[#23282B] mb-5" style={{ fontFamily: "Archivo, sans-serif" }}>{t.dashboard}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label={t.totalBeneficiaries} value={total} color="#1B5E3F" tint="#E7F2EB" />
        <StatCard icon={ClipboardList} label={t.thisMonth} value={thisMonthCount} color="#0E5C73" tint="#E7F1F3" />
        <StatCard icon={MapPin} label={t.villagesCovered} value={villages} color="#B0581F" tint="#FBEEE3" />
        <StatCard icon={AlertCircle} label={t.pendingSync} value={pendingSync} color="#9A6B00" tint="#FBEFD6" />
      </div>

      {isAdmin && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-white border border-[#E5E1D5] p-5">
            <h3 className="text-[13px] font-semibold text-[#23282B] mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-[#1B5E3F]" />{t.programWise}</h3>
            <div className="space-y-3">
              {Object.values(PROGRAMS).map(p => (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                    <p.icon size={14} style={{ color: p.color }} />
                  </div>
                  <span className="text-[12.5px] text-[#23282B] flex-1 truncate">{p.short}</span>
                  <span className="text-[14px] font-bold text-[#23282B]">{byProgram[p.key] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#E5E1D5] p-5">
            <h3 className="text-[13px] font-semibold text-[#23282B] mb-4 flex items-center gap-2"><Users size={15} className="text-[#0E5C73]" />{t.genderWise}</h3>
            <div className="flex items-end gap-6 h-24 px-2">
              {Object.entries(byGender).map(([g, c]) => (
                <div key={g} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[14px] font-bold text-[#23282B]">{c}</span>
                  <div className="w-full rounded-t-md" style={{ height: `${Math.max(8, (c / Math.max(...Object.values(byGender))) * 60)}px`, opacity: 0.85, background: "#0E5C73" }} />
                  <span className="text-[11.5px] text-[#727870]">{t[g.toLowerCase()] || g}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#E5E1D5] p-5">
            <h3 className="text-[13px] font-semibold text-[#23282B] mb-4 flex items-center gap-2"><MapPin size={15} className="text-[#B0581F]" />{t.villageWise}</h3>
            {byVillage.map(([v, c]) => <BarRow key={v} label={v} count={c} max={maxVillage} color="#B0581F" />)}
          </div>

          <div className="rounded-xl bg-white border border-[#E5E1D5] p-5">
            <h3 className="text-[13px] font-semibold text-[#23282B] mb-4 flex items-center gap-2"><MapPin size={15} className="text-[#1B5E3F]" />{t.mandalWise}</h3>
            {byMandal.map(([v, c]) => <BarRow key={v} label={v} count={c} max={maxMandal} color="#1B5E3F" />)}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-[#E5E1D5] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[#23282B]">{t.recent}</h3>
          <button onClick={onGoRecords} className="text-[12px] font-medium text-[#1B5E3F] hover:underline flex items-center gap-1">{t.viewAll}<ChevronRight size={13} /></button>
        </div>
        <div className="space-y-2.5">
          {recent.map(r => <FieldCard key={r.id} r={r} t={t} isAdmin={false} />)}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RECORDS LIST
   ============================================================ */
function RecordsView({ t, records, isAdmin, onEdit, onDelete, onExportExcel, onExportPdf, onPrint }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");

  const filtered = useMemo(() => {
    let r = records;
    if (programFilter !== "all") r = r.filter(x => x.program === programFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter(x =>
        x.name?.toLowerCase().includes(q) ||
        x.aadhaar?.includes(q) ||
        x.phone?.includes(q) ||
        x.village?.toLowerCase().includes(q) ||
        x.enumeratorName?.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [records, query, programFilter]);

  const activeLabel = programFilter === "all" ? t.allPrograms : (t[PROGRAMS[programFilter].labelKey] || PROGRAMS[programFilter].short);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-[19px] font-bold text-[#23282B]" style={{ fontFamily: "Archivo, sans-serif" }}>{t.records}</h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => onExportExcel(filtered, activeLabel)} className="flex items-center gap-1.5 rounded-lg border border-[#D9D4C7] px-3 py-2 text-[12.5px] font-medium text-[#23282B] hover:bg-white transition">
              <FileSpreadsheet size={14} /> {t.exportExcel}
            </button>
            <button onClick={() => onExportPdf(filtered, activeLabel)} className="flex items-center gap-1.5 rounded-lg border border-[#D9D4C7] px-3 py-2 text-[12.5px] font-medium text-[#23282B] hover:bg-white transition">
              <Download size={14} /> {t.exportPdf}
            </button>
            <button onClick={() => onPrint(filtered, activeLabel)} className="flex items-center gap-1.5 rounded-lg border border-[#D9D4C7] px-3 py-2 text-[12.5px] font-medium text-[#23282B] hover:bg-white transition">
              <Printer size={14} /> {t.print}
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl bg-white border border-[#E5E1D5] p-4 mb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#727870] mb-3">{t.program}-wise export</p>
          <div className="grid sm:grid-cols-3 gap-2.5">
            {Object.values(PROGRAMS).map(p => {
              const rows = records.filter(r => r.program === p.key);
              const Icon = p.icon;
              return (
                <div key={p.key} className="rounded-lg border border-[#EFEBDE] p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                      <Icon size={14} style={{ color: p.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#23282B] truncate">{p.short}</p>
                      <p className="text-[11px] text-[#999]">{rows.length} records</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button title={t.exportExcel} onClick={() => onExportExcel(rows, t[p.labelKey] || p.short)} className="p-1.5 rounded-md text-[#23282B] hover:bg-[#F7F5EF] transition disabled:opacity-30" disabled={!rows.length}>
                      <FileSpreadsheet size={15} />
                    </button>
                    <button title={t.exportPdf} onClick={() => onExportPdf(rows, t[p.labelKey] || p.short)} className="p-1.5 rounded-md text-[#23282B] hover:bg-[#F7F5EF] transition disabled:opacity-30" disabled={!rows.length}>
                      <Download size={15} />
                    </button>
                    <button title={t.print} onClick={() => onPrint(rows, t[p.labelKey] || p.short)} className="p-1.5 rounded-md text-[#23282B] hover:bg-[#F7F5EF] transition disabled:opacity-30" disabled={!rows.length}>
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A299]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className={inputCls + " pl-9"} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#727870]" />
          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className={selectCls + " w-auto min-w-[160px]"}>
            <option value="all">{t.allPrograms}</option>
            {Object.values(PROGRAMS).map(p => <option key={p.key} value={p.key}>{p.short}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#A8A299]">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-[13.5px]">{t.noRecords}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(r => <FieldCard key={r.id} r={r} t={t} onEdit={onEdit} onDelete={onDelete} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
export default function App() {
  const [lang, setLang] = useState("en");
  const t = STR[lang];
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [editingRecord, setEditingRecord] = useState(null);
  const [programKey, setProgramKey] = useState("rydeap");
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = user?.role === "admin";

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      setLoadError(error.message);
      setLoadingRecords(false);
      return;
    }
    setRecords((data || []).map(dbRowToRecord));
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    if (user) loadRecords();
  }, [user, loadRecords]);

  const handleSave = useCallback(async (form) => {
    if (editingRecord) {
      const { error } = await supabase
        .from("beneficiaries")
        .update(recordToDbRow(form))
        .eq("id", editingRecord.id);
      if (error) { setToast("Error: " + error.message); return; }
      setRecords(rs => rs.map(r => r.id === editingRecord.id ? { ...r, ...form } : r));
      setToast(t.updatedToast);
    } else {
      const id = nextRegId(records, form.program);
      const sno = records.length + 1;
      const rec = { ...form, id, sno, createdAt: new Date().toISOString(), synced: navigator.onLine !== false };
      const { error } = await supabase.from("beneficiaries").insert(recordToDbRow(rec));
      if (error) { setToast("Error: " + error.message); return; }
      setRecords(rs => [...rs, rec]);
      setToast(t.savedToast);
    }
    setEditingRecord(null);
    setView("records");
  }, [editingRecord, records, t]);

  const handleEdit = (r) => { setEditingRecord(r); setProgramKey(r.program); setView("form"); };
  const handleDeleteConfirm = async () => {
    const { error } = await supabase.from("beneficiaries").delete().eq("id", deleteTarget.id);
    if (error) { setToast("Error: " + error.message); setDeleteTarget(null); return; }
    setRecords(rs => rs.filter(r => r.id !== deleteTarget.id));
    setToast(t.deletedToast);
    setDeleteTarget(null);
  };

  const exportExcel = (rows, label) => downloadCSV(rows.map(r => flattenForExport(r, t)), `TAPASVI_${label.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
  const exportPdf = (rows, label) => printRows(rows.map(r => flattenForExport(r, t)), `${t.records} — ${label}`);
  const printOut = (rows, label) => printRows(rows.map(r => flattenForExport(r, t)), `${t.records} — ${label}`);

  if (!user) {
    return <LoginScreen t={t} lang={lang} setLang={setLang} onLogin={setUser} />;
  }

  if (loadingRecords) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5EF]">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
          <p className="text-[13px] text-[#727870]">Loading records…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5EF] px-4">
        <div className="max-w-[360px] text-center">
          <AlertCircle size={28} className="mx-auto mb-3 text-[#B0581F]" />
          <p className="text-[14px] text-[#23282B] mb-2">Couldn't load records.</p>
          <p className="text-[12px] text-[#727870] mb-4">{loadError}</p>
          <button onClick={loadRecords} className="rounded-lg px-4 py-2 text-[13px] font-medium text-white" style={{ background: "#1B5E3F" }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const NavItem = ({ icon: Icon, label, active, onClick, restricted }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium transition ${
        active ? "" : "text-[#3A4038] hover:bg-[#EFEBDE]"
      }`}
      style={active ? { background: "#1B5E3F", color: "#FFFFFF" } : undefined}
    >
      <Icon size={17} />
      <span className="flex-1 text-left">{label}</span>
      {restricted && !isAdmin && <Lock size={11} className="opacity-50" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F5EF] flex" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Sidebar */}
      <aside className="w-[230px] bg-white border-r border-[#E5E1D5] flex flex-col shrink-0 hidden md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#EFEBDE]">
          <Logo size={32} />
          <div>
            <p className="text-[13.5px] font-bold text-[#1B5E3F] leading-tight" style={{ fontFamily: "Archivo, sans-serif" }}>{t.appName}</p>
            <p className="text-[10.5px] text-[#999]">{isAdmin ? t.admin : t.enumerator}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem icon={LayoutDashboard} label={t.dashboard} active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavItem icon={Plus} label={t.register} active={view === "form" && !editingRecord} onClick={() => { setEditingRecord(null); setView("form"); }} />
          <NavItem icon={ClipboardList} label={t.records} active={view === "records"} onClick={() => setView("records")} />
        </nav>
        <div className="px-3 pb-3">
          <button onClick={() => setLang(lang === "en" ? "te" : "en")} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-[#3A4038] hover:bg-[#EFEBDE] transition mb-1">
            <Globe size={16} /> {lang === "en" ? "తెలుగు" : "English"}
          </button>
          <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-[#B0581F] hover:bg-[#FBEEE3] transition">
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E1D5] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className="text-[13px] font-bold text-[#1B5E3F]" style={{ fontFamily: "Archivo, sans-serif" }}>{t.appName}</span>
        </div>
        <button onClick={() => setUser(null)} className="p-1.5"><LogOut size={17} className="text-[#B0581F]" /></button>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-[60px] md:pt-0 pb-20 md:pb-0">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">
          {view === "dashboard" && <Dashboard t={t} records={records} isAdmin={isAdmin} onGoRecords={() => setView("records")} />}
          {view === "form" && (
            <RegistrationForm
              t={t} lang={lang} programKey={programKey} setProgramKey={setProgramKey}
              records={records} editing={editingRecord} onCancel={() => { setEditingRecord(null); setView(editingRecord ? "records" : "dashboard"); }}
              onSave={handleSave} currentUser={user}
            />
          )}
          {view === "records" && (
            <RecordsView
              t={t} records={records} isAdmin={isAdmin}
              onEdit={handleEdit} onDelete={setDeleteTarget}
              onExportExcel={exportExcel} onExportPdf={exportPdf} onPrint={printOut}
            />
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E1D5] flex items-center justify-around py-2">
        {[
          { icon: LayoutDashboard, label: t.dashboard, key: "dashboard" },
          { icon: Plus, label: t.register, key: "form" },
          { icon: ClipboardList, label: t.records, key: "records" },
        ].map(item => (
          <button key={item.key} onClick={() => { if (item.key === "form") setEditingRecord(null); setView(item.key); }} className="flex flex-col items-center gap-1 px-4 py-1">
            <item.icon size={19} className={view === item.key ? "text-[#1B5E3F]" : "text-[#A8A299]"} />
            <span className={`text-[10px] font-medium ${view === item.key ? "text-[#1B5E3F]" : "text-[#A8A299]"}`}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl p-5 max-w-[340px] w-full" onClick={e => e.stopPropagation()}>
            <p className="text-[14px] text-[#23282B] mb-4">{t.confirmDelete}</p>
            <p className="text-[12.5px] text-[#727870] mb-4">{deleteTarget.name} — {deleteTarget.id}</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteConfirm} className="flex-1 rounded-lg py-2 text-[13px] font-medium" style={{ background: "#B0581F", color: "#FFFFFF" }}>{t.delete}</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-[#D9D4C7] py-2 text-[13px] font-medium text-[#23282B]">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
