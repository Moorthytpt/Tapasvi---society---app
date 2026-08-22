/* ============================================================
   TAPASVI NGO Management System — DMS v2.1
   Training Module integrated
   ============================================================ */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { scanDocument, checkOcrEligibility, tesseractOcr, enhanceImageForOcr, cropTableRows } from "./services/ocr";
import { parseAIText, validateBatch } from "./services/bulkImport";
import ImageCaptureOptimizer from "./components/bulkImport/ImageCaptureOptimizer";
import AIReview from "./components/bulkImport/AIReview";
import PromptGenerator from "./components/bulkImport/PromptGenerator";
import ProviderConfig from "./components/bulkImport/ProviderConfig";
import { getProviderStatuses, analyzeImage } from "./services/ai/providerConnection";
import {
  Users, Leaf, Scissors, Laptop, Search, LayoutDashboard, ClipboardList,
  Plus, Download, Printer, Edit2, Trash2, LogOut, Lock, User,
  ChevronRight, X, Check, MapPin, BarChart3, FileSpreadsheet,
  AlertCircle, Filter, BookOpen, Briefcase, TrendingUp,
  CheckCircle, XCircle, Clock, Award, RefreshCw, Settings as SettingsIcon,
  Building2, Palette, Database, ShieldCheck, CreditCard
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

/* ============================================================
   LIVELIHOOD & OUTCOMES — outcome types available per program,
   and the dynamic field set each outcome type collects.
   Waste Management fields are a placeholder pending full spec.
   ============================================================ */
const OUTCOME_TYPES_BY_PROGRAM = {
  rydeap: ["local_job", "outside_job", "higher_education", "seeking_opportunity", "not_interested"],
  womens: ["local_job", "group_enterprise", "individual_business", "home_based_work", "seeking_opportunity", "not_interested"],
  waste: ["green_job", "recycling_unit_employee", "waste_collection_worker", "sanitation_worker", "mrf_worker", "shg_recycling_enterprise", "plastic_recycling_enterprise", "upcycling_handicraft", "seeking_opportunity", "not_interested"],
};

const OUTCOME_TYPE_LABELS = {
  local_job: "Local Job", outside_job: "Outside Job", higher_education: "Higher Education",
  seeking_opportunity: "Seeking Opportunity", not_interested: "Not Interested / Unable to Work",
  group_enterprise: "Group Enterprise", individual_business: "Individual Business", home_based_work: "Home-based Work",
  green_job: "Green Job", recycling_unit_employee: "Recycling Unit Employee", waste_collection_worker: "Waste Collection Worker",
  sanitation_worker: "Sanitation Worker", mrf_worker: "Material Recovery Facility (MRF) Worker",
  shg_recycling_enterprise: "SHG Recycling Enterprise", plastic_recycling_enterprise: "Plastic Recycling Enterprise",
  upcycling_handicraft: "Upcycling / Handicraft",
};

const OUTCOME_FIELDS = {
  local_job: [
    { key: "employer", label: "Employer Name", required: true },
    { key: "job_role", label: "Job Role", required: true },
    { key: "salary", label: "Salary (₹)", type: "number" },
    { key: "village_mandal", label: "Village/Mandal" },
    { key: "joining_date", label: "Joining Date", type: "date" },
  ],
  outside_job: [
    { key: "company", label: "Company Name", required: true },
    { key: "job_role", label: "Job Role", required: true },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "salary", label: "Salary (₹)", type: "number" },
    { key: "joining_date", label: "Joining Date", type: "date" },
  ],
  higher_education: [
    { key: "institution", label: "Institution", required: true },
    { key: "course", label: "Course" },
    { key: "duration", label: "Duration" },
    { key: "admission_date", label: "Admission Date", type: "date" },
  ],
  seeking_opportunity: [
    { key: "preferred_job", label: "Preferred Job" },
    { key: "preferred_location", label: "Preferred Location" },
    { key: "expected_salary", label: "Expected Salary (₹)", type: "number" },
    { key: "reason", label: "Reason", type: "textarea" },
    { key: "next_followup_date", label: "Next Follow-up Date", type: "date" },
  ],
  not_interested: [
    { key: "reason", label: "Reason", type: "textarea" },
    { key: "remarks", label: "Remarks", type: "textarea" },
  ],
  group_enterprise: [
    { key: "group_name", label: "Group Name", required: true },
    { key: "business_name", label: "Business Name" },
    { key: "business_type", label: "Business Type" },
    { key: "num_members", label: "Number of Members", type: "number" },
    { key: "group_leader", label: "Group Leader" },
    { key: "beneficiary_members", label: "Beneficiary Members (comma separated)", type: "textarea" },
    { key: "village", label: "Village" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "funding_source", label: "Funding Source" },
    { key: "monthly_group_income", label: "Monthly Group Income (₹)", type: "number" },
    { key: "income_per_member", label: "Income Per Member (₹)", type: "number" },
    { key: "business_status", label: "Business Status", type: "select", options: ["Active", "Inactive", "Closed"] },
  ],
  individual_business: [
    { key: "business_name", label: "Business Name", required: true },
    { key: "business_category", label: "Business Category" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "investment", label: "Investment (₹)", type: "number" },
    { key: "funding_source", label: "Funding Source" },
    { key: "monthly_income", label: "Monthly Income (₹)", type: "number" },
    { key: "business_status", label: "Business Status", type: "select", options: ["Active", "Inactive", "Closed"] },
  ],
  home_based_work: [
    { key: "work_type", label: "Work Type" },
    { key: "products_services", label: "Products / Services" },
    { key: "monthly_income", label: "Monthly Income (₹)", type: "number" },
    { key: "started_date", label: "Started Date", type: "date" },
  ],
  // Waste Management placeholders — pending exact field spec; reuse the closest matching shape for now.
  green_job: [
    { key: "employer", label: "Employer Name", required: true },
    { key: "job_role", label: "Job Role", required: true },
    { key: "salary", label: "Salary (₹)", type: "number" },
    { key: "village_mandal", label: "Village/Mandal" },
    { key: "joining_date", label: "Joining Date", type: "date" },
  ],
};
["recycling_unit_employee", "waste_collection_worker", "sanitation_worker", "mrf_worker"].forEach(k => { OUTCOME_FIELDS[k] = OUTCOME_FIELDS.green_job; });
OUTCOME_FIELDS.shg_recycling_enterprise = OUTCOME_FIELDS.group_enterprise;
["plastic_recycling_enterprise", "upcycling_handicraft"].forEach(k => { OUTCOME_FIELDS[k] = OUTCOME_FIELDS.individual_business; });

/* ============================================================
   PARTNERS — master data module for external organizations.
   ============================================================ */
const PARTNER_TYPES = [
  { key: "company", label: "Company", prefix: "CMP" },
  { key: "industry", label: "Industry", prefix: "IND" },
  { key: "shg", label: "SHG", prefix: "SHG" },
  { key: "ngo", label: "NGO", prefix: "NGO" },
  { key: "csr", label: "CSR Partner", prefix: "CSR" },
  { key: "government", label: "Government Department", prefix: "GOV" },
  { key: "bank", label: "Bank / Financial Institution", prefix: "BNK" },
  { key: "recycler", label: "Waste Recycler / MRF", prefix: "REC" },
  { key: "training_partner", label: "Training Partner", prefix: "TRN" },
  { key: "placement_partner", label: "Placement Partner", prefix: "PLC" },
];
const PARTNER_TYPE_MAP = Object.fromEntries(PARTNER_TYPES.map(t => [t.key, t]));

function nextPartnerCode(partners, prefix) {
  const nums = partners.filter(p => p.partner_code?.startsWith(prefix + "-")).map(p => {
    const m = p.partner_code?.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}


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
// Compresses/resizes an image client-side before upload: caps the longer edge at maxDim,
// re-encodes as JPEG (which drops EXIF metadata as a side effect of canvas re-encoding),
// and steps quality down until the result is comfortably under the 5MB bucket limit.
// Non-image files (e.g. PDFs) pass through untouched.
function compressImageFile(file, maxDim = 1600, startQuality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith("image/")) { resolve(file); return; }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      const tryQuality = (q) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Could not process image")); return; }
          if (blob.size > 5 * 1024 * 1024 && q > 0.4) {
            tryQuality(q - 0.15);
          } else {
            resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
          }
        }, "image/jpeg", q);
      };
      tryQuality(startQuality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read image file")); };
    img.src = objectUrl;
  });
}

/* ============================================================
   DOCUMENT MANAGEMENT SYSTEM (DMS) — one centralized system reused
   by every module. Same private bucket, same compression engine,
   same signed-URL pattern already built for Beneficiary uploads.
   ============================================================ */
const DOCUMENT_CATEGORIES = {
  beneficiary: "Beneficiary Documents", partner: "Partner Documents", program: "Program Documents",
  training_batch: "Training Documents", assessment: "Assessment Documents", certificate: "Certificate Documents",
  general: "General Documents",
};
const DOCUMENT_TYPES = [
  "Identity Proof", "Photo", "Education Certificate", "Training Certificate", "Income Certificate",
  "Caste Certificate", "Disability Certificate", "MoU", "Agreement", "Project Document",
  "Attendance Sheet", "Assessment Report", "Completion Certificate", "Other",
];
const DOC_ACCEPT = "image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Single shared upload path for every module — compresses images (via compressImageFile),
// passes non-images through untouched, and writes one row into the central `documents` table.
async function uploadDocument({ file, entityType, entityId, documentType, uploadedBy }) {
  if (file.size > 5 * 1024 * 1024 && !file.type.startsWith("image/")) {
    throw new Error("File must be under 5 MB.");
  }
  const toUpload = await compressImageFile(file);
  if (toUpload.size > 5 * 1024 * 1024) throw new Error("File is still too large after optimization. Please choose a smaller file.");
  const ext = (toUpload.name.split(".").pop() || "dat").toLowerCase();
  const path = `dms/${entityType}/${entityId || "unlinked"}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("beneficiary-documents").upload(path, toUpload, { upsert: true });
  if (upErr) throw upErr;
  const rec = {
    entity_type: entityType, entity_id: entityId ? String(entityId) : null,
    category: DOCUMENT_CATEGORIES[entityType] || "General Documents", document_type: documentType,
    file_path: path, file_name: file.name, file_size: toUpload.size, mime_type: toUpload.type,
    status: "Active", uploaded_by: uploadedBy, uploaded_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("documents").insert(rec).select().single();
  if (error) throw error;
  return data;
}

// Reusable uploader: Take Photo / Choose from Gallery / Choose File + a document-type picker.
// Drop this into any module's profile/detail screen.
function DocumentUploader({ entityType, entityId, currentUser, onUploaded, showToast }) {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true); setStage("optimizing");
    try {
      const who = currentUser?.username || currentUser?.email || "unknown";
      setStage("uploading");
      const doc = await uploadDocument({ file, entityType, entityId, documentType, uploadedBy: who });
      onUploaded && onUploaded(doc);
      showToast && showToast("Uploaded Successfully");
    } catch (e) {
      window.alert(e.message && e.message.includes("too large") ? e.message : "We couldn't upload that file. Please try again.");
    } finally {
      setBusy(false); setStage("");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
      <Field label="Document Type"><Select value={documentType} onChange={e => setDocumentType(e.target.value)} options={DOCUMENT_TYPES} /></Field>
      {busy ? (
        <p className="text-[12px] text-[#6B7280] text-center py-2">{stage === "optimizing" ? "Optimizing…" : "Uploading…"}</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer">
            📷 Take Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </label>
          <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer">
            🖼 Gallery
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </label>
          <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer">
            📎 Choose File
            <input type="file" accept={DOC_ACCEPT} className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </label>
        </div>
      )}
      <p className="text-[10px] text-[#9CA3AF] mt-2">PDF, JPG, PNG, DOCX, XLSX · Max 5 MB · Images are auto-compressed</p>
    </div>
  );
}

// Reusable repository: lists every document linked to one entity, with view (signed URL) + archive.
function DocumentRepository({ entityType, entityId, currentUser, showToast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*")
      .eq("entity_type", entityType).eq("entity_id", String(entityId)).eq("status", "Active")
      .order("uploaded_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [entityType, entityId]);

  const view = async (doc) => {
    const { data, error } = await supabase.storage.from("beneficiary-documents").createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) { window.alert("Could not open this document."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const confirmArchive = async () => {
    await supabase.from("documents").update({ status: "Archived" }).eq("id", archiveTarget.id);
    setArchiveTarget(null); load(); showToast && showToast("Removed Successfully");
  };

  const sizeLabel = (bytes) => bytes ? (bytes / 1024 / 1024 >= 1 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`) : "";

  return (
    <div>
      <DocumentUploader entityType={entityType} entityId={entityId} currentUser={currentUser} showToast={showToast} onUploaded={() => load()} />
      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF]"><p className="text-[12.5px]">No documents uploaded yet.</p></div>
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0"><FileSpreadsheet size={16} className="text-[#1E3A8A]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-[#111827] truncate">{d.document_type}</p>
                <p className="text-[10.5px] text-[#6B7280] truncate">{d.file_name} · {sizeLabel(d.file_size)} · {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ""}</p>
              </div>
              <button onClick={() => view(d)} className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] font-medium text-[#1E3A8A] shrink-0">View</button>
              <button onClick={() => setArchiveTarget(d)} className="rounded-lg border border-[#FCA5A5] px-2.5 py-1.5 text-[11px] font-medium text-[#DC2626] shrink-0">Remove</button>
            </div>
          ))}
        </div>
      )}
      {archiveTarget && (
        <ConfirmDialog title="Remove Document?" message={`Remove "${archiveTarget.document_type}"? It will no longer appear here.`}
          onConfirm={confirmArchive} onCancel={() => setArchiveTarget(null)} />
      )}
    </div>
  );
}


/* ============================================================
   RBAC SERVICE — Sprint 5A Phase 2 (integration only, no enforcement).
   Loads the new roles/permissions/role_permissions tables once per
   session, caches them, and exposes hasRole/hasPermission/canX()
   helpers for future use. Nothing in the app calls these to gate
   anything yet — existing isAdmin/isSuperAdmin checks are untouched
   and keep working exactly as before. This hook simply makes the
   same information available in the new shape, for later phases.
   ============================================================ */
function useRBAC(currentUser) {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const cacheKey = "tapasvi_rbac_cache_" + (currentUser.username || currentUser.supabaseUser?.id || "anon");
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setRoles(parsed.roles || []); setPermissions(parsed.permissions || []);
        setRolePermissions(parsed.rolePermissions || []); setUserRoles(parsed.userRoles || []);
        setLoading(false);
        return;
      } catch (_) { /* fall through to a fresh fetch */ }
    }
    (async () => {
      const [rl, pm, rp, ur] = await Promise.all([
        supabase.from("roles").select("*"),
        supabase.from("permissions").select("*"),
        supabase.from("role_permissions").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      const result = { roles: rl.data || [], permissions: pm.data || [], rolePermissions: rp.data || [], userRoles: ur.data || [] };
      setRoles(result.roles); setPermissions(result.permissions);
      setRolePermissions(result.rolePermissions); setUserRoles(result.userRoles);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch (_) { /* storage full — non-fatal, just skip caching */ }
      setLoading(false);
    })();
  }, [currentUser?.username]);

  // Map the current user onto a role_key. Falls back to the existing admin/super_admin/fieldworker
  // model (from currentUser.role) when no matching row exists yet in the new user_roles table —
  // this is exactly the "backward compatible" mapping the sprint asked for.
  const myUserRoleRow = useMemo(() => {
    if (!currentUser) return null;
    const uid = currentUser.supabaseUser?.id || currentUser.userId;
    return userRoles.find(r => r.id === uid) || null;
  }, [userRoles, currentUser]);

  const currentRoleKey = myUserRoleRow?.role || currentUser?.role || null;
  const currentRole = useMemo(() => roles.find(r => r.role_key === currentRoleKey) || null, [roles, currentRoleKey]);

  const myPermissionKeys = useMemo(() => {
    if (!currentRole) return new Set();
    const allowedIds = new Set(rolePermissions.filter(rp => rp.role_id === currentRole.id && rp.allowed).map(rp => rp.permission_id));
    const keys = new Set();
    permissions.forEach(p => { if (allowedIds.has(p.id)) keys.add(`${p.module}:${p.action}`); });
    return keys;
  }, [currentRole, rolePermissions, permissions]);

  const hasRole = (roleKey) => currentRoleKey === roleKey;
  const hasPermission = (module, action) => myPermissionKeys.has(`${module}:${action}`);
  const canView = (module) => hasPermission(module, "view");
  const canCreate = (module) => hasPermission(module, "create");
  const canEdit = (module) => hasPermission(module, "edit");
  const canDelete = (module) => hasPermission(module, "delete");
  const canExport = (module) => hasPermission(module, "export");

  return {
    loading, roles, permissions, rolePermissions, userRoles,
    currentRoleKey, currentRole, myUserRoleRow,
    hasRole, hasPermission, canView, canCreate, canEdit, canDelete, canExport,
  };
}

/* ============================================================
   SMART BENEFICIARY IMPORT (OCR)
   Real client-side OCR via Tesseract.js, loaded from CDN at runtime
   (no npm/package.json change, no API keys, no new backend).
   Honest limitations: English-script text only, heuristic field
   parsing (not a structured ID-card reader) — every record MUST be
   reviewed/edited before import. Image upload + camera capture only
   in this pass; PDF rasterization would need an additional library
   (pdf.js) and is not included here.
   ============================================================ */
// ---------------------------------------------------------------------------
// OCR engine logic migrated to src/services/ocr/ (Phase 2 migration).
// loadTesseract, the OCR provider abstraction, image enhancement,
// parseVoterIdText, header/column/row detection, the layout-first
// TableDetector/CellCropper/HeaderDetector/FieldValidator/
// RegisterTemplateManager pipeline, and checkOcrEligibility all now live
// there — imported below as scanDocument / checkOcrEligibility / tesseractOcr.
// ---------------------------------------------------------------------------

let _pdfjsLoadPromise = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjsLoadPromise) return _pdfjsLoadPromise;
  _pdfjsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Could not load the PDF engine. Check your internet connection."));
    document.head.appendChild(script);
  });
  return _pdfjsLoadPromise;
}

// Extracts every voter record from an Electoral Roll PDF's actual text layer (no OCR/image
// recognition involved — far more reliable than scanning photos). Segments the page text by
// EPIC (Voter ID) number, then pulls Name / Father's-Husband's Name / House Number / Age /
// Gender out of each segment using the label pattern seen on standard ECI rolls.
// Shared parser: given raw "column text" (already in reading order), pull out voter records.
function parseElectoralRollFullText(fullText) {
  const epicPattern = /([A-Z]{2,4}\d{6,7})/g;
  const parts = fullText.split(epicPattern);
  const records = [];
  for (let i = 1; i < parts.length; i += 2) {
    const voterId = parts[i];
    const block = parts[i + 1] || "";
    const nameMatch = block.match(/Name\s*:?\s*(.+?)\s*(?:Fathers?\s*Name|Husbands?\s*Name|Mothers?\s*Name|House\s*Number|$)/i);
    const relMatch = block.match(/(?:Fathers?|Husbands?|Mothers?)\s*Name\s*:?\s*(.+?)\s*(?:House\s*Number|$)/i);
    const houseMatch = block.match(/House\s*Number\s*:?\s*(.+?)\s*(?:Age\s*:?|$)/i);
    const ageMatch = block.match(/Age\s*:?\s*(\d{1,3})/i);
    const genderMatch = block.match(/Gender\s*:?\s*(Male|Female|Other)/i);
    if (!nameMatch && !ageMatch) continue; // segment didn't look like a real record — skip
    records.push({
      voter_id: voterId,
      name: nameMatch ? nameMatch[1].trim() : "",
      father_husband_name: relMatch ? relMatch[1].trim() : "",
      house_no: houseMatch ? houseMatch[1].trim() : "",
      age: ageMatch ? ageMatch[1] : "",
      gender: genderMatch ? genderMatch[1] : "",
    });
  }
  return records;
}

// OCR fallback for scanned/image-only PDFs (no text layer at all). Renders each page to a
// canvas, splits it into 3 vertical strips matching the roll's column layout, and OCRs each
// strip separately so one voter's fields don't get mixed with the neighboring box.
async function ocrScannedRollPdf(file, onPageProgress) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const colWidth = Math.floor(canvas.width / 3);
    for (let c = 0; c < 3; c++) {
      const colCanvas = document.createElement("canvas");
      colCanvas.width = colWidth; colCanvas.height = canvas.height;
      colCanvas.getContext("2d").drawImage(canvas, c * colWidth, 0, colWidth, canvas.height, 0, 0, colWidth, canvas.height);
      const { text } = await tesseractOcr.recognize(colCanvas, { lang: "eng" });
      fullText += text + "\n";
      if (onPageProgress) onPageProgress(p, pdf.numPages, c + 1, 3);
    }
  }
  return fullText;
}

async function extractElectoralRollRecords(file, onPageProgress) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  let rawItemCount = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    rawItemCount += content.items.length;
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] })).filter(it => it.str.trim());
    if (items.length > 0) {
      // These rolls are laid out as 3 side-by-side voter boxes per row. Reading the raw
      // stream top-to-bottom/left-to-right interleaves neighboring boxes' fields, so instead
      // bucket text into 3 vertical column bands by X position, then read each column fully
      // top-to-bottom before moving to the next — this keeps every voter's own fields together.
      const xs = items.map(it => it.x);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const colWidth = (maxX - minX + 1) / 3;
      const columns = [[], [], []];
      items.forEach(it => {
        const col = Math.max(0, Math.min(2, Math.floor((it.x - minX) / colWidth)));
        columns[col].push(it);
      });
      columns.forEach(colItems => {
        colItems.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x));
        let lastY = null;
        colItems.forEach(it => {
          if (lastY !== null && Math.abs(it.y - lastY) > 2) fullText += "\n";
          else if (fullText && !/\s$/.test(fullText)) fullText += " ";
          fullText += it.str;
          lastY = it.y;
        });
        fullText += "\n";
      });
    }
    if (onPageProgress) onPageProgress(p, pdf.numPages);
  }

  let records = parseElectoralRollFullText(fullText);

  if (records.length === 0 && rawItemCount === 0) {
    // No text layer at all — fall back to rendering + OCR-ing each page.
    const ocrText = await ocrScannedRollPdf(file, (page, total, col, totalCols) => {
      if (onPageProgress) onPageProgress(page - 1 + col / totalCols, total, true);
    });
    records = parseElectoralRollFullText(ocrText);
    if (records.length === 0) {
      throw new Error(`This is a scanned PDF — OCR ran but couldn't match the expected "Name / Age / Gender" pattern. Sample of what was read: "${ocrText.trim().slice(0, 300)}"`);
    }
    records.forEach(r => { r._fromOcr = true; }); // lower trust — surfaced as reduced confidence in the preview
    return records;
  }

  if (records.length === 0) {
    const debugSnippet = fullText.trim().slice(0, 300);
    throw new Error(`Found text (${fullText.length} characters) but couldn't match the expected "Name : ... Age : ... Gender : ..." pattern. Sample: "${debugSnippet}"`);
  }
  return records;
}


// ---------------------------------------------------------------------------
// Smart Document Import (AI OCR) — small reusable pieces for the upload stage
// ---------------------------------------------------------------------------
const OCR_DOC_TYPES = [
  { key: "beneficiary_register", label: "Beneficiary Register", supported: true },
  { key: "household_survey", label: "Household Survey", supported: false },
  { key: "training_register", label: "Training Register", supported: false },
  { key: "attendance_register", label: "Attendance Register", supported: false },
  { key: "application_form", label: "Application Form", supported: false },
  { key: "aadhaar", label: "Aadhaar", supported: false },
  { key: "ration_card", label: "Ration Card", supported: false },
  { key: "voter_id", label: "Voter ID", supported: true },
  { key: "other", label: "Other", supported: false },
];
const OCR_LANGUAGES = [
  { key: "te", label: "Telugu (Default)", tesseract: "tel" },
  { key: "en", label: "English", tesseract: "eng" },
  { key: "auto", label: "Auto Detect", tesseract: "eng+tel" },
];
const OCR_FLOW_STEPS = ["Upload", "Image Enhancement", "OCR", "AI Detection", "Verification", "Save"];

function OcrUploadCard({ icon, title, desc, borderColor, textColor, onFiles, accept, capture }) {
  const inputId = "ocr-upload-" + title.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="rounded-2xl border-2 border-dashed p-4 flex flex-col items-start gap-1.5 cursor-pointer bg-white" style={{ borderColor, minHeight: 116 }}>
      <div className="text-[22px]">{icon}</div>
      <p className="text-[12.5px] font-bold" style={{ color: textColor }}>{title}</p>
      <p className="text-[10.5px] leading-snug text-[#6B7280]">{desc}</p>
      <input id={inputId} type="file" accept={accept} capture={capture} multiple className="hidden"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
    </label>
  );
}

function OcrFlowTracker({ activeIndex }) {
  return (
    <div className="flex items-center justify-between overflow-x-auto py-2" style={{ gap: 4 }}>
      {OCR_FLOW_STEPS.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        const color = state === "pending" ? "#9CA3AF" : "#16A34A";
        return (
          <div key={step} className="flex items-center shrink-0" style={{ gap: 4 }}>
            <div className="flex flex-col items-center" style={{ minWidth: 62 }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: state === "pending" ? "#F3F4F6" : state === "active" ? "#16A34A" : "#DCFCE7",
                  color: state === "active" ? "#fff" : color,
                  border: state === "active" ? "none" : `1.5px solid ${state === "done" ? "#16A34A" : "#E5E7EB"}`,
                }}>
                {state === "done" ? "✓" : i + 1}
              </div>
              <p className="text-[9px] text-center mt-1" style={{ color, fontWeight: state === "active" ? 700 : 500 }}>{step}</p>
            </div>
            {i < OCR_FLOW_STEPS.length - 1 && <div style={{ width: 14, height: 2, background: i < activeIndex ? "#16A34A" : "#E5E7EB", marginBottom: 14 }} />}
          </div>
        );
      })}
    </div>
  );
}

function OcrPreviewGrid({ pages, onZoom, onRotate, onDelete, onAddMore }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {pages.map(p => (
        <div key={p._id} className="relative rounded-xl overflow-hidden border border-[#E5E7EB]" style={{ aspectRatio: "3/4" }}>
          {p._previewUrl ? (
            <img src={p._previewUrl} alt="" className="w-full h-full object-cover" style={{ transform: `rotate(${p._rotation || 0}deg)` }} onClick={() => onZoom(p)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-center px-1 bg-[#EFF6FF] text-[#1E3A8A]">📄 {p.file?.name}</div>
          )}
          <div className="absolute top-1 right-1 flex gap-1">
            <button onClick={() => onRotate(p._id)} className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]" style={{ background: "rgba(255,255,255,0.9)" }}>⟳</button>
            <button onClick={() => onDelete(p._id)} className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] text-[#DC2626]" style={{ background: "rgba(255,255,255,0.9)" }}>✕</button>
          </div>
        </div>
      ))}
      <label className="rounded-xl border-2 border-dashed border-[#16A34A] flex flex-col items-center justify-center cursor-pointer" style={{ aspectRatio: "3/4" }}>
        <span className="text-[20px] text-[#16A34A]">＋</span>
        <span className="text-[9.5px] font-semibold text-[#16A34A]">Add More</span>
        <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { if (e.target.files?.length) onAddMore(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

function SmartBeneficiaryImportModule({ beneficiaries, currentUser, showToast, logAppAudit, onImported }) {
  const [stage, setStage] = useState("upload"); // upload | processing | preview | summary
  const [files, setFiles] = useState([]); // images queued for runOcr() — unchanged from before
  const [pdfFile, setPdfFile] = useState(null); // single PDF queued for runPdfImport() — unchanged from before
  const [pages, setPages] = useState([]); // unified preview grid: { _id, file, kind, _previewUrl, _rotation }
  const [language, setLanguage] = useState("te"); // Telugu is the default per requirements
  const [docType, setDocType] = useState("beneficiary_register");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [flowIndex, setFlowIndex] = useState(0);
  const [zoomPage, setZoomPage] = useState(null);
  const [records, setRecords] = useState([]); // { _selected, _photoUrl, _confidence, ...fields }
  const [summary, setSummary] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [expandedRawText, setExpandedRawText] = useState({}); // { [recId]: true } — debug view of what OCR actually read
  const toggleRawText = (id) => setExpandedRawText(prev => ({ ...prev, [id]: !prev[id] }));

  // --- Phase 3A: Row Detection Only (no OCR) — fully separate from the
  // existing OCR flow above/below. Detects the table + its rows and crops
  // each one into its own image, for a field worker to reference while
  // typing values by hand. Never calls any OCR engine.
  const [rowDetectLoading, setRowDetectLoading] = useState(false);
  const [rowDetectResult, setRowDetectResult] = useState(null); // { count, thumbnails: string[] } | null
  const [rowDetectError, setRowDetectError] = useState("");
  const detectRowsOnly = async () => {
    if (pages.length === 0) { showToast("Upload a register page first.", "error"); return; }
    const firstImage = pages.find(p => p.kind === "image");
    if (!firstImage) { showToast("Row detection needs an image page (not a PDF).", "error"); return; }
    setRowDetectLoading(true);
    setRowDetectError("");
    setRowDetectResult(null);
    try {
      const enhanced = await enhanceImageForOcr(firstImage.file);
      const result = cropTableRows(enhanced);
      if (!result || result.count === 0) {
        setRowDetectError("Couldn't confidently detect a ruled table on this page — try a page with clearer grid lines.");
      } else {
        setRowDetectResult({ count: result.count, thumbnails: result.rowImages.map(c => c.toDataURL("image/jpeg", 0.85)) });
      }
    } catch (e) {
      setRowDetectError(e.message || "Row detection failed.");
    } finally {
      setRowDetectLoading(false);
    }
  };

  const selectedDocType = OCR_DOC_TYPES.find(d => d.key === docType);

  // Adds files to the unified preview grid, and also feeds the existing
  // files/pdfFile state that runOcr()/runPdfImport() already expect —
  // those two functions are otherwise untouched.
  const addPages = (fileList) => {
    const arr = Array.from(fileList).map((f, i) => ({
      _id: `pg-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      kind: f.type === "application/pdf" ? "pdf" : "image",
      _previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      _rotation: 0,
    }));
    const skippedOther = arr.filter(p => p.kind !== "pdf" && !p.file.type.startsWith("image/"));
    if (skippedOther.length) showToast(`${skippedOther.length} file(s) skipped — only images and PDFs are supported.`, "error");
    const valid = arr.filter(p => p.kind === "pdf" || p.file.type.startsWith("image/"));
    setPages(prev => [...prev, ...valid]);
    const newImgs = valid.filter(p => p.kind === "image").map(p => p.file);
    const newPdf = valid.find(p => p.kind === "pdf");
    if (newImgs.length) setFiles(prev => [...prev, ...newImgs]);
    if (newPdf) setPdfFile(newPdf.file); // only the most recent PDF is used, matching the single-PDF flow below
  };
  const rotatePage = (id) => setPages(prev => prev.map(p => p._id === id ? { ...p, _rotation: ((p._rotation || 0) + 90) % 360 } : p));
  const deletePage = (id) => {
    setPages(prev => {
      const removed = prev.find(p => p._id === id);
      if (removed?.kind === "image") setFiles(fs => fs.filter(f => f !== removed.file));
      if (removed?.kind === "pdf") setPdfFile(null);
      return prev.filter(p => p._id !== id);
    });
  };

  const startAiOcr = () => {
    if (pages.length === 0) { showToast("Upload at least one document first.", "error"); return; }
    if (!selectedDocType.supported) {
      showToast(`AI extraction for "${selectedDocType.label}" isn't wired up yet (Phase 2) — please use Beneficiary Register or Voter ID for now.`, "error");
      return;
    }
    setFlowIndex(0);
    if (pdfFile) runPdfImport(pdfFile);
    else runOcr();
  };

  const runOcr = async () => {
    if (files.length === 0) { showToast("Choose at least one image first.", "error"); return; }
    setOcrError("");
    setStage("processing");
    setProgress(0);
    setFlowIndex(1); // Image Enhancement
    try {
      const langCode = (OCR_LANGUAGES.find(l => l.key === language) || OCR_LANGUAGES[0]).tesseract;

      const { results, skipped, lastFileError, usedLayoutPipelineCount } = await scanDocument(files, {
        lang: langCode,
        onProgress: ({ phase, label, percent }) => {
          if (phase === "enhance") setFlowIndex(1);
          if (phase === "ocr") setFlowIndex(2);
          if (label !== undefined) setProgressLabel(label);
          if (percent !== undefined) setProgress(percent);
        },
      });

      setFlowIndex(3); // AI Detection
      if (results.length === 0) {
        setOcrError(
          `Couldn't read ${skipped} of ${files.length} image(s). ` +
          (lastFileError ? `Reason: ${lastFileError}. ` : "") +
          `Try a clearer photo, a faster connection, English/Auto Detect language, or use "Upload PDF" instead if you have the source PDF.`
        );
        setStage("upload");
        return;
      }
      if (skipped > 0) showToast(`${skipped} image(s) couldn't be read and were skipped.`, "error");
      if (usedLayoutPipelineCount > 0) showToast(`Table layout detected on ${usedLayoutPipelineCount} of ${files.length} page(s) — cell-by-cell OCR used there.`, "success");
      finishWithResults(results);
    } catch (e) {
      setOcrError((e.message || "OCR failed.") + " If you have the original PDF, try \"Upload PDF\" instead — it's far more reliable.");
      setStage("upload");
    }
  };

  const runPdfImport = async (file) => {
    setOcrError("");
    setStage("processing");
    setProgress(0);
    setProgressLabel(`Reading ${file.name}...`);
    setFlowIndex(1); // Image Enhancement
    try {
      setFlowIndex(2); // OCR
      const rows = await extractElectoralRollRecords(file, (page, total, isOcr) => {
        setProgress(Math.round((page / total) * 100));
        setProgressLabel(isOcr ? `Scanned PDF detected — running OCR on page ${Math.ceil(page)} of ${total}...` : `Reading page ${page} of ${total}...`);
      });
      setFlowIndex(3); // AI Detection
      const results = rows.map((r, i) => ({
        _id: `pdf-${i}-${Date.now()}`,
        _selected: true,
        _photoUrl: null, // no photo available from a text PDF
        _confidence: r._fromOcr ? 60 : 100, // OCR-derived text is a guess, not direct extraction
        _isDuplicate: false,
        name: r.name, voter_id: r.voter_id, aadhaar_number: r.aadhaar_number || "", phone: r.phone || "", age: r.age, gender: r.gender,
        house_no: r.house_no, father_husband_name: r.father_husband_name, village: "",
        mandal: "", district: "Tirupati", state: "Andhra Pradesh", category: "", extra_notes: "",
        program: "waste", status: "New",
      }));
      finishWithResults(results);
    } catch (e) {
      setOcrError(e.message || "Could not read this PDF. Please confirm it's a valid, non-password-protected PDF.");
      setStage("upload");
    }
  };

  const finishWithResults = (results) => {
    // Duplicate check against live beneficiaries (Voter ID = identity_number match)
    setFlowIndex(4); // Verification
    const marked = results.map(r => {
      const dup = (r.aadhaar_number && beneficiaries.some(b => b.identity_number === r.aadhaar_number)) ||
                  (r.voter_id && beneficiaries.some(b => b.identity_number === r.voter_id));
      return { ...r, _isDuplicate: dup, status: dup ? "Duplicate" : "New" };
    });
    setRecords(marked);
    setStage("preview");
  };

  const updateRecord = (id, key, val) => setRecords(rs => rs.map(r => r._id === id ? { ...r, [key]: val } : r));
  const toggleSelect = (id) => setRecords(rs => rs.map(r => r._id === id ? { ..._r(r), _selected: !r._selected } : r));
  const _r = (r) => r;
  // Field label + its per-field OCR confidence (Phase 3, Step 6) — falls back
  // to a plain label when a record has no column-level confidence (e.g. it
  // came from the single-record voter-ID-card path, not a detected row).
  const fieldLabel = (rec, key, text) => {
    const c = rec._fieldConfidence?.[key];
    if (c === undefined) return text;
    return <>{text} <span style={{ color: c >= 95 ? "#16A34A" : c >= 70 ? "#F97316" : "#DC2626", fontWeight: 700 }}>{c >= 95 ? "🟢" : c >= 70 ? "🟡" : "🔴"} {c}%</span></>;
  };

  const doImport = async (which) => {
    if (which !== "all" && records.filter(r => r._selected).length === 0) {
      showToast("Select at least one record first, or use Import All.", "error");
      return;
    }
    const who = currentUser?.username || currentUser?.email || "unknown";
    let toImport = records.filter(r => r._selected);
    if (which === "skipDup") toImport = toImport.filter(r => !r._isDuplicate);
    if (which === "all") toImport = records;

    let imported = 0, duplicatesSkipped = 0, failed = 0;
    const errorSamples = [];
    for (const rec of toImport) {
      if (rec._isDuplicate && which !== "all") { duplicatesSkipped++; continue; }
      if (!rec.name?.trim()) { failed++; errorSamples.push(`(no name) — skipped, name is required`); continue; }
      try {
        const prefix = PROGRAM_MAP[rec.program]?.idPrefix || "BEN";
        const hasAadhaar = !!rec.aadhaar_number;
        const hasVoter = !!rec.voter_id;
        const identityType = hasAadhaar ? "aadhaar" : hasVoter ? "voter" : null;
        const identityNumber = hasAadhaar ? rec.aadhaar_number : (hasVoter ? rec.voter_id : null);
        // schema only has one identity_type/identity_number pair — if a record has
        // BOTH Aadhaar and Voter ID, Aadhaar wins as the primary identity and the
        // Voter ID is kept in notes rather than silently dropped.
        const altIdNote = hasAadhaar && hasVoter ? `Voter ID: ${rec.voter_id}` : "";
        let beneficiary_id, lastErr;
        for (let attempt = 0; attempt < 4; attempt++) {
          const { data: latest } = await supabase.from("beneficiaries_v2").select("beneficiary_id").like("beneficiary_id", `${prefix}-%`).order("beneficiary_id", { ascending: false }).limit(1);
          const lastNum = latest?.[0]?.beneficiary_id?.match(/(\d+)$/);
          const nextNum = (lastNum ? parseInt(lastNum[1], 10) : 0) + 1 + attempt;
          beneficiary_id = `${prefix}-${String(nextNum).padStart(4, "0")}`;
          const payload = {
            beneficiary_id, name: rec.name, age: rec.age || null, gender: rec.gender || null,
            identity_type: identityType, identity_number: identityNumber, house_no: rec.house_no || null,
            phone: rec.phone || null, village: rec.village || null, mandal: rec.mandal || null,
            district: rec.district || "Tirupati", state: rec.state || "Andhra Pradesh", category: rec.category || null,
            program: rec.program, status: "Registered",
            registration_date: new Date().toISOString().slice(0, 10),
            field_worker_name: currentUser?.role === "fieldworker" ? currentUser.username : "",
            notes: [rec.father_husband_name ? `Father/Husband: ${rec.father_husband_name}` : "", rec.extra_notes ? `Register notes: ${rec.extra_notes}` : "", altIdNote].filter(Boolean).join(" · "),
            created_at: new Date().toISOString(),
          };
          const { error } = await supabase.from("beneficiaries_v2").insert(payload);
          lastErr = error;
          if (!error) break;
          if (!(error.message || "").includes("duplicate key")) break;
        }
        if (lastErr) { failed++; errorSamples.push(`${rec.name}: ${lastErr.message}`); continue; }
        imported++;
        await logAppAudit("CREATE", "Beneficiaries", `Imported via OCR: ${rec.name} (${beneficiary_id})`);
      } catch (e) { failed++; errorSamples.push(`${rec.name}: ${e.message || "unknown error"}`); }
    }
    setSummary({ total: records.length, imported, duplicates: duplicatesSkipped, failed, errorSamples: errorSamples.slice(0, 5) });
    setStage("summary");
    if (imported > 0 && onImported) onImported();
  };

  if (stage === "upload") {
    return (
      <div className="max-w-[560px] mx-auto pb-24">
        <h2 className="text-[17px] font-bold text-[#111827] mb-1">📇 Smart Document Import (AI OCR)</h2>
        <p className="text-[12px] text-[#6B7280] mb-4">Upload Beneficiary Registers, Household Surveys, Government Documents, PDFs or Images. AI extracts data and saves it after verification.</p>
        {ocrError && <div className="rounded-xl p-3 mb-3 text-[12px] text-[#DC2626]" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>⚠ {ocrError}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <OcrUploadCard icon="📄" title="Upload PDF" desc="Electoral rolls & scanned registers — reads real text directly" borderColor="#16A34A" textColor="#16A34A" accept="application/pdf" onFiles={addPages} />
          <OcrUploadCard icon="📷" title="Camera Capture" desc="Photograph a document now" borderColor="#16A34A" textColor="#16A34A" accept="image/*" capture="environment" onFiles={addPages} />
          <OcrUploadCard icon="🖼" title="Upload Images" desc="Choose photos from gallery" borderColor="#1E3A8A" textColor="#1E3A8A" accept="image/*" onFiles={addPages} />
          <OcrUploadCard icon="📚" title="Multi-page Register" desc="Add register pages one by one" borderColor="#F97316" textColor="#F97316" accept="image/*,application/pdf" onFiles={addPages} />
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          <p className="text-[12.5px] font-bold text-[#111827] mb-3">OCR Options</p>
          <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">Language</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            {OCR_LANGUAGES.map(l => (
              <button key={l.key} onClick={() => setLanguage(l.key)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold border"
                style={{ borderColor: language === l.key ? "#16A34A" : "#E5E7EB", background: language === l.key ? "#DCFCE7" : "#fff", color: language === l.key ? "#16A34A" : "#6B7280" }}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-semibold text-[#6B7280] mb-1.5">Document Type</p>
          <div className="flex gap-2 flex-wrap">
            {OCR_DOC_TYPES.map(d => (
              <button key={d.key} onClick={() => setDocType(d.key)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold border flex items-center gap-1"
                style={{ borderColor: docType === d.key ? "#1E3A8A" : "#E5E7EB", background: docType === d.key ? "#EFF6FF" : "#fff", color: docType === d.key ? "#1E3A8A" : "#6B7280" }}>
                {d.label}{!d.supported && <span style={{ color: "#F97316", fontSize: 9 }}>●</span>}
              </button>
            ))}
          </div>
          {!selectedDocType.supported && <p className="text-[10px] mt-2 text-[#F97316]">● AI extraction for this type is coming in Phase 2 — pages upload and preview normally.</p>}
        </div>

        {pages.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
            <p className="text-[12.5px] font-bold text-[#111827] mb-3">{pages.length} page{pages.length > 1 ? "s" : ""} uploaded</p>
            <OcrPreviewGrid pages={pages} onZoom={setZoomPage} onRotate={rotatePage} onDelete={deletePage} onAddMore={addPages} />
          </div>
        )}

        {pages.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
            <p className="text-[12.5px] font-bold text-[#111827] mb-1">Detect Rows Only (no OCR)</p>
            <p className="text-[10.5px] text-[#6B7280] mb-3">Splits the first page into one image per beneficiary row — no text reading, just for a field worker to reference while typing values by hand.</p>
            <button onClick={detectRowsOnly} disabled={rowDetectLoading} className="rounded-xl border border-[#1E3A8A] px-4 py-2 text-[12.5px] font-bold text-[#1E3A8A] disabled:opacity-50">
              {rowDetectLoading ? "Detecting rows…" : "Detect Rows"}
            </button>
            {rowDetectError && <p className="text-[11px] text-[#DC2626] mt-2">⚠ {rowDetectError}</p>}
            {rowDetectResult && (
              <div className="mt-3">
                <p className="text-[12.5px] font-bold text-[#16A34A] mb-2">{rowDetectResult.count} Beneficiary Row{rowDetectResult.count === 1 ? "" : "s"} Found</p>
                <div className="grid grid-cols-2 gap-2">
                  {rowDetectResult.thumbnails.map((src, i) => (
                    <div key={i} className="rounded-lg border border-[#E5E7EB] overflow-hidden">
                      <p className="text-[9.5px] font-semibold text-[#6B7280] px-2 pt-1">Row {i + 1}</p>
                      <img src={src} alt={`Row ${i + 1}`} className="w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(to top, #fff 70%, transparent)" }}>
          <button onClick={startAiOcr} disabled={pages.length === 0} className="w-full max-w-[560px] mx-auto block rounded-xl py-3.5 text-[14px] font-bold text-white disabled:opacity-40" style={{ background: "#16A34A", minHeight: 48 }}>
            Start AI OCR
          </button>
        </div>

        {zoomPage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setZoomPage(null)}>
            {zoomPage._previewUrl && <img src={zoomPage._previewUrl} alt="" className="max-w-full max-h-full rounded-lg" style={{ transform: `rotate(${zoomPage._rotation || 0}deg)` }} />}
          </div>
        )}
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <div className="max-w-[480px] mx-auto text-center py-8">
        <RefreshCw size={28} className="mx-auto mb-4 animate-spin text-[#16A34A]" />
        <p className="text-[13.5px] font-semibold text-[#111827] mb-1">{progressLabel || OCR_FLOW_STEPS[flowIndex]}</p>
        <div className="w-full h-2.5 rounded-full bg-[#F3F4F6] overflow-hidden mt-3 mb-4">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "#16A34A" }} />
        </div>
        <OcrFlowTracker activeIndex={flowIndex} />
        <p className="text-[11px] text-[#9CA3AF] mt-2">{progress}% · this runs entirely in your browser, no data leaves the app</p>
      </div>
    );
  }

  if (stage === "summary" && summary) {
    const nothingImported = summary.imported === 0 && summary.total > 0;
    return (
      <div className="max-w-[480px] mx-auto text-center py-8">
        {nothingImported ? (
          <XCircle size={36} className="mx-auto mb-3 text-[#DC2626]" />
        ) : (
          <CheckCircle size={36} className="mx-auto mb-3 text-[#16A34A]" />
        )}
        <p className="text-[15px] font-bold text-[#111827] mb-4">{nothingImported ? "Nothing Was Imported" : "Import Complete"}</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[["Total", summary.total, "#1E3A8A"], ["Imported", summary.imported, "#16A34A"], ["Duplicates", summary.duplicates, "#F97316"], ["Failed", summary.failed, "#DC2626"]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-3"><p className="text-[18px] font-bold" style={{ color: c }}>{v}</p><p className="text-[9.5px] text-[#6B7280]">{l}</p></div>
          ))}
        </div>
        {summary.failed > 0 && summary.errorSamples?.length > 0 && (
          <div className="text-left rounded-xl p-3 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
            <p className="text-[11.5px] font-bold text-[#DC2626] mb-1.5">Why some failed:</p>
            {summary.errorSamples.map((msg, i) => <p key={i} className="text-[10.5px] text-[#991B1B] mb-1">• {msg}</p>)}
            {nothingImported && <p className="text-[10.5px] text-[#991B1B] mt-2">Go back and fill in the Name field for each record before importing — it's required and can't be left blank.</p>}
          </div>
        )}
        <button onClick={() => { if (nothingImported) { setStage("preview"); setSummary(null); return; } setStage("upload"); setFiles([]); setPdfFile(null); setPages([]); setRecords([]); setSummary(null); setFlowIndex(0); }} className="rounded-xl px-6 py-3 text-[13px] font-bold text-white" style={{ background: nothingImported ? "#1E3A8A" : "#16A34A" }}>
          {nothingImported ? "Go Back & Fix Names" : "Import More"}
        </button>
      </div>
    );
  }

  // preview — unchanged review/verify/save table
  const selectedCount = records.filter(r => r._selected).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-[17px] font-bold text-[#111827]">Review Extracted Records</h2>
          <p className="text-[12px] text-[#6B7280]">{records.length} scanned · {selectedCount} selected · Edit any field before importing</p>
        </div>
        <button onClick={() => setStage("upload")} className="text-[12px] font-semibold text-[#DC2626]">Cancel</button>
      </div>

      <div className="space-y-3 mb-4">
        {records.map(rec => {
          const eligiblePrograms = checkOcrEligibility(rec);
          return (
            <div key={rec._id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <div className="flex items-start gap-3 mb-3">
                <input type="checkbox" checked={rec._selected} onChange={() => toggleSelect(rec._id)} className="mt-1.5" style={{ width: 18, height: 18 }} />
                {rec._photoUrl ? (
                  <img src={rec._photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#E5E7EB] shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-[#E5E7EB] shrink-0 flex items-center justify-center bg-[#F3F4F6]"><User size={20} className="text-[#9CA3AF]" /></div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={rec._isDuplicate ? "Duplicate" : "New"} color={rec._isDuplicate ? "#DC2626" : "#16A34A"} tint={rec._isDuplicate ? "#FEF2F2" : "#DCFCE7"} />
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: rec._confidence >= 95 ? "#DCFCE7" : rec._confidence >= 70 ? "#FFF7ED" : "#FEF2F2", color: rec._confidence >= 95 ? "#16A34A" : rec._confidence >= 70 ? "#F97316" : "#DC2626" }}>
                      {rec._confidence >= 95 ? "🟢 High confidence" : rec._confidence >= 70 ? "🟡 Needs review" : "🔴 Manual entry required"} · {rec._confidence}%
                    </span>
                    {rec._rawText && (
                      <button onClick={() => toggleRawText(rec._id)} className="text-[10px] font-semibold text-[#1E3A8A] underline">
                        {expandedRawText[rec._id] ? "Hide raw OCR text" : "View raw OCR text"}
                      </button>
                    )}
                  </div>
                  {expandedRawText[rec._id] && (
                    <pre className="text-[10.5px] whitespace-pre-wrap mt-2 p-2 rounded-lg" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", color: "#374151", maxHeight: 180, overflowY: "auto" }}>
                      {rec._rawText || "(empty — OCR returned no text)"}
                    </pre>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Field label={fieldLabel(rec, "name", "Name")}><Input value={rec.name} onChange={e => updateRecord(rec._id, "name", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "voter_id", "Voter ID")}><Input value={rec.voter_id} onChange={e => updateRecord(rec._id, "voter_id", e.target.value.toUpperCase())} /></Field>
                <Field label={fieldLabel(rec, "aadhaar_number", "Aadhaar Number")}><Input value={rec.aadhaar_number} onChange={e => updateRecord(rec._id, "aadhaar_number", e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" /></Field>
                <Field label={fieldLabel(rec, "age", "Age")}><Input type="number" value={rec.age} onChange={e => updateRecord(rec._id, "age", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "gender", "Gender")}><Select value={rec.gender} onChange={e => updateRecord(rec._id, "gender", e.target.value)} options={GENDER_OPTIONS} placeholder="Select" /></Field>
                <Field label={fieldLabel(rec, "house_no", "House No")}><Input value={rec.house_no} onChange={e => updateRecord(rec._id, "house_no", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "village", "Village")}><Input value={rec.village} onChange={e => updateRecord(rec._id, "village", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "mandal", "Mandal")}><Input value={rec.mandal} onChange={e => updateRecord(rec._id, "mandal", e.target.value)} placeholder="Mandal name" /></Field>
                <Field label="District"><Select value={rec.district} onChange={e => updateRecord(rec._id, "district", e.target.value)} options={DISTRICTS_AP} /></Field>
                <Field label="State"><Input value={rec.state} disabled /></Field>
                <Field label={fieldLabel(rec, "phone", "Phone")}><Input value={rec.phone} onChange={e => updateRecord(rec._id, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" /></Field>
                <Field label={fieldLabel(rec, "father_husband_name", "Father/Husband Name")}><Input value={rec.father_husband_name} onChange={e => updateRecord(rec._id, "father_husband_name", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "extra_notes", "Occupation / Caste name / Ration No (from register)")}><Input value={rec.extra_notes || ""} onChange={e => updateRecord(rec._id, "extra_notes", e.target.value)} /></Field>
                <Field label={fieldLabel(rec, "category", "Category")} hint="Pick BC/SC/ST/OC using the caste name above — OCR only auto-fills this when it read an exact code."><Select value={rec.category || ""} onChange={e => updateRecord(rec._id, "category", e.target.value)} options={CATEGORY_OPTIONS} placeholder="Select" /></Field>
                <Field label="Register Under Program"><Select value={rec.program} onChange={e => updateRecord(rec._id, "program", e.target.value)} options={PROGRAMS.map(p => ({ value: p.key, label: p.label }))} /></Field>
              </div>
              {rec._rowRawText && (
                <p className="text-[10px] text-[#9CA3AF] mt-2 pt-2 border-t border-[#F3F4F6]">Row text: {rec._rowRawText}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-[#F3F4F6]">
                <span className="text-[10px] text-[#9CA3AF]">Eligible:</span>
                {eligiblePrograms.map(p => <span key={p} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E3A8A]">{p}</span>)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sticky bottom-0 bg-[#F8FAFC] pt-2 pb-1">
        <button onClick={() => doImport("selected")} disabled={selectedCount === 0} className="rounded-xl py-3 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: "#16A34A", minHeight: 44 }}>Import Selected ({selectedCount})</button>
        <button onClick={() => doImport("all")} className="rounded-xl py-3 text-[13px] font-bold text-white" style={{ background: "#1E3A8A", minHeight: 44 }}>Import All</button>
        <button onClick={() => doImport("skipDup")} className="rounded-xl border border-[#E5E7EB] py-3 text-[13px] font-semibold text-[#374151]" style={{ minHeight: 44 }}>Skip Duplicates</button>
        <button onClick={() => setStage("upload")} className="rounded-xl border border-[#E5E7EB] py-3 text-[13px] font-semibold text-[#DC2626]" style={{ minHeight: 44 }}>Cancel</button>
      </div>
    </div>
  );
}


/* ============================================================
   BULK AI IMPORT — a separate module from Smart Import (OCR) above.
   Two input paths feed the SAME preview/import workflow, matching the
   "any future source -> same Preview page" architecture:
     1) Paste AI-transcribed text (a field worker photographs a register,
        asks ChatGPT/Gemini/Claude/etc. to transcribe it, pastes the
        result here) -> parseAIText() -> canonical records.
     2) Image upload -> currently reference-only (no automatic analysis
        wired up here; see note in the empty-textarea toast below). A
        future source (e.g. CSV/Excel, or a direct AI-provider API call)
        would plug in the same way: parse -> canonical records -> same
        preview state below.
   Writes to beneficiaries_v2 directly, independent of BeneficiaryForm
   and SmartBeneficiaryImportModule — neither of those is touched.
   ============================================================ */
function BulkAIImportModule({ beneficiaries, currentUser, showToast, logAppAudit, onImported }) {
  // --- AI provider connection status, checked up front so the user can
  // connect a key before taking any photos, not only after landing on
  // AI Review. Reuses the same providerConnection.js status check and
  // ProviderConfig screen AIReview already uses. ---
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  const [connectedProviderId, setConnectedProviderId] = useState(null);
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);
  const bulkImportUserId = currentUser?.userId || currentUser?.supabaseUser?.id || null;

  useEffect(() => {
    if (!bulkImportUserId) {
      setProviderStatusLoading(false);
      return;
    }
    let cancelled = false;
    setProviderStatusLoading(true);
    getProviderStatuses(bulkImportUserId).then((statuses) => {
      if (cancelled) return;
      const connected = Object.values(statuses).find((s) => s.is_connected);
      setConnectedProviderId(connected ? connected.provider : null);
      setProviderStatusLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bulkImportUserId, showProviderConfig]);

  const [images, setImages] = useState([]); // { id, file, previewUrl } — reference only for now, see note above
  const [pastedText, setPastedText] = useState("");
  const [stage, setStage] = useState("input"); // input | preview | summary
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
   const [screen, setScreen] = useState("capture");
  const [excelImporting, setExcelImporting] = useState(false);

  if (showProviderConfig) {
    return <ProviderConfig currentUser={currentUser} showToast={showToast} onBack={() => setShowProviderConfig(false)} />;
  }

  const addImages = (fileList) => {
    const arr = Array.from(fileList).filter(f => f.type.startsWith("image/")).map((f, i) => ({
      id: `bulkimg-${Date.now()}-${i}`, file: f, previewUrl: URL.createObjectURL(f),
    }));
    setImages(prev => [...prev, ...arr]);
  };
  const removeImage = (id) => setImages(prev => prev.filter(p => p.id !== id));

  const normalizeProgram = (raw) => {
    const t = (raw || "").trim().toLowerCase();
    const match = PROGRAMS.find(p => p.key === t || p.label.toLowerCase() === t || p.short?.toLowerCase() === t);
    return match ? match.key : "";
  };

  const revalidate = (recs) => {
    const warningsMap = validateBatch(recs, beneficiaries);
    return recs.map((r, i) => ({ ...r, _warnings: warningsMap[i] || [] }));
  };

  // ---- In-batch duplicate detection: the AI transcription (Gemini/ChatGPT/etc.)
  // sometimes repeats the same person when it re-reads a page or overlaps
  // between pages — e.g. 5 pages x 3 people should paste as 15 records, but
  // the AI's output text itself contains the same person 2-3 times, so
  // parseAIText() correctly turns everything it's given into 20-30 records.
  // This can only be caught here, after parsing, by comparing records to each
  // other (Aadhaar first, else name+father+village) — repeats are flagged and
  // auto-deselected so "Import Selected" only saves the first copy of each
  // person, but stay visible/re-selectable in case two different people
  // genuinely share those details. ----
  const dupKey = (r) => {
    const aad = (r.aadhaar_number || "").trim();
    if (aad) return `A:${aad}`;
    const n = (r.name || "").trim().toLowerCase();
    const f = (r.father_husband_name || "").trim().toLowerCase();
    const v = (r.village || "").trim().toLowerCase();
    if (!n) return null; // nothing usable to key on
    return `N:${n}|${f}|${v}`;
  };
  const flagInBatchDuplicates = (recs) => {
    const seen = new Map();
    return recs.map(r => {
      const key = dupKey(r);
      if (!key) return { ...r, _batchDuplicate: false };
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      return count === 0 ? { ...r, _batchDuplicate: false } : { ...r, _selected: false, _batchDuplicate: true };
    });
  };

const applyParsedRecords = (parsed) => {
    const withMeta = parsed.map((r, i) => ({
      ...r,
      program: normalizeProgram(r.program),
      _id: `bulk-${Date.now()}-${i}`,
      _selected: true,
    }));
    const deduped = flagInBatchDuplicates(withMeta);
    const dupCount = deduped.filter(r => r._batchDuplicate).length;
    if (dupCount > 0) {
      showToast(`Found ${dupCount} repeat ${dupCount === 1 ? "entry" : "entries"} in the AI output (same person listed more than once) — deselected, review before importing.`, "error");
    }
    setRecords(revalidate(deduped));
    setStage("preview");
  };

  // ---- Excel/CSV Import: for data that's already structured in a spreadsheet
  // (e.g. a government/partner scheme's master list) — no AI transcription
  // needed, just parse the file directly and map its columns onto our
  // beneficiary fields. Uses SheetJS, loaded from a CDN at runtime instead of
  // an npm dependency so no package.json/build changes are needed. Column
  // matching is header-name based (case/space/punctuation-insensitive) so it
  // tolerates real-world header variations without being hand-coded per file. ----
  const loadSheetJS = () => {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (window.__xlsxLoadingPromise) return window.__xlsxLoadingPromise;
    window.__xlsxLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error("Couldn't load the Excel reader library — check your internet connection and try again."));
      document.head.appendChild(script);
    });
    return window.__xlsxLoadingPromise;
  };

  const normalizeHeader = (h) => (h || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
  const EXCEL_COLUMN_MAP = [
    { keys: ["nameofthebeneficiary", "beneficiaryname", "name"], field: "name" },
    { keys: ["fatherhusbandname", "fatherorhusband", "fathername", "husbandname"], field: "father_husband_name" },
    { keys: ["gender", "sex"], field: "gender" },
    { keys: ["age"], field: "age" },
    // "68il" is a corrupted header found in the PSMM-AP master list exports —
    // that column actually holds the beneficiary's mobile number.
    { keys: ["cellno", "mobileno", "mobile", "phoneno", "phone", "68il"], field: "phone" },
    { keys: ["village"], field: "village" },
    { keys: ["mandal"], field: "mandal" },
    { keys: ["district"], field: "district" },
    { keys: ["state"], field: "state" },
    { keys: ["uidnumber", "uid"], field: "_uid" },
    { keys: ["typeofservice", "servicefacilitated", "service"], field: "_service" },
    { keys: ["ssrname"], field: "_ssr" },
    { keys: ["cfname"], field: "_cf" },
  ];
  const mapExcelRow = (row) => {
    const rec = { name: "", father_husband_name: "", gender: "", age: "", phone: "", village: "", mandal: "", district: "Tirupati", state: "Andhra Pradesh", program: "womens" };
    const notesParts = [];
    Object.keys(row).forEach(header => {
      const norm = normalizeHeader(header);
      // Exact match first — a loose substring match (e.g. "cfname".includes
      // ("name")) must never win over another column's own exact key, or a
      // column like "CF Name" ends up overwriting "Beneficiary Name".
      const match = EXCEL_COLUMN_MAP.find(m => m.keys.some(k => norm === k))
        || EXCEL_COLUMN_MAP.find(m => m.keys.some(k => norm.includes(k)));
      if (!match) return;
      const val = (row[header] ?? "").toString().trim();
      if (!val) return;
      if (match.field === "_uid") notesParts.push(`PSMM ID: ${val}`);
      else if (match.field === "_service") notesParts.push(`Service: ${val}`);
      else if (match.field === "_ssr") notesParts.push(`SSR: ${val}`);
      else if (match.field === "_cf") rec.field_worker_name = `${val} (PSMM)`;
      else if (match.field === "gender") rec.gender = /^f/i.test(val) ? "Female" : /^m/i.test(val) ? "Male" : val;
      else if (match.field === "district" || match.field === "state") { /* keep spreadsheet's own value */ rec[match.field] = val; }
      else rec[match.field] = val;
    });
    rec.extra_notes = notesParts.join(" | ");
    return rec;
  };

  const handleExcelFile = async (file) => {
    if (!file) return;
    setExcelImporting(true);
    try {
      const XLSX = await loadSheetJS();
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      // Pick the first sheet that actually has data (some exports include a
      // trailing blank "Sheet1"), instead of blindly using SheetNames[0].
      const firstSheetName = workbook.SheetNames.find(name => {
        const s = workbook.Sheets[name];
        const raw = XLSX.utils.sheet_to_json(s, { header: 1, defval: "", blankrows: false });
        return raw.length > 0;
      }) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      // Some real-world exports (e.g. this PSMM-AP master list) have one or
      // more title/grouping rows above the real column headers, so we can't
      // assume row 1 is the header row. Scan the first several rows and use
      // the first one that contains a recognizable "name" header as the
      // actual header row, then build row objects from there ourselves —
      // everything downstream (mapExcelRow, EXCEL_COLUMN_MAP) is unchanged.
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });
      const nameKeys = EXCEL_COLUMN_MAP.find(m => m.field === "name").keys;
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const candidate = rawRows[i].map(h => normalizeHeader(h));
        if (candidate.some(norm => nameKeys.some(k => norm === k || norm.includes(k)))) {
          headerRowIdx = i;
          break;
        }
      }
      const headerRow = rawRows[headerRowIdx];
      const rows = rawRows.slice(headerRowIdx + 1).map(r => {
        const obj = {};
        headerRow.forEach((h, i) => {
          if (h) obj[h] = r[i] ?? "";
        });
        return obj;
      });
      const withNames = rows.filter(r => {
        const mapped = mapExcelRow(r);
        return mapped.name && mapped.name.trim();
      });
      if (withNames.length === 0) {
        showToast("Couldn't find a beneficiary name column in this file — check the file has a 'Name of the Beneficiary' (or similar) column.", "error");
        setExcelImporting(false);
        return;
      }
      const mapped = withNames.map(r => mapExcelRow(r));
      applyParsedRecords(mapped);
      showToast(`Imported ${mapped.length} row(s) from the Excel file for review — set to Women's Empowerment. Check each record before importing.`);
    } catch (err) {
      showToast("Couldn't read that file — make sure it's a valid .xlsx/.xls/.csv file. " + (err?.message || ""), "error");
    } finally {
      setExcelImporting(false);
    }
  };

  const analyze = () => {
    if (!pastedText.trim()) {
      if (capturedImages.length > 0) {
        showToast('Automatic image analysis isn\'t connected yet. Photograph the register, ask your AI app (ChatGPT/Gemini/Claude/etc.) to transcribe it using the format shown below, then paste the result into the text box.', "error");
      } else {
        showToast("Paste AI-transcribed text first, or upload reference images.", "error");
      }
      return;
    }
    const parsed = parseAIText(pastedText);
    if (parsed.length === 0) {
      showToast("Couldn't find any \"Name: ...\" records in the pasted text — check the format matches the example.", "error");
      return;
    }
    applyParsedRecords(parsed);
  };

  const updateRecord = (id, key, val) => setRecords(rs => revalidate(rs.map(r => r._id === id ? { ...r, [key]: val } : r)));
  const deleteRecord = (id) => setRecords(rs => revalidate(rs.filter(r => r._id !== id))); // deleting one never touches the others
  const toggleSelect = (id) => setRecords(rs => rs.map(r => r._id === id ? { ...r, _selected: !r._selected } : r));
  const toggleSelectAll = () => setRecords(rs => { const allSelected = rs.every(r => r._selected); return rs.map(r => ({ ...r, _selected: !allSelected })); });

  // ---- Add-eligible-program-from-review: tapping "+" next to an Eligible badge
  // clones the current record into a new preview card registered under that
  // program, instead of writing to Supabase immediately — it just becomes
  // another selected record, so it goes through the same review/edit/import
  // flow (and duplicate checks) as everything else on this screen. ----
  const isProgramAdded = (rec, key) => records.some(r => r.program === key && (
    (rec.aadhaar_number && r.aadhaar_number === rec.aadhaar_number) ||
    (!rec.aadhaar_number && rec.name && r.name === rec.name && r.father_husband_name === rec.father_husband_name)
  ));
  const addAdditionalProgramRecord = (rec, programLabel) => {
    const prog = PROGRAMS.find(p => p.label === programLabel);
    if (!prog) return;
    if (rec.program === prog.key) { showToast(`Already registering under ${prog.short}.`, "error"); return; }
    if (isProgramAdded(rec, prog.key)) { showToast(`${rec.name || "This record"} is already added for ${prog.short}.`, "error"); return; }
    const newRec = { ...rec, program: prog.key, _id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, _selected: true };
    setRecords(rs => revalidate([...rs, newRec]));
    showToast(`Added ${rec.name || "record"} for ${prog.short} — review it below, then Import Selected to save.`);
  };

  const doImport = async () => {
    const toImport = records.filter(r => r._selected);
    if (toImport.length === 0) { showToast("Select at least one record first.", "error"); return; }
    let imported = 0, failed = 0;
    const errorSamples = [];
    for (const rec of toImport) {
      if (!rec.name?.trim()) { failed++; errorSamples.push("(no name) — skipped, name is required"); continue; }
      try {
        const prefix = PROGRAM_MAP[rec.program]?.idPrefix || "BEN";
        let beneficiary_id, lastErr;
        for (let attempt = 0; attempt < 4; attempt++) {
          const { data: latest } = await supabase.from("beneficiaries_v2").select("beneficiary_id").like("beneficiary_id", `${prefix}-%`).order("beneficiary_id", { ascending: false }).limit(1);
          const lastNum = latest?.[0]?.beneficiary_id?.match(/(\d+)$/);
          const nextNum = (lastNum ? parseInt(lastNum[1], 10) : 0) + 1 + attempt;
          beneficiary_id = `${prefix}-${String(nextNum).padStart(4, "0")}`;
          const payload = {
            beneficiary_id, name: rec.name, age: rec.age || null, gender: rec.gender || null,
            identity_type: rec.aadhaar_number ? "aadhaar" : (rec.voter_id ? "voter" : null),
            identity_number: rec.aadhaar_number || rec.voter_id || null,
            house_no: rec.house_no || null, phone: rec.phone || null,
            village: rec.village || null, mandal: rec.mandal || null,
            district: rec.district || "Tirupati", state: rec.state || "Andhra Pradesh",
            category: rec.category || null, program: rec.program || null, status: "Registered",
            registration_date: new Date().toISOString().slice(0, 10),
            field_worker_name: rec.field_worker_name || (currentUser?.role === "fieldworker" ? currentUser.username : ""),
            notes: [rec.father_husband_name ? `Father/Husband: ${rec.father_husband_name}` : "", rec._dobRaw ? `DOB: ${rec._dobRaw}` : "", rec.extra_notes ? `Notes: ${rec.extra_notes}` : ""].filter(Boolean).join(" · "),
            created_at: new Date().toISOString(),
          };
          const { error } = await supabase.from("beneficiaries_v2").insert(payload);
          lastErr = error;
          if (!error) break;
          if (!(error.message || "").includes("duplicate key")) break;
        }
        if (lastErr) { failed++; errorSamples.push(`${rec.name}: ${lastErr.message}`); continue; }
        imported++;
        await logAppAudit("CREATE", "Beneficiaries", `Imported via Bulk AI Import: ${rec.name} (${beneficiary_id})`);
      } catch (e) { failed++; errorSamples.push(`${rec.name}: ${e.message || "unknown error"}`); }
    }
    setSummary({ total: toImport.length, imported, failed, errorSamples: errorSamples.slice(0, 5) });
    setStage("summary");
    if (imported > 0 && onImported) onImported();
  };

  const resetAll = () => { setStage("input"); setImages([]); setPastedText(""); setRecords([]); setSummary(null); setEditingId(null); };

  if (stage === "summary" && summary) {
    return (
      <div className="max-w-[480px] mx-auto text-center py-8">
        {summary.imported > 0 ? <CheckCircle size={36} className="mx-auto mb-3 text-[#16A34A]" /> : <XCircle size={36} className="mx-auto mb-3 text-[#DC2626]" />}
        <p className="text-[15px] font-bold text-[#111827] mb-4">{summary.imported > 0 ? "Import Complete" : "Nothing Was Imported"}</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[["Selected", summary.total, "#1E3A8A"], ["Imported", summary.imported, "#16A34A"], ["Failed", summary.failed, "#DC2626"]].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-3"><p className="text-[18px] font-bold" style={{ color: c }}>{v}</p><p className="text-[9.5px] text-[#6B7280]">{l}</p></div>
          ))}
        </div>
        {summary.errorSamples?.length > 0 && (
          <div className="text-left rounded-xl p-3 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
            <p className="text-[11.5px] font-bold text-[#DC2626] mb-1.5">Why some failed:</p>
            {summary.errorSamples.map((msg, i) => <p key={i} className="text-[10.5px] text-[#991B1B] mb-1">• {msg}</p>)}
          </div>
        )}
        <button onClick={resetAll} className="rounded-xl px-6 py-3 text-[13px] font-bold text-white" style={{ background: "#7C3AED" }}>Import More</button>
      </div>
    );
  }

  if (stage === "preview") {
    const selectedCount = records.filter(r => r._selected).length;
    const batchDupCount = records.filter(r => r._batchDuplicate).length;
    return (
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-[17px] font-bold text-[#111827]">{records.length} Beneficiaries Found</h2>
            <p className="text-[12px] text-[#6B7280]">
              {selectedCount} selected · edit or delete any record before importing
              {batchDupCount > 0 && <span style={{ color: "#C2410C" }}> · {batchDupCount} repeated {batchDupCount === 1 ? "entry" : "entries"} from the AI output auto-deselected</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleSelectAll} className="text-[12px] font-semibold text-[#7C3AED]">{records.every(r => r._selected) ? "Deselect All" : "Select All"}</button>
            <button onClick={() => setStage("input")} className="text-[12px] font-semibold text-[#DC2626]">Cancel</button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {records.map(rec => {
            const isEditing = editingId === rec._id;
            return (
              <div key={rec._id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                <div className="flex items-start gap-3 mb-3">
                  <input type="checkbox" checked={rec._selected} onChange={() => toggleSelect(rec._id)} className="mt-1.5" style={{ width: 18, height: 18 }} />
                  <div className="w-14 h-14 rounded-lg border border-[#E5E7EB] shrink-0 flex items-center justify-center bg-[#F3F4F6]"><User size={20} className="text-[#9CA3AF]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#111827] truncate">{rec.name || <span className="text-[#DC2626]">(no name)</span>}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge label="Text Import" color="#7C3AED" tint="#F5F3FF" />
                      {rec._batchDuplicate && (
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FFF7ED", color: "#C2410C" }}>⚠ Repeated in AI output — deselected</span>
                      )}
                      {rec._warnings.length === 0
                        ? <Badge label="Looks good" color="#16A34A" tint="#DCFCE7" />
                        : rec._warnings.map((w, i) => <span key={i} className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626" }}>⚠ {w}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => setEditingId(isEditing ? null : rec._id)} className="text-[11px] font-semibold text-[#1E3A8A]">{isEditing ? "Done" : "Edit"}</button>
                    <button onClick={() => deleteRecord(rec._id)} className="text-[11px] font-semibold text-[#DC2626]">Delete</button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#F3F4F6]">
                    <Field label="Name"><Input value={rec.name} onChange={e => updateRecord(rec._id, "name", e.target.value)} /></Field>
                    <Field label="Father/Husband"><Input value={rec.father_husband_name} onChange={e => updateRecord(rec._id, "father_husband_name", e.target.value)} /></Field>
                    <Field label="Gender"><Select value={rec.gender} onChange={e => updateRecord(rec._id, "gender", e.target.value)} options={GENDER_OPTIONS} placeholder="Select" /></Field>
                    <Field label="Age"><Input type="number" value={rec.age} onChange={e => updateRecord(rec._id, "age", e.target.value)} /></Field>
                    <Field label="Mobile"><Input value={rec.phone} onChange={e => updateRecord(rec._id, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" /></Field>
                    <Field label="Aadhaar"><Input value={rec.aadhaar_number} onChange={e => updateRecord(rec._id, "aadhaar_number", e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" /></Field>
                    <Field label="Door No"><Input value={rec.house_no || ""} onChange={e => updateRecord(rec._id, "house_no", e.target.value)} /></Field>
                    <Field label="Village"><Input value={rec.village} onChange={e => updateRecord(rec._id, "village", e.target.value)} /></Field>
                    <Field label="Mandal"><Input value={rec.mandal} onChange={e => updateRecord(rec._id, "mandal", e.target.value)} /></Field>
                    <Field label="District"><Select value={rec.district} onChange={e => updateRecord(rec._id, "district", e.target.value)} options={DISTRICTS_AP} /></Field>
                    <Field label="Program"><Select value={rec.program} onChange={e => updateRecord(rec._id, "program", e.target.value)} options={PROGRAMS.map(p => ({ value: p.key, label: p.label }))} placeholder="Select" /></Field><Field label="Category"><Select value={rec.category || ""} onChange={e => updateRecord(rec._id, "category", e.target.value)} options={CATEGORY_OPTIONS} placeholder="Select" /></Field>
<Field label="Education / Notes"><Input value={rec.extra_notes || ""} onChange={e => updateRecord(rec._id, "extra_notes", e.target.value)} /></Field>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-[#F3F4F6] text-[11.5px]">
                    <InfoRow label="Father/Husband" value={rec.father_husband_name || "—"} />
                    <InfoRow label="Gender" value={rec.gender || "—"} />
                    <InfoRow label="Age" value={rec.age || "—"} />
                    <InfoRow label="Mobile" value={rec.phone || "—"} />
                    <InfoRow label="Aadhaar" value={rec.aadhaar_number || "—"} />
                    <InfoRow label="Door No" value={rec.house_no || "—"} />
                    <InfoRow label="Village" value={rec.village || "—"} />
                    <InfoRow label="Mandal" value={rec.mandal || "—"} />
                    <InfoRow label="District" value={rec.district || "—"} />
                    <InfoRow label="Program" value={PROGRAM_MAP[rec.program]?.label || rec.program || "—"} /><InfoRow label="Category" value={rec.category || "—"} />
<InfoRow label="Education/Notes" value={rec.extra_notes || "—"} />
                 <div className="col-span-2 flex items-center gap-1.5 flex-wrap mt-1 pt-2 border-t border-[#F3F4F6]">
  <span className="text-[10px] text-[#9CA3AF]">Eligible:</span>
  {checkOcrEligibility(rec).map(p => {
    const prog = PROGRAMS.find(pr => pr.label === p);
    const already = prog ? isProgramAdded(rec, prog.key) : false;
    return (
      <span key={p} className="flex items-center gap-1 text-[9.5px] font-medium pl-2 pr-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E3A8A]">
        {p}
        {prog && (already ? (
          <CheckCircle size={11} className="text-[#16A34A]" />
        ) : (
          <button type="button" onClick={() => addAdditionalProgramRecord(rec, p)} title={`Add as a ${prog.short} record`}
            className="flex items-center justify-center rounded-full text-white font-bold" style={{ width: 14, height: 14, fontSize: 11, lineHeight: 1, background: "#1E3A8A" }}>
            +
          </button>
        ))}
      </span>
    );
  })}
</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-[#F8FAFC] pt-2 pb-1">
          <button onClick={doImport} disabled={selectedCount === 0} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white disabled:opacity-40" style={{ background: "#7C3AED", minHeight: 48 }}>
            Import Selected ({selectedCount})
          </button>
        </div>
      </div>
    );
  }

  // stage === "input"
  return (
    <div className="max-w-[560px] mx-auto pb-6">
      <h2 className="text-[17px] font-bold text-[#111827] mb-1">🤖 Bulk AI Import</h2>
      <p className="text-[12px] text-[#6B7280] mb-4">Photograph a beneficiary register, ask an AI app (ChatGPT, Gemini, Claude, etc.) to transcribe it, then paste the result below. This is independent from Smart Import (OCR) — nothing here touches that module.</p>

      {!providerStatusLoading && (
        connectedProviderId ? (
          <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-4" style={{ background: "#DCFCE7" }}>
            <span className="text-[11px] font-semibold text-[#16A34A]">✓ AI provider connected ({connectedProviderId})</span>
            <button onClick={() => setShowProviderConfig(true)} className="text-[11px] font-semibold text-[#1E3A8A] underline">Manage</button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-4" style={{ background: "#FEF2F2" }}>
            <span className="text-[11px] font-semibold text-[#B91C1C]">No AI provider connected yet</span>
            <button onClick={() => setShowProviderConfig(true)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white shrink-0" style={{ background: "#7C3AED" }}>Connect Provider</button>
          </div>
        )
      )}

     {screen === "capture" && (<>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
        <p className="text-[12.5px] font-bold text-[#111827] mb-1">Section 1 — Camera / Gallery Capture</p>
        <p className="text-[10.5px] text-[#6B7280] mb-3">Take a photo or pick register pages from your gallery. Each image is auto-cropped, straightened and enhanced. AI analysis isn't connected yet — this prepares images for that future step.</p>
        <ImageCaptureOptimizer onContinue={(images) => { setCapturedImages(images); setScreen("aiReview"); }} />
        {capturedImages.length > 0 && (
          <p className="text-[11px] font-semibold text-[#16A34A] mt-3">✓ {capturedImages.length} image(s) optimized and ready — use Section 2 below to get them into records for now.</p>
        )}
      </div>
        <PromptGenerator images={capturedImages} />

      <div className="text-center text-[11px] font-bold text-[#9CA3AF] my-2">— OR —</div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
        <p className="text-[12.5px] font-bold text-[#111827] mb-1">Section 2 — Paste AI Output</p>
        <p className="text-[10.5px] text-[#6B7280] mb-2">Example format (multiple beneficiaries can be pasted together):</p>
        <pre className="text-[10px] text-[#374151] p-2 rounded-lg mb-3 whitespace-pre-wrap" style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
{`Name: Venkatesh
Father/Husband: Kumar
Gender: Male
DOB: 11/07/1996
Aadhaar: 123456789012
Mobile: 9876543210
Village: Example
Mandal: Example
District: Example
Program: RYDEAP`}
        </pre>
        <textarea
          value={pastedText}
          onChange={e => setPastedText(e.target.value)}
          placeholder="Paste the AI's transcribed text here..."
          rows={10}
          className="w-full rounded-xl border border-[#E5E7EB] p-3 text-[12.5px]"
        />
      </div>

      <button onClick={analyze} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white" style={{ background: "#7C3AED", minHeight: 48 }}>
        Analyze AI data 
      </button>

      <div className="text-center text-[11px] font-bold text-[#9CA3AF] my-2">— OR —</div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
        <p className="text-[12.5px] font-bold text-[#111827] mb-1">Section 3 — Excel/CSV Import</p>
        <p className="text-[10.5px] text-[#6B7280] mb-3">Already have a spreadsheet (e.g. a partner scheme's master list)? Upload it directly — no AI transcription needed. Records are set to Women's Empowerment and land on the review screen for you to check before importing.</p>
        <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-[#E5E7EB] py-3.5 text-[13px] font-semibold text-[#374151] cursor-pointer" style={{ minHeight: 48 }}>
          {excelImporting ? "Reading file…" : "📊 Choose Excel/CSV File"}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={excelImporting}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleExcelFile(f); e.target.value = ""; }} />
        </label>
      </div>
        </>
      )}

       {screen === "aiReview" && <AIReview images={capturedImages} onBack={() => setScreen("capture")} currentUser={currentUser} showToast={showToast} onRecordsReady={applyParsedRecords} />}
    </div>
  );
}

/* ============================================================
   AADHAAR AUTO-MATCH UPLOAD — general DMS entry point (no
   beneficiary pre-selected). Field worker photographs an Aadhaar
   card / Xerox copy; the connected AI provider (same per-user
   key infra as Bulk AI Import) reads Name/Aadhaar Number/Door No/
   Village/Mandal/District/State off it via the existing
   parseAIText() "Label: value" parser (same reused engine as the
   rest of Bulk AI Import, not a new parser). The Aadhaar number
   is matched against beneficiaries_v2.identity_number; on a match
   the field worker reviews extracted address details (only fields
   currently empty on the record are offered, so nothing already
   filled is ever silently overwritten) and confirms before
   anything is saved. Saving both fills those empty fields and
   links the photo itself as an "Identity Proof" document on that
   beneficiary via the existing shared uploadDocument()/DMS bucket.
   No match found -> manual name search fallback, same review step.
   ============================================================ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

const AADHAAR_EXTRACT_PROMPT = `You are reading a photo of a single Indian Aadhaar card (or its photocopy/Xerox). Extract ONLY these fields and respond in this exact "Label: value" format, one per line, nothing else — no extra text, no markdown, no numbering:
Name: <full name printed on the card, or null>
Aadhaar Number: <all 12 digits only, no spaces — if even one digit is unclear or unreadable, write null. Never guess a partial number.>
Door No: <house/door number from the printed address, or null>
Village: <village/town from the printed address, or null>
Mandal: <mandal/taluk from the printed address, or null>
District: <district from the printed address, or null>
State: <state from the printed address, or null>
If this image is not an Aadhaar card, write null for every field.`;

function AadhaarMatchUpload({ beneficiaries, currentUser, showToast, logAppAudit, onImported, onBack, isAdmin }) {
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  const [connectedProviderId, setConnectedProviderId] = useState(null);
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);
  const aadhaarUserId = currentUser?.userId || currentUser?.supabaseUser?.id || null;

  useEffect(() => {
    if (!aadhaarUserId) { setProviderStatusLoading(false); return; }
    let cancelled = false;
    setProviderStatusLoading(true);
    getProviderStatuses(aadhaarUserId).then((statuses) => {
      if (cancelled) return;
      const connected = Object.values(statuses).find((s) => s.is_connected);
      setConnectedProviderId(connected ? connected.provider : null);
      setProviderStatusLoading(false);
    });
    return () => { cancelled = true; };
  }, [aadhaarUserId, showProviderConfig]);

  const [stage, setStage] = useState("capture"); // capture | analyzing | review | nomatch | manualSearch
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [matched, setMatched] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null); // the permanent copy, saved immediately on capture — kept even if no match is found or the process is cancelled
  const [savingCopy, setSavingCopy] = useState(false);
  const [unlinkedDocs, setUnlinkedDocs] = useState([]);
  const [showUnlinked, setShowUnlinked] = useState(false);

  // Every photo saved on capture starts as an unlinked "general" document —
  // this is where those live until (or unless) they get matched to a
  // beneficiary. Reloaded after every save/link so the list stays current.
  const loadUnlinked = async () => {
    const { data } = await supabase.from("documents").select("*")
      .eq("entity_type", "general").is("entity_id", null).eq("document_type", "Identity Proof").eq("status", "Active")
      .order("uploaded_at", { ascending: false });
    setUnlinkedDocs(data || []);
  };
  useEffect(() => { loadUnlinked(); }, []);

  const viewSavedDoc = async (doc) => {
    const { data, error } = await supabase.storage.from("beneficiary-documents").createSignedUrl(doc.file_path, 3600);
    if (error || !data?.signedUrl) { showToast("Could not open this photo.", "error"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const linkExistingDoc = (doc) => {
    setSavedDoc(doc); setPhotoFile(null); setPreviewUrl(null); setExtracted({});
    setStage("manualSearch"); setShowUnlinked(false);
  };

  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const confirmDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    try {
      await supabase.storage.from("beneficiary-documents").remove([deleteDocTarget.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", deleteDocTarget.id);
      if (error) throw error;
      await logAppAudit("DELETE", "Documents", `Deleted unlinked ID photo: ${deleteDocTarget.file_name}`);
      showToast("Deleted.", "success");
      setDeleteDocTarget(null);
      loadUnlinked();
    } catch (e) {
      showToast(e.message || "Delete failed", "error");
    }
  };

  if (showProviderConfig) {
    return <ProviderConfig currentUser={currentUser} showToast={showToast} onBack={() => setShowProviderConfig(false)} />;
  }

  const resetAll = () => {
    setStage("capture"); setPhotoFile(null); setPreviewUrl(null);
    setExtracted(null); setMatched(null); setEditFields({}); setSearchQuery("");
    setSavedDoc(null); setSavingCopy(false);
  };

  // Every ID photo (Aadhaar or otherwise) is saved to the DMS the moment it's
  // picked — as an unlinked "general" document — so a copy always exists even
  // if no beneficiary match is found or the field worker abandons the flow.
  // If a match is later confirmed, this same stored file is re-linked to that
  // beneficiary (see confirmSave) instead of being uploaded a second time.
  const onPickPhoto = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1600, 0.85);
      setPhotoFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setSavedDoc(null);
      setSavingCopy(true);
      try {
        const doc = await uploadDocument({
          file: compressed, entityType: "general", entityId: null,
          documentType: "Identity Proof", uploadedBy: currentUser?.username || currentUser?.full_name || "Field Worker",
        });
        setSavedDoc(doc);
        loadUnlinked();
      } catch (e) {
        showToast("Photo captured, but saving a copy failed: " + (e.message || "unknown error"), "error");
      } finally {
        setSavingCopy(false);
      }
    } catch (e) {
      showToast(e.message || "Could not read image", "error");
    }
  };

  const seedEditFields = (foundMatch, rec) => ({
    door_no: foundMatch.house_no || rec.house_no || "",
    village: foundMatch.village || rec.village || "",
    mandal: foundMatch.mandal || rec.mandal || "",
    district: foundMatch.district || rec.district || "",
    state: foundMatch.state || rec.state || "",
  });

  const analyze = async () => {
    if (!photoFile) return;
    if (!connectedProviderId) { showToast("Connect an AI provider first.", "error"); return; }
    setStage("analyzing");
    try {
      if (!savedDoc) {
        try {
          const doc = await uploadDocument({
            file: photoFile, entityType: "general", entityId: null,
            documentType: "Identity Proof", uploadedBy: currentUser?.username || currentUser?.full_name || "Field Worker",
          });
          setSavedDoc(doc);
          loadUnlinked();
        } catch (e) {
          showToast("Could not save a copy of the photo: " + (e.message || "unknown error"), "error");
        }
      }
      const base64 = await fileToBase64(photoFile);
      const rawText = await analyzeImage(aadhaarUserId, connectedProviderId, base64, photoFile.type || "image/jpeg", AADHAAR_EXTRACT_PROMPT);
      const parsed = parseAIText(rawText);
      const rec = parsed?.[0] || {};
      setExtracted(rec);
      const cleanAadhaar = String(rec.aadhaar_number || "").replace(/\D/g, "");
      if (cleanAadhaar.length !== 12) {
        setStage("nomatch");
        showToast("Aadhaar number could not be read clearly — try a clearer photo.", "error");
        return;
      }
      const foundMatch = (beneficiaries || []).find(b => String(b.identity_number || "").replace(/\D/g, "") === cleanAadhaar);
      if (foundMatch) {
        setMatched(foundMatch);
        setEditFields(seedEditFields(foundMatch, rec));
        setStage("review");
      } else {
        setStage("nomatch");
      }
    } catch (e) {
      showToast(e.message || "Analysis failed", "error");
      setStage("capture");
    }
  };

  const pickManual = (b) => {
    setMatched(b);
    setEditFields(seedEditFields(b, extracted || {}));
    setStage("review");
  };

  const confirmSave = async () => {
    if (!matched) return;
    if (!photoFile && !savedDoc) { showToast("No photo to save.", "error"); return; }
    setSaving(true);
    try {
      const updatePayload = {};
      if (!matched.house_no && editFields.door_no) updatePayload.house_no = editFields.door_no;
      if (!matched.village && editFields.village) updatePayload.village = editFields.village;
      if (!matched.mandal && editFields.mandal) updatePayload.mandal = editFields.mandal;
      if (!matched.district && editFields.district) updatePayload.district = editFields.district;
      if (!matched.state && editFields.state) updatePayload.state = editFields.state;
      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase.from("beneficiaries_v2").update(updatePayload).eq("beneficiary_id", matched.beneficiary_id);
        if (error) throw error;
      }
      if (savedDoc?.id) {
        const { error: linkErr } = await supabase.from("documents").update({
          entity_type: "beneficiary", entity_id: matched.beneficiary_id, category: DOCUMENT_CATEGORIES.beneficiary,
        }).eq("id", savedDoc.id);
        if (linkErr) throw linkErr;
      } else {
        // Fallback in case the immediate save-on-capture failed earlier.
        await uploadDocument({
          file: photoFile, entityType: "beneficiary", entityId: matched.beneficiary_id,
          documentType: "Identity Proof", uploadedBy: currentUser?.username || currentUser?.full_name || "Field Worker",
        });
      }
      await logAppAudit("UPDATE", "Beneficiaries", `Aadhaar auto-matched & linked for ${matched.name} (${matched.beneficiary_id})`);
      showToast("Saved — Aadhaar photo linked and address filled.", "success");
      if (onImported) onImported();
      loadUnlinked();
      resetAll();
    } catch (e) {
      showToast(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (providerStatusLoading) {
    return <div className="max-w-[480px] mx-auto text-center py-10 text-[13px] text-[#6B7280]">Checking AI provider…</div>;
  }

  if (!connectedProviderId) {
    return (
      <div className="max-w-[480px] mx-auto text-center py-10">
        <CreditCard size={32} className="mx-auto mb-3 text-[#9CA3AF]" />
        <p className="text-[14px] font-bold text-[#111827] mb-1">Connect an AI Provider</p>
        <p className="text-[12px] text-[#6B7280] mb-4">Aadhaar Auto-Match needs a connected AI provider (OpenAI/Gemini/Claude) to read the card.</p>
        <button onClick={() => setShowProviderConfig(true)} className="rounded-xl px-6 py-3 text-[13px] font-bold text-white" style={{ background: "#7C3AED" }}>Connect Provider</button>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto">
      <div className="flex items-center gap-2 mb-1">
        {onBack && <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>}
        <h2 className="text-[17px] font-bold text-[#111827]">Aadhaar Auto-Match Upload</h2>
      </div>
      <p className="text-[12px] text-[#6B7280] mb-2">Photograph an Aadhaar card / Xerox copy — matching beneficiary and address details are found automatically.</p>
      <button onClick={() => setShowUnlinked(s => !s)} className="text-[11px] font-semibold text-[#7C3AED] mb-3">
        🗂 {unlinkedDocs.length} saved photo{unlinkedDocs.length === 1 ? "" : "s"} not yet linked {showUnlinked ? "▲" : "▼"}
      </button>

      {showUnlinked && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 mb-4 max-h-64 overflow-y-auto">
          {unlinkedDocs.length === 0 ? (
            <p className="text-[11.5px] text-[#9CA3AF] text-center py-3">No unlinked saved copies</p>
          ) : unlinkedDocs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between gap-2 py-2 border-b border-[#F3F4F6] last:border-0">
              <div>
                <p className="text-[11.5px] font-semibold text-[#111827]">{doc.file_name}</p>
                <p className="text-[10px] text-[#9CA3AF]">{new Date(doc.uploaded_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => viewSavedDoc(doc)} className="text-[10.5px] font-semibold text-[#374151] px-2.5 py-1.5 rounded-lg border border-[#E5E7EB]">View</button>
                <button onClick={() => linkExistingDoc(doc)} className="text-[10.5px] font-semibold text-white px-2.5 py-1.5 rounded-lg" style={{ background: "#7C3AED" }}>Link</button>
                {isAdmin && (
                  <button onClick={() => setDeleteDocTarget(doc)} className="text-[10.5px] font-semibold text-[#DC2626] px-2.5 py-1.5 rounded-lg border border-[#FCA5A5]">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {deleteDocTarget && (
        <ConfirmDialog title="Delete Photo?" message={`Permanently delete "${deleteDocTarget.file_name}"? This cannot be undone.`}
          onConfirm={confirmDeleteDoc} onCancel={() => setDeleteDocTarget(null)} />
      )}

      {stage === "capture" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          {previewUrl ? (
            <img src={previewUrl} alt="Aadhaar preview" className="w-full rounded-xl mb-3 border border-[#E5E7EB]" />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] py-10 text-center text-[12px] text-[#9CA3AF] mb-3">No photo selected</div>
          )}
          {photoFile && (
            <p className="text-[10.5px] mb-3" style={{ color: savingCopy ? "#9CA3AF" : savedDoc ? "#16A34A" : "#DC2626" }}>
              {savingCopy ? "Saving a copy…" : savedDoc ? "✓ Copy saved to DMS" : "⚠ Copy not saved — will retry when you tap Analyze"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] py-3 text-[12.5px] font-semibold text-[#374151] cursor-pointer" style={{ minHeight: 44 }}>
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <label className="flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] py-3 text-[12.5px] font-semibold text-[#374151] cursor-pointer" style={{ minHeight: 44 }}>
              🖼 Gallery
              <input type="file" accept="image/*" className="hidden" onChange={e => { onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
          <button onClick={analyze} disabled={!photoFile} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white disabled:opacity-40" style={{ background: "#7C3AED", minHeight: 48 }}>
            Analyze & Match
          </button>
        </div>
      )}

      {stage === "analyzing" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center">
          <RefreshCw size={26} className="mx-auto mb-3 text-[#7C3AED] animate-spin" />
          <p className="text-[13px] text-[#374151]">Reading Aadhaar card and searching for a match…</p>
        </div>
      )}

      {stage === "nomatch" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <XCircle size={28} className="mx-auto mb-2 text-[#DC2626]" />
          <p className="text-[13.5px] font-bold text-[#111827] text-center mb-1">No Matching Beneficiary Found</p>
          {extracted?.aadhaar_number && <p className="text-[11.5px] text-[#6B7280] text-center mb-4">Read Aadhaar: {extracted.aadhaar_number} {extracted.name ? `· ${extracted.name}` : ""}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setStage("manualSearch")} className="rounded-xl border border-[#E5E7EB] py-3 text-[12.5px] font-semibold text-[#374151]" style={{ minHeight: 44 }}>Search Manually</button>
            <button onClick={resetAll} className="rounded-xl py-3 text-[12.5px] font-bold text-white" style={{ background: "#7C3AED", minHeight: 44 }}>Retake Photo</button>
          </div>
        </div>
      )}

      {stage === "manualSearch" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search beneficiary by name…"
            className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-[13px] mb-3" />
          <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5">
            {(beneficiaries || [])
              .filter(b => searchQuery.trim().length > 0 && (b.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))
              .slice(0, 20)
              .map(b => (
                <button key={b.beneficiary_id} onClick={() => pickManual(b)} className="text-left rounded-xl border border-[#E5E7EB] px-3 py-2.5 hover:bg-[#F3F4F6]">
                  <p className="text-[12.5px] font-semibold text-[#111827]">{b.name}</p>
                  <p className="text-[10.5px] text-[#6B7280]">{b.beneficiary_id} · {b.village || "—"}</p>
                </button>
              ))}
            {searchQuery.trim().length > 0 && (beneficiaries || []).filter(b => (b.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 && (
              <p className="text-[11.5px] text-[#9CA3AF] text-center py-4">No matches</p>
            )}
          </div>
          <button onClick={resetAll} className="w-full rounded-xl border border-[#E5E7EB] py-2.5 text-[12px] font-semibold text-[#374151] mt-3">Cancel</button>
        </div>
      )}

      {stage === "review" && matched && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="rounded-xl mb-3 p-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <p className="text-[13px] font-bold text-[#111827]">{matched.name}</p>
            <p className="text-[11px] text-[#16A34A]">{matched.beneficiary_id}{extracted?.aadhaar_number ? ` · Aadhaar matched: ${extracted.aadhaar_number}` : " · Linking saved photo to this beneficiary"}</p>
          </div>
          {previewUrl ? (
            <img src={previewUrl} alt="Aadhaar" className="w-full rounded-xl mb-3 border border-[#E5E7EB]" />
          ) : savedDoc ? (
            <button onClick={() => viewSavedDoc(savedDoc)} className="w-full rounded-xl border border-[#E5E7EB] py-3 text-[12px] font-semibold text-[#374151] mb-3">🖼 View Saved Photo</button>
          ) : null}
          <p className="text-[11px] font-semibold text-[#6B7280] mb-2">Confirm address details before saving:</p>
          <div className="flex flex-col gap-2 mb-4">
            {[["door_no", "Door No"], ["village", "Village"], ["mandal", "Mandal"], ["district", "District"], ["state", "State"]].map(([key, label]) => {
              const alreadyOnRecord = key === "door_no" ? matched.house_no : matched[key];
              return (
                <div key={key}>
                  <p className="text-[10px] text-[#9CA3AF] mb-0.5">{label}{alreadyOnRecord ? " (already on record — not changed)" : ""}</p>
                  {alreadyOnRecord ? (
                    <p className="text-[12.5px] text-[#111827] px-3 py-2 rounded-lg bg-[#F3F4F6]">{alreadyOnRecord}</p>
                  ) : (
                    <input value={editFields[key] || ""} onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12.5px]" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={resetAll} disabled={saving} className="rounded-xl border border-[#E5E7EB] py-3 text-[12.5px] font-semibold text-[#374151] disabled:opacity-50" style={{ minHeight: 44 }}>Cancel</button>
            <button onClick={confirmSave} disabled={saving} className="rounded-xl py-3 text-[12.5px] font-bold text-white disabled:opacity-50" style={{ background: "#16A34A", minHeight: 44 }}>
              {saving ? "Saving…" : "Confirm & Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


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

  var css = "@page{margin:20px;} body{font-family:Arial,sans-serif;padding:0;font-size:10.5px;color:#111827;} " +
    ".ph-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:6px 0 10px 0;} " +
    ".ph-left{display:flex;gap:12px;align-items:center;} .ph-left img{width:50px;height:50px;object-fit:contain;} " +
    ".org-name{font-size:15px;font-weight:bold;color:#1E3A8A;line-height:1.25;max-width:420px;} " +
    ".org-sub{font-size:10px;color:#6B7280;margin-top:3px;} " +
    ".ph-right{text-align:right;} .report-title{font-size:15px;font-weight:bold;color:#1E3A8A;} " +
    ".report-meta{font-size:9.5px;color:#6B7280;margin-top:2px;} " +
    ".stats-bar{display:flex;gap:18px;flex-wrap:wrap;padding-bottom:10px;border-bottom:3px solid #1E3A8A;font-size:10.5px;color:#374151;font-weight:600;} " +
    "table{width:100%;border-collapse:collapse;} .hdrcell,.ftrcell{border:none !important;padding:0 !important;background:#fff !important;} " +
    "th{background:#1E3A8A;color:#fff;padding:5px 6px;text-align:left;font-size:9px;white-space:nowrap;} " +
    "td{border:1px solid #ddd;padding:4px 6px;font-size:9.5px;} tbody tr:nth-child(even){background:#f9f9f9;} " +
    "thead{display:table-header-group;} tfoot{display:table-footer-group;} " +
    ".print-footer{font-size:9px;color:#999;padding:6px 0;border-top:1px solid #ddd;text-align:center;}";

  var orgHeaderHtml =
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
      "</div>";
  var footerHtml = "<div class='print-footer'>TAPASVI Society | Generated: " + new Date().toLocaleString("en-IN") + " | Total: " + total + "</div>";

  // The org/logo header used to be a position:fixed element with a hand-guessed @page top
  // margin to reserve space for it — when the header rendered taller than the guess (long
  // program name, stats bar wrapping), it overlapped and hid the table's own column-header
  // row underneath it, and this was unreliable across print/PDF engines in general. Putting
  // both the org header AND the column-header row inside the table's own <thead> instead
  // means the browser's native "repeat header on every printed page" behaviour handles it —
  // no manual margin math, and it can't overlap anything. Same idea for the footer via <tfoot>.
  var orgHeaderRow = "<tr><td class='hdrcell' colspan='" + headers.length + "'>" + orgHeaderHtml + "</td></tr>";
  var footerRow = "<tr><td class='ftrcell' colspan='" + headers.length + "'>" + footerHtml + "</td></tr>";

  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI - Beneficiary Report</title><style>" + css + "</style></head><body>" +
    "<table><thead>" + orgHeaderRow + thead + "</thead><tbody>" + tbody + "</tbody><tfoot>" + footerRow + "</tfoot></table>" + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}

function printTable(rows, title, cols) {
  var w = window.open("", "_blank");
  if (!w) return;
  var headers = cols || (rows.length ? Object.keys(rows[0]) : []);
  var logoUrl = window.location.origin + "/icon-512-transparent.png";
  var css = "@page{margin:20px 16px;} body{font-family:Arial,sans-serif;padding:0;font-size:11px;} " +
    ".print-header{display:flex;align-items:center;gap:10px;border-bottom:2px solid #1E3A8A;padding:6px 0 10px 0;} " +
    ".print-header img{width:38px;height:38px;object-fit:contain;} .print-header .org{font-weight:bold;color:#1E3A8A;font-size:15px;} .print-header .sub{font-size:9.5px;color:#6B7280;} " +
    ".print-footer{font-size:9px;color:#999;padding:6px 0;border-top:1px solid #ddd;text-align:center;} " +
    "h2{color:#374151;font-size:13px;margin:6px 0;} table{width:100%;border-collapse:collapse;} .hdrcell,.ftrcell{border:none !important;padding:0 !important;background:#fff !important;} " +
    "th{background:#1E3A8A;color:white;padding:5px 7px;text-align:left;font-size:10px;} " +
    "td{border:1px solid #ddd;padding:4px 7px;} tbody tr:nth-child(even){background:#f9f9f9;} thead{display:table-header-group;} tfoot{display:table-footer-group;}";
  var thead = "<tr>" + headers.map(function(h){ return "<th>" + h + "</th>"; }).join("") + "</tr>";
  var tbody = rows.map(function(r){ return "<tr>" + headers.map(function(h){ return "<td>" + (r[h] || "") + "</td>"; }).join("") + "</tr>"; }).join("");
  var headerHtml = "<div class='print-header'><img src='" + logoUrl + "'/><div><div class='org'>TAPASVI Society</div><div class='sub'>" + title + "</div></div></div><h2>" + title + "</h2>";
  var footerHtml = "<div class='print-footer'>TAPASVI Society | Generated: " + new Date().toLocaleString("en-IN") + " | Total: " + rows.length + "</div>";
  var orgHeaderRow = "<tr><td class='hdrcell' colspan='" + headers.length + "'>" + headerHtml + "</td></tr>";
  var footerRow = "<tr><td class='ftrcell' colspan='" + headers.length + "'>" + footerHtml + "</td></tr>";
  w.document.write("<!DOCTYPE html><html><head><title>TAPASVI - " + title + "</title><style>" + css + "</style></head><body>" +
    "<table><thead>" + orgHeaderRow + thead + "</thead><tbody>" + tbody + "</tbody><tfoot>" + footerRow + "</tfoot></table>" + "</body></html>");
  w.document.close();
  w.focus();
  setTimeout(function(){ w.print(); }, 600);
}


/* ============================================================
   UI ATOMS
   ============================================================ */

function Logo({ size = 40, style, className }) {
  return (
    <img src="/icon-512-transparent.png" alt="TAPASVI" width={size} height={size} className={className}
      style={{ objectFit: "contain", display: "block", ...style }} />
  );
}

const inputCls = "w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/20 placeholder:text-[#9CA3AF]";
const selectCls = inputCls + " appearance-none cursor-pointer";

function Field({ label, required, error, hint, children, className }) {
  return (
    <label className={"block mb-4" + (className ? " " + className : "")}>
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

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[9.5px] text-[#9CA3AF] uppercase tracking-wide">{label}</p>
      <p className="text-[12.5px] font-semibold text-[#111827] mt-0.5">{value || "—"}</p>
    </div>
  );
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
      try { localStorage.setItem("tapasvi_fw_session", JSON.stringify({ userId: fwData.id })); } catch (_) { /* non-fatal */ }
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
    .tp-input-glow:focus-within { box-shadow: 0 0 0 4px rgba(22,163,74,0.2), 0 0 22px rgba(30,58,138,0.16); }
    .tp-input-glow:focus-within .tp-field-input { border-color: #16A34A !important; }
    .tp-field-input { box-shadow: inset 0 1px 3px rgba(0,0,0,${dark ? "0.18" : "0.04"}); }
    .tp-field-input::placeholder { color: ${dark ? "#6B7280" : "#9CA3AF"}; opacity: 0.85; }
    .tp-theme-icon { display: inline-block; transition: transform 0.4s ease; }
    @keyframes tp-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
    .tp-particle { animation: tp-float 10s ease-in-out infinite; }
    @keyframes tp-logo-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
    .tp-logo-float { animation: tp-logo-float 4s ease-in-out infinite; }
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
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: dark ? "#16A34A" : "#4ADE80", opacity: dark ? 0.096 : 0.144, filter: "blur(80px)" }} />
      <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full pointer-events-none" style={{ background: dark ? "#1E3A8A" : "#3B82F6", opacity: dark ? 0.112 : 0.12, filter: "blur(90px)" }} />

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
          <div className="flex flex-col items-center gap-2.5 mb-[12px] tp-fade-up lg:hidden">
            <Logo size={168} className="tp-logo-float" style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))" }} />
            <h1 className="text-[30px] font-black text-center leading-none tracking-wide"
              style={{ backgroundImage: "linear-gradient(90deg,#16A34A,#22C55E,#4ADE80)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "0.04em" }}>
              TAPASVI
            </h1>
            <div className="flex items-center justify-center mt-1.5">
              <div className="flex items-center gap-3 rounded-full"
                style={{
                  minHeight: 50,
                  padding: "12px 32px",
                  background: dark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.42)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${dark ? "rgba(74,222,128,0.22)" : "rgba(22,163,74,0.16)"}`,
                  boxShadow: "0 0 20px rgba(34,197,94,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#4ADE80" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#16A34A" }} />
                </span>
                <span className="text-[11.5px] font-medium tracking-wide" style={{ color: dc.text }}>Digital NGO Management System</span>
                <span className="flex items-center text-[9.5px] font-semibold px-2.5 rounded-full shrink-0 self-stretch" style={{ background: dark ? "rgba(22,163,74,0.22)" : "#DCFCE7", color: "#16A34A" }}>
                  v2.0
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="tp-fade-up rounded-[28px] p-6 transition-colors duration-300" style={{ transform: "translateY(-16px)", background: dc.cardBg, backdropFilter: "blur(26px)", border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)"}`, boxShadow: "0 22px 55px -18px rgba(30,58,138,0.24)", animationDelay: "0.1s" }}>
            <p className="text-[19px] font-bold mb-0.5" style={{ color: dc.text }}>👋 Welcome Back</p>
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
              className="group relative overflow-hidden w-full rounded-xl py-3.5 text-[14.5px] font-bold mt-3 text-white flex items-center justify-center gap-2 transition-all duration-300 ease-out active:scale-[0.97] active:duration-150 disabled:opacity-70 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_14px_30px_-8px_rgba(22,163,74,0.4)] focus-visible:shadow-[0_14px_30px_-8px_rgba(22,163,74,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ background: loading ? "#9CA3AF" : "linear-gradient(90deg,#1E3A8A,#16A34A)", boxShadow: "none" }}>
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

          <div className="mt-5 text-center tp-fade-up" style={{ animationDelay: "0.2s", opacity: 0.65 }}>
            <p className="text-[10px] flex items-center justify-center gap-1.5 tracking-wide" style={{ color: dc.subtext }}>
              <ShieldCheck size={11} className="text-[#16A34A]" /> Secure Login · 256-bit SSL Protected
            </p>
            <p className="text-[9.5px] mt-1.5 tracking-wide" style={{ color: dark ? "#6B7280" : "#9CA3AF" }}>
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
    photo_path: "", aadhaar_doc_path: "",
  };

  const [form, setForm] = useState(editing ? { ...blank, ...editing } : {
    ...blank,
    field_worker_name: currentUser.role === "fieldworker" ? currentUser.username : "",
  });
  const [errors, setErrors] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStage, setPhotoStage] = useState(""); // "" | "optimizing" | "uploading"
  const [aadhaarUploading, setAadhaarUploading] = useState(false);
  const [aadhaarStage, setAadhaarStage] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [localPreview, setLocalPreview] = useState(null); // instant local preview, before the signed URL comes back

  useEffect(() => {
    if (!form.photo_path) { setPhotoPreviewUrl(null); return; }
    (async () => {
      const { data } = await supabase.storage.from("beneficiary-documents").createSignedUrl(form.photo_path, 3600);
      if (data?.signedUrl) setPhotoPreviewUrl(data.signedUrl);
    })();
    // eslint-disable-next-line
  }, [form.photo_path]);

  const uploadFile = async (file, folder, setUploading, formKey, setStage) => {
    if (!file) return;
    setUploading(true);
    if (formKey === "photo_path") setLocalPreview(URL.createObjectURL(file));
    let toUpload = file;
    try {
      if (setStage) setStage("optimizing");
      toUpload = await compressImageFile(file);
    } catch (e) {
      setUploading(false); if (setStage) setStage("");
      window.alert("We couldn't process that image. Please try a different photo.");
      return;
    }
    if (toUpload.size > 5 * 1024 * 1024) {
      setUploading(false); if (setStage) setStage("");
      window.alert("This file is still too large after optimization. Please choose a smaller file.");
      return;
    }
    if (setStage) setStage("uploading");
    const ext = toUpload.name.split(".").pop();
    const path = `${folder}/${form.beneficiary_id || "new"}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("beneficiary-documents").upload(path, toUpload, { upsert: true });
    setUploading(false); if (setStage) setStage("");
    if (error) { window.alert("Upload failed: " + error.message); return; }
    setForm(f => ({ ...f, [formKey]: path }));
  };


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
    if (!form.age || form.age < 1 || form.age > 99) e.age = "Valid age required (1-99)";
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
  const DRAFT_KEY = "tapasvi_beneficiary_draft_" + (currentUser?.username || "anon");
  useEffect(() => {
    if (editing) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(f => ({
          ...f, ...parsed.form,
          field_worker_name: currentUser.role === "fieldworker" ? currentUser.username : parsed.form?.field_worker_name || f.field_worker_name,
        }));
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
      if (!form.age || form.age < 1 || form.age > 99) e.age = "Valid age required (1-99)";
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
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F3F4F6] flex items-center justify-center shrink-0 border border-[#E5E7EB] relative">
                  {(localPreview || photoPreviewUrl) ? <img src={localPreview || photoPreviewUrl} alt="Photo" className="w-full h-full object-cover" /> : <User size={24} className="text-[#9CA3AF]" />}
                  {photoUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <RefreshCw size={16} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {photoUploading ? (
                    <span className="text-[11.5px] text-[#6B7280]">{photoStage === "optimizing" ? "Optimizing photo…" : "Uploading…"}</span>
                  ) : (
                    <div className="flex gap-2">
                      <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer">
                        📷 Take Photo
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={e => uploadFile(e.target.files[0], "photos", setPhotoUploading, "photo_path", setPhotoStage)} />
                      </label>
                      <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer">
                        🖼 Gallery
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => uploadFile(e.target.files[0], "photos", setPhotoUploading, "photo_path", setPhotoStage)} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <Field label="Beneficiary Name" required error={errors.name}>
                  <Input value={form.name} onChange={set("name")} placeholder="Full name" autoFocus />
                </Field>
                <Field label="Gender" required>
                  <Select value={form.gender} onChange={set("gender")} options={["Male", "Female", "Other"]} />
                </Field>
                <Field label="Age" required error={errors.age}>
                  <Input type="number" min="1" max="99" value={form.age}
                    onChange={e => setForm(f => ({ ...f, age: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                    placeholder="Years" inputMode="numeric" />
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
                      onChange={e => {
                        let val = e.target.value;
                        if (form.identity_type === "aadhaar") val = val.replace(/\D/g, "").slice(0, 12);
                        else val = val.trim().toUpperCase();
                        setForm(f => ({ ...f, identity_number: val }));
                      }}
                      maxLength={form.identity_type === "aadhaar" ? 12 : undefined}
                      placeholder={identityInfo.placeholder}
                      inputMode={form.identity_type === "aadhaar" ? "numeric" : "text"} />
                  </Field>
                </div>
                <div className="mt-3">
                  <label className="text-[12px] font-medium text-[#374151] mb-1.5 block">Document Upload (Optional)</label>
                  <div className="flex items-center gap-2">
                    <label className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#374151] cursor-pointer bg-white">
                      {aadhaarUploading ? (aadhaarStage === "optimizing" ? "Optimizing…" : "Uploading…") : form.aadhaar_doc_path ? "Change File" : "Upload Document"}
                      <input type="file" accept="image/*,application/pdf" className="hidden" disabled={aadhaarUploading}
                        onChange={e => uploadFile(e.target.files[0], "identity-docs", setAadhaarUploading, "aadhaar_doc_path", setAadhaarStage)} />
                    </label>
                    {!aadhaarUploading && form.aadhaar_doc_path && <span className="text-[11px] text-[#16A34A] flex items-center gap-1"><CheckCircle size={13} /> Uploaded</span>}
                  </div>
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
  const blank = { beneficiary_id: "", program: "", outcome_type: "", status: "Active", notes: "", details: {} };
  const [form, setForm] = useState(editing ? { ...blank, ...editing, details: editing.details || {} } : blank);
  const [errors, setErrors] = useState({});

  const selectedBeneficiary = beneficiaries.find(b => b.beneficiary_id === form.beneficiary_id);
  const program = form.program || selectedBeneficiary?.program || "";
  const outcomeOptions = OUTCOME_TYPES_BY_PROGRAM[program] || [];
  const fields = OUTCOME_FIELDS[form.outcome_type] || [];

  const pickBeneficiary = (id) => {
    const b = beneficiaries.find(x => x.beneficiary_id === id);
    setForm(f => ({ ...f, beneficiary_id: id, program: b?.program || "", outcome_type: "", details: {} }));
  };
  const pickOutcomeType = (val) => setForm(f => ({ ...f, outcome_type: val, details: {} }));
  const setDetail = (key) => (e) => {
    const val = e?.target ? e.target.value : e;
    setForm(f => ({ ...f, details: { ...f.details, [key]: val } }));
  };

  const validate = () => {
    const e = {};
    if (!form.beneficiary_id) e.beneficiary_id = "Required";
    if (!form.outcome_type) e.outcome_type = "Required";
    fields.forEach(fld => { if (fld.required && !form.details[fld.key]) e[fld.key] = "Required"; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = ev => { ev.preventDefault(); if (validate()) onSave({ ...form, program }); };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Outcome Record" : "Add Livelihood Outcome"}</h2>
          <p className="text-[11.5px] text-[#6B7280]">Track the final livelihood outcome for this beneficiary</p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <form onSubmit={submit} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Beneficiary" required error={errors.beneficiary_id}>
            <Select value={form.beneficiary_id} onChange={e => pickBeneficiary(e.target.value)}
              options={beneficiaries.map(b => ({ value: b.beneficiary_id, label: `${b.beneficiary_id} — ${b.name}` }))}
              placeholder="Select beneficiary" />
          </Field>
          <Field label="Program">
            <Input value={PROGRAM_MAP[program]?.label || "—"} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} />
          </Field>
        </div>

        {form.beneficiary_id && (
          <Field label="Outcome Type" required error={errors.outcome_type}>
            <Select value={form.outcome_type} onChange={e => pickOutcomeType(e.target.value)}
              options={outcomeOptions.map(k => ({ value: k, label: OUTCOME_TYPE_LABELS[k] }))}
              placeholder="Select outcome type" />
          </Field>
        )}

        {fields.length > 0 && (
          <>
            <SectionHeader title={OUTCOME_TYPE_LABELS[form.outcome_type]} color="#16A34A" />
            <OutcomeDynamicFields fields={fields} details={form.details} errors={errors} onSet={(key, val) => setForm(f => ({ ...f, details: { ...f.details, [key]: val } }))} />
          </>
        )}

        <Field label="Status">
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} options={["Active", "Inactive", "Changed"]} />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
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
   OUTCOME DYNAMIC FIELDS — shared renderer used by both the
   direct edit form and the guided wizard below.
   ============================================================ */
function OutcomeDynamicFields({ fields, details, errors, onSet }) {
  return (
    <div className="grid grid-cols-2 gap-x-4">
      {fields.map(fld => (
        <Field key={fld.key} label={fld.label} required={fld.required} error={errors?.[fld.key]}
          className={fld.type === "textarea" ? "col-span-2" : undefined}>
          {fld.type === "textarea" ? (
            <textarea value={details[fld.key] || ""} onChange={e => onSet(fld.key, e.target.value)} rows={2} className={inputCls} />
          ) : fld.type === "select" ? (
            <Select value={details[fld.key] || ""} onChange={e => onSet(fld.key, e.target.value)} options={fld.options} />
          ) : (
            <Input type={fld.type === "number" ? "number" : fld.type === "date" ? "date" : "text"}
              value={details[fld.key] || ""} onChange={e => onSet(fld.key, e.target.value)} />
          )}
        </Field>
      ))}
    </div>
  );
}

/* ============================================================
   LIVELIHOOD WIZARD — guided Program → Batch → Beneficiary flow.
   Never loads the full beneficiaries table — only fetches the
   beneficiaries actually enrolled in the selected batch.
   ============================================================ */
function LivelihoodWizard({ batches, employment, onRecordSaved, showToast, logAppAudit, onClose }) {
  const [step, setStep] = useState("program"); // program | batch | beneficiaries | form
  const [program, setProgram] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchBeneficiaries, setBatchBeneficiaries] = useState([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [activeBeneficiary, setActiveBeneficiary] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const programBatches = useMemo(() => batches.filter(b => b.program === program?.key), [batches, program]);

  const hasOutcome = (beneficiaryId) => employment.some(e => e.beneficiary_id === beneficiaryId);
  const followupDueRec = (beneficiaryId) => employment.find(e =>
    e.beneficiary_id === beneficiaryId && e.details?.next_followup_date && e.details.next_followup_date <= new Date().toISOString().slice(0, 10));

  const total = batchBeneficiaries.length;
  const completedCount = batchBeneficiaries.filter(b => hasOutcome(b.beneficiary_id)).length;
  const pendingCount = total - completedCount;
  const followupDueCount = batchBeneficiaries.filter(b => followupDueRec(b.beneficiary_id)).length;

  const pickProgram = (p) => { setProgram(p); setStep("batch"); };

  const pickBatch = async (batch) => {
    setSelectedBatch(batch);
    setLoadingBatch(true);
    const { data: enrolls, error: enrollErr } = await supabase.from("training_enrollments").select("*").eq("batch_id", batch.batch_id);
    if (enrollErr) { showToast("Error: " + enrollErr.message, "error"); setLoadingBatch(false); return; }
    // Built directly from enrollment records (already scoped to this batch) — no extra query against beneficiaries needed.
    const seen = new Set();
    const bens = (enrolls || []).filter(e => {
      if (seen.has(e.beneficiary_id)) return false;
      seen.add(e.beneficiary_id); return true;
    }).map(e => ({ beneficiary_id: e.beneficiary_id, name: e.beneficiary_name, village: e.village || batch.venue || "" }));
    setBatchBeneficiaries(bens);
    setLoadingBatch(false);
    setStep("beneficiaries");
  };

  const pickBeneficiary = (b) => {
    setActiveBeneficiary(b);
    setForm({ beneficiary_id: b.beneficiary_id, program: program.key, outcome_type: "", status: "Active", notes: "", details: {} });
    setErrors({});
    setStep("form");
  };

  const outcomeOptions = OUTCOME_TYPES_BY_PROGRAM[program?.key] || [];
  const fields = OUTCOME_FIELDS[form?.outcome_type] || [];

  const validate = () => {
    const e = {};
    if (!form.outcome_type) e.outcome_type = "Required";
    fields.forEach(fld => { if (fld.required && !form.details[fld.key]) e[fld.key] = "Required"; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const findNextPending = (fromId) => {
    const idx = batchBeneficiaries.findIndex(b => b.beneficiary_id === fromId);
    return batchBeneficiaries.slice(idx + 1).find(b => !hasOutcome(b.beneficiary_id))
      || batchBeneficiaries.find(b => b.beneficiary_id !== fromId && !hasOutcome(b.beneficiary_id));
  };

  const save = async (andNext) => {
    if (!validate()) return;
    setSaving(true);
    const rec = { ...form, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("employment").insert(rec).select().single();
    setSaving(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    onRecordSaved(data);
    await logAppAudit("CREATE", "Employment", `Livelihood outcome recorded: ${data.job_id}`);
    showToast("Outcome saved.");
    if (andNext) {
      const next = findNextPending(activeBeneficiary.beneficiary_id);
      if (next) { pickBeneficiary(next); } else { showToast("All beneficiaries in this batch are done! 🎉"); setStep("beneficiaries"); }
    } else {
      setStep("beneficiaries");
    }
  };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-[#111827]">Add Livelihood Outcome</h2>
          <p className="text-[11.5px] text-[#6B7280]">
            {step === "program" && "Step 1 — Select Program"}
            {step === "batch" && "Step 2 — Select Batch"}
            {step === "beneficiaries" && "Step 3 — Select Beneficiary"}
            {step === "form" && `Step 4 — ${activeBeneficiary?.name || ""}`}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>

      {step === "program" && (
        <div className="grid grid-cols-1 gap-2.5">
          {PROGRAMS.map(p => {
            const Icon = p.icon;
            return (
              <button key={p.key} onClick={() => pickProgram(p)}
                className="flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition text-left">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                  <Icon size={20} style={{ color: p.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-[#111827]">{p.label}</p>
                  <p className="text-[11.5px] text-[#6B7280]">{batches.filter(b => b.program === p.key).length} batches</p>
                </div>
                <ChevronRight size={18} className="text-[#9CA3AF]" />
              </button>
            );
          })}
        </div>
      )}

      {step === "batch" && (
        <div>
          <button onClick={() => setStep("program")} className="text-[12px] font-semibold text-[#1E3A8A] mb-3">← Change Program</button>
          {programBatches.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]"><BookOpen size={26} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No batches found for {program.label}.</p></div>
          ) : (
            <div className="space-y-2.5">
              {programBatches.map(b => (
                <button key={b.batch_id} onClick={() => pickBatch(b)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-4 hover:shadow-md transition text-left">
                  <div className="flex-1">
                    <p className="text-[13.5px] font-bold text-[#111827]">{b.training_name || b.training_type}</p>
                    <p className="text-[11px] text-[#6B7280]">{b.venue} · {b.start_date} → {b.end_date}</p>
                  </div>
                  <Badge label={b.status} color={b.status === "Completed" ? "#16A34A" : "#F97316"} tint={b.status === "Completed" ? "#DCFCE7" : "#FFF7ED"} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "beneficiaries" && (
        <div>
          <button onClick={() => setStep("batch")} className="text-[12px] font-semibold text-[#1E3A8A] mb-3">← Change Batch</button>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
            <p className="text-[12px] font-bold text-[#111827] mb-1">{selectedBatch?.training_name || selectedBatch?.training_type}</p>
            <p className="text-[11px] text-[#6B7280] mb-3">{selectedBatch?.venue}</p>
            <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden mb-3">
              <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${total ? (completedCount / total) * 100 : 0}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-[16px] font-bold text-[#111827]">{total}</p><p className="text-[9.5px] text-[#6B7280]">Total</p></div>
              <div><p className="text-[16px] font-bold text-[#16A34A]">{completedCount}</p><p className="text-[9.5px] text-[#6B7280]">Completed</p></div>
              <div><p className="text-[16px] font-bold text-[#F97316]">{pendingCount}</p><p className="text-[9.5px] text-[#6B7280]">Pending</p></div>
              <div><p className="text-[16px] font-bold text-[#DC2626]">{followupDueCount}</p><p className="text-[9.5px] text-[#6B7280]">Follow-up Due</p></div>
            </div>
          </div>

          {loadingBatch ? (
            <div className="text-center py-12 text-[#9CA3AF]"><RefreshCw size={22} className="mx-auto mb-2 animate-spin opacity-50" /><p className="text-[13px]">Loading beneficiaries...</p></div>
          ) : batchBeneficiaries.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]"><Users size={26} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No beneficiaries enrolled in this batch.</p></div>
          ) : (
            <div className="space-y-1.5">
              {batchBeneficiaries.map(b => {
                const done = hasOutcome(b.beneficiary_id);
                const due = followupDueRec(b.beneficiary_id);
                return (
                  <button key={b.beneficiary_id} onClick={() => pickBeneficiary(b)}
                    className="w-full flex items-center gap-3 bg-white rounded-xl border border-[#E5E7EB] p-3 hover:shadow-sm transition text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: done ? "#16A34A" : "#9CA3AF" }}>
                      {(b.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#111827] truncate">{b.name || b.beneficiary_id}</p>
                      <p className="text-[10px] text-[#6B7280]">{b.beneficiary_id} · {b.village}</p>
                    </div>
                    {due && <Badge label="Follow-up Due" color="#DC2626" tint="#FEE2E2" />}
                    {done ? <CheckCircle size={16} className="text-[#16A34A] shrink-0" /> : <span className="text-[9.5px] font-semibold text-[#F97316] shrink-0">Pending</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === "form" && form && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-[#F3F4F6]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: "#1E3A8A" }}>
              {(activeBeneficiary.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-[#111827]">{activeBeneficiary.name}</p>
              <p className="text-[10.5px] text-[#6B7280]">{activeBeneficiary.beneficiary_id} · {program.label}</p>
            </div>
          </div>

          <Field label="Outcome Type" required error={errors.outcome_type}>
            <Select value={form.outcome_type} onChange={e => setForm(f => ({ ...f, outcome_type: e.target.value, details: {} }))}
              options={outcomeOptions.map(k => ({ value: k, label: OUTCOME_TYPE_LABELS[k] }))}
              placeholder="Select outcome type" />
          </Field>

          {fields.length > 0 && (
            <>
              <SectionHeader title={OUTCOME_TYPE_LABELS[form.outcome_type]} color="#16A34A" />
              <OutcomeDynamicFields fields={fields} details={form.details} errors={errors}
                onSet={(key, val) => setForm(f => ({ ...f, details: { ...f.details, [key]: val } }))} />
            </>
          )}

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
          </Field>

          <div className="flex gap-2 mt-4 pt-4 border-t border-[#F3F4F6]">
            <button onClick={() => save(false)} disabled={saving} className="rounded-lg px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60" style={{ background: "#374151" }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => save(true)} disabled={saving} className="flex-1 rounded-lg px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60" style={{ background: "#16A34A" }}>
              {saving ? "Saving..." : "Save & Next →"}
            </button>
            <button onClick={() => setStep("beneficiaries")} className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-[13px] font-medium text-[#374151]">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}


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
function CountUp({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf, start;
    const target = Number(value) || 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div className="h-6" />;
  const vals = data.map(d => d.count);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${28 - ((v - min) / range) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-full h-7">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function Dashboard({ beneficiaries, training, employment, villages, isAdmin, currentUser, onQuickAction, onViewBeneficiary }) {
  const [dark, setDark] = useState(() => localStorage.getItem("tapasvi_dashboard_theme") === "dark");
  const toggleDark = () => setDark(d => { localStorage.setItem("tapasvi_dashboard_theme", !d ? "dark" : "light"); return !d; });
  const dc = dark
    ? { pageText: "#F3F4F6", subtext: "#9CA3AF", cardBg: "rgba(17,24,39,0.7)", cardBorder: "rgba(255,255,255,0.08)", sectionBg: "#0B1220" }
    : { pageText: "#111827", subtext: "#6B7280", cardBg: "rgba(255,255,255,0.75)", cardBorder: "rgba(229,231,235,0.8)", sectionBg: "#F8FAFC" };

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

  const byDistrict = useMemo(() => reportsGroupBy(beneficiaries, b => b.district), [beneficiaries]);

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
  const [recentActivity, setRecentActivity] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => {
      const [bt, ar, am, ct, us, al] = await Promise.all([
        supabase.from("batch_trainings").select("*"),
        supabase.from("assessment_records").select("*"),
        supabase.from("assessment_marks").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "fieldworker"),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      setBatches(bt.data || []);
      setAssessmentRecords(ar.data || []);
      setAssessmentMarks(am.data || []);
      setCertificates(ct.data || []);
      setFieldWorkerCount(us.count || 0);
      setRecentActivity(al.data || []);
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
  const activeProgramsCount = Object.values(byProgram).filter(c => c > 0).length;
  const trainersCount = new Set(batches.map(b => b.trainer_name).filter(Boolean)).size;
  const todayStr0 = now.toISOString().slice(0, 10);
  const todaysRegistrations = beneficiaries.filter(b => b.registration_date === todayStr0).length;

  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const newBeneficiariesThisMonth = beneficiaries.filter(b => (b.registration_date || "").slice(0, 7) === thisMonth).length;
  const beneficiariesLastMonth = beneficiaries.filter(b => (b.registration_date || "").slice(0, 7) === lastMonth).length;
  const newTrainingsThisMonth = batches.filter(b => (b.start_date || "").slice(0, 7) === thisMonth).length;
  const trainingsLastMonth = batches.filter(b => (b.start_date || "").slice(0, 7) === lastMonth).length;
  const newAssessmentsThisMonth = assessmentRecords.filter(a => (a.assessment_date || "").slice(0, 7) === thisMonth).length;
  const assessmentsLastMonth = assessmentRecords.filter(a => (a.assessment_date || "").slice(0, 7) === lastMonth).length;
  const newCertsThisMonth = certificates.filter(c => (c.certificate_date || "").slice(0, 7) === thisMonth).length;
  const certsLastMonth = certificates.filter(c => (c.certificate_date || "").slice(0, 7) === lastMonth).length;
  const newPlacementsThisMonth = employment.filter(e => (e.created_at || "").slice(0, 7) === thisMonth).length;
  const placementsLastMonth = employment.filter(e => (e.created_at || "").slice(0, 7) === lastMonth).length;

  const growthPct = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : null);

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
    { label: "Total Beneficiaries", value: total, delta: newBeneficiariesThisMonth, growth: growthPct(newBeneficiariesThisMonth, beneficiariesLastMonth), trend: beneficiaryGrowth, icon: Users, grad: ["#1E3A8A", "#3B82F6"] },
    { label: "Active Programs", value: activeProgramsCount, icon: BookOpen, grad: ["#DB2777", "#F472B6"] },
    { label: "Field Workers", value: fieldWorkerCount, icon: Users, grad: ["#DC2626", "#F87171"] },
    { label: "Trainers", value: trainersCount, icon: ClipboardList, grad: ["#F97316", "#FB923C"] },
    { label: "Today's Registrations", value: todaysRegistrations, icon: TrendingUp, grad: ["#0EA5E9", "#38BDF8"] },
    { label: "Employment Placements", value: employed, delta: newPlacementsThisMonth, growth: growthPct(newPlacementsThisMonth, placementsLastMonth), trend: placementTrend, icon: Briefcase, grad: ["#0EA5E9", "#0369A1"] },
    { label: "Women Beneficiaries", value: women, icon: Users, grad: ["#DB2777", "#EC4899"] },
    { label: "Youth Beneficiaries", value: youth, icon: Users, grad: ["#16A34A", "#4ADE80"] },
    { label: "Active Trainings", value: activeTrainings, delta: newTrainingsThisMonth, growth: growthPct(newTrainingsThisMonth, trainingsLastMonth), trend: monthlyTrainings, icon: BookOpen, grad: ["#7C3AED", "#A78BFA"] },
    { label: "Completed Trainings", value: completedTrainings, icon: CheckCircle, grad: ["#16A34A", "#22C55E"] },
    { label: "Assessments", value: assessmentRecords.length, delta: newAssessmentsThisMonth, growth: growthPct(newAssessmentsThisMonth, assessmentsLastMonth), icon: ClipboardList, grad: ["#F97316", "#FDBA74"] },
    { label: "Certificates Issued", value: certsIssued, delta: newCertsThisMonth, growth: growthPct(newCertsThisMonth, certsLastMonth), trend: certificateTrend, icon: Award, grad: ["#7C3AED", "#C4B5FD"] },
    { label: "Villages Covered", value: villagesCovered, icon: MapPin, grad: ["#16A34A", "#065F46"] },
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
    <div className="transition-colors duration-300 -m-4 p-4 rounded-2xl" style={{ background: dc.sectionBg }}>
      {/* Theme toggle */}
      <div className="flex justify-end mb-2">
        <button onClick={toggleDark} aria-label="Toggle dashboard theme"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(10px)" }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Greeting banner */}
      <div className="rounded-[20px] p-4 mb-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)", boxShadow: "0 12px 30px -12px rgba(30,58,138,0.4)" }}>
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
          <div key={s.label} className="rounded-[20px] p-3.5 text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.35)]"
            style={{ background: `linear-gradient(135deg,${s.grad[0]},${s.grad[1]})`, boxShadow: "0 8px 20px -10px rgba(0,0,0,0.25)" }}>
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                <s.icon size={15} />
              </div>
              {s.growth !== undefined && s.growth !== null && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: s.growth >= 0 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)" }}>
                  {s.growth >= 0 ? "↑" : "↓"} {Math.abs(s.growth)}%
                </span>
              )}
            </div>
            <p className="text-[20px] font-bold leading-none"><CountUp value={s.value} /></p>
            <p className="text-[10px] text-white/85 mt-1.5 leading-tight">{s.label}</p>
            {s.delta > 0 && (
              <p className="text-[9.5px] text-white/90 mt-1 flex items-center gap-0.5"><TrendingUp size={10} /> +{s.delta} this month</p>
            )}
            {s.trend && s.trend.length >= 2 && (
              <div className="mt-1.5 opacity-80"><Sparkline data={s.trend} color="#ffffff" /></div>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <h3 className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: dc.subtext }}>Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {QUICK_ACTIONS.map(a => (
            <button key={a.key} onClick={() => onQuickAction && onQuickAction(a.key)}
              className="rounded-[20px] p-3 flex flex-col items-center gap-1.5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-95" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: a.color + "1A" }}>
                <a.icon size={14} style={{ color: a.color }} />
              </div>
              <span className="text-[9.5px] font-medium text-center leading-tight" style={{ color: dc.pageText }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Beneficiaries + Recent Activities */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-bold uppercase tracking-wide" style={{ color: dc.subtext }}>Recent Beneficiaries</h3>
            <button onClick={() => onQuickAction && onQuickAction("beneficiaries-list")} className="text-[11px] font-semibold text-[#1E3A8A] hover:underline">View All →</button>
          </div>
          {[...beneficiaries].sort((a, b) => (b.registration_date || "").localeCompare(a.registration_date || "")).slice(0, 6).length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-6">No beneficiaries yet.</p>
          ) : (
            <div className="space-y-1">
              {[...beneficiaries].sort((a, b) => (b.registration_date || "").localeCompare(a.registration_date || "")).slice(0, 6).map(b => (
                <button key={b.beneficiary_id} onClick={() => onViewBeneficiary && onViewBeneficiary(b)}
                  className="w-full flex items-center gap-2.5 py-2 px-1.5 rounded-xl hover:bg-[#F8FAFC] transition-colors text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: PROGRAM_MAP[b.program]?.color || "#1E3A8A" }}>
                    {(b.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: dc.pageText }}>{b.name || b.beneficiary_id}</p>
                    <p className="text-[10px] truncate" style={{ color: dc.subtext }}>{PROGRAM_MAP[b.program]?.short || b.program} · {b.village || "—"}</p>
                  </div>
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: (statusColors[b.status] || "#1E3A8A") + "18", color: statusColors[b.status] || "#1E3A8A" }}>
                    {b.status || "Registered"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wide mb-3" style={{ color: dc.subtext }}>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-6">No activity logged yet.</p>
          ) : (
            <div className="space-y-0">
              {recentActivity.map((a, i) => {
                const isLast = i === recentActivity.length - 1;
                const color = a.action?.includes("FAILED") ? "#DC2626" : a.action === "CREATE" ? "#16A34A" : a.action === "DELETE" ? "#DC2626" : a.action === "LOGIN" ? "#1E3A8A" : "#7C3AED";
                return (
                  <div key={a.id || i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                      {!isLast && <div className="w-px flex-1 min-h-[24px]" style={{ background: "#E5E7EB" }} />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <p className="text-[11.5px] leading-snug" style={{ color: dc.pageText }}>{a.details || a.action}</p>
                      <p className="text-[9.5px] text-[#9CA3AF] mt-0.5">{a.user_email || "System"} · {a.created_at ? new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Beneficiary Growth</h3>
          <MiniBarChart data={beneficiaryGrowth} color="#1E3A8A" />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Program Distribution</h3>
          <MiniDonut data={programDonut} />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Monthly Trainings</h3>
          <MiniBarChart data={monthlyTrainings} color="#DB2777" />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Assessment Results</h3>
          <MiniDonut data={assessmentResults} colors={["#16A34A", "#DC2626"]} />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Certificate Trend</h3>
          <MiniBarChart data={certificateTrend} color="#7C3AED" />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>Placement Trend</h3>
          <MiniBarChart data={placementTrend} color="#0EA5E9" />
        </div>
        <div className="rounded-[20px] p-4 transition-colors duration-300 md:col-span-2" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold mb-3" style={{ color: dc.pageText }}>District-wise Beneficiaries</h3>
          <MiniBarChart data={byDistrict} color="#1E3A8A" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {/* Women vs Youth */}
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wide mb-4" style={{ color: dc.subtext }}>Gender Split</h3>
          <div className="flex items-end gap-4 h-28">
            {[["Women", women, "#F97316"], ["Youth (M)", youth, "#1E3A8A"]].map(([label, count, color]) => (
              <div key={label} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[16px] font-bold" style={{ color: dc.pageText }}>{count}</span>
                <div className="w-full rounded-t-lg" style={{ height: `${Math.max(8, (count / Math.max(1, total)) * 80)}px`, background: color }} />
                <span className="text-[11px]" style={{ color: dc.subtext }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Program wise */}
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wide mb-4" style={{ color: dc.subtext }}>Program-wise Beneficiaries</h3>
          <div className="space-y-3">
            {PROGRAMS.map(p => (
              <div key={p.key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.tint }}>
                  <p.icon size={14} style={{ color: p.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium" style={{ color: dc.pageText }}>{p.short}</span>
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
        <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
          <h3 className="text-[12px] font-bold uppercase tracking-wide mb-4" style={{ color: dc.subtext }}>Training Status</h3>
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
          <div className="rounded-[20px] p-4 transition-colors duration-300" style={{ background: dc.cardBg, border: `1px solid ${dc.cardBorder}`, backdropFilter: "blur(12px)" }}>
            <h3 className="text-[12px] font-bold uppercase tracking-wide mb-4" style={{ color: dc.subtext }}>Village-wise Performance</h3>
            {byVillage.length === 0 ? <p className="text-[12px] text-[#AAA]">No data yet.</p> : byVillage.map(([v, c]) => (
              <div key={v} className="flex items-center gap-3 py-1.5">
                <span className="text-[12px] w-28 shrink-0 truncate" style={{ color: dc.pageText }}>{v}</span>
                <div className="flex-1 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                  <div className="h-full rounded-full bg-[#16A34A]" style={{ width: `${(c / maxVillage) * 100}%` }} />
                </div>
                <span className="text-[12px] font-bold w-6 text-right" style={{ color: dc.pageText }}>{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FIELD WORKER DASHBOARD — dark, productivity-focused, own-data only.
   Self-contained: fetches only records scoped to the logged-in
   field worker (assigned_field_worker / field_worker_name / marked_by).
   No global NGO stats, no other users' data, no financial data.
   ============================================================ */
function FieldWorkerDashboard({ beneficiaries, currentUser, onQuickAction, onViewBeneficiary }) {
  const username = currentUser?.username;
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [assessmentMarks, setAssessmentMarks] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [myActivity, setMyActivity] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadAll = async () => {
    const [bt, al] = await Promise.all([
      supabase.from("batch_trainings").select("*").eq("assigned_field_worker", username),
      supabase.from("audit_logs").select("*").eq("user_email", username).order("created_at", { ascending: false }).limit(6),
    ]);
    const myBatches = bt.data || [];
    setBatches(myBatches);
    setMyActivity(al.data || []);
    const batchIds = myBatches.map(b => b.batch_id);
    if (batchIds.length > 0) {
      const [en, ar, asr] = await Promise.all([
        supabase.from("training_enrollments").select("*").in("batch_id", batchIds),
        supabase.from("attendance_records").select("*").in("batch_id", batchIds),
        supabase.from("assessment_records").select("*").in("batch_id", batchIds),
      ]);
      setEnrollments(en.data || []);
      setAttendanceRecords(ar.data || []);
      setAssessmentRecords(asr.data || []);
      const assessmentIds = (asr.data || []).map(a => a.id);
      if (assessmentIds.length > 0) {
        const [am, ct] = await Promise.all([
          supabase.from("assessment_marks").select("*").in("assessment_id", assessmentIds),
          supabase.from("certificates").select("*").in("batch_id", batchIds),
        ]);
        setAssessmentMarks(am.data || []);
        setCertificates(ct.data || []);
      } else {
        setAssessmentMarks([]); setCertificates([]);
      }
    } else {
      setEnrollments([]); setAttendanceRecords([]); setAssessmentRecords([]); setAssessmentMarks([]); setCertificates([]);
    }
  };

  useEffect(() => { (async () => { setLoading(true); await loadAll(); setLoading(false); })(); }, [username]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const handleSync = async () => { setSyncing(true); await loadAll(); setSyncing(false); };

  const todayStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const motivationLines = ["Let's make today count! 💪", "Every visit changes a life. 🌱", "Small steps, big impact today. 🚀", "Your work matters. Let's go! 🔥"];
  const [motivation] = useState(() => motivationLines[Math.floor(Math.random() * motivationLines.length)]);

  const assignedVillages = useMemo(() => [...new Set(beneficiaries.map(b => b.village).filter(Boolean))], [beneficiaries]);

  const todaysSchedule = batches.filter(b => b.start_date && b.end_date && b.start_date <= todayStr && b.end_date >= todayStr);
  const attendanceMarkedTodayBatchIds = new Set(attendanceRecords.filter(a => a.session_date === todayStr).map(a => a.batch_id));
  const attendancePendingToday = todaysSchedule.filter(b => !attendanceMarkedTodayBatchIds.has(b.batch_id));
  const assessmentDoneTodayBatchIds = new Set(assessmentRecords.filter(a => a.assessment_date === todayStr).map(a => a.batch_id));
  const certIssuedTodayBatchIds = new Set(certificates.filter(c => c.certificate_date === todayStr).map(c => c.batch_id));
  const registeredToday = beneficiaries.filter(b => b.registration_date === todayStr).length;

  // Today's checklist — real signals only, no fabricated quotas
  const CHECKLIST = [
    { key: "registration", label: "Registration", done: registeredToday > 0, applicable: true },
    { key: "training", label: "Training", done: todaysSchedule.length > 0, applicable: todaysSchedule.length > 0 },
    { key: "attendance", label: "Attendance", done: todaysSchedule.length > 0 && attendancePendingToday.length === 0, applicable: todaysSchedule.length > 0 },
    { key: "assessment", label: "Assessment", done: todaysSchedule.some(b => assessmentDoneTodayBatchIds.has(b.batch_id)), applicable: todaysSchedule.length > 0 },
    { key: "certificate", label: "Certificate", done: todaysSchedule.some(b => certIssuedTodayBatchIds.has(b.batch_id)), applicable: todaysSchedule.length > 0 },
  ];
  const applicableSteps = CHECKLIST.filter(c => c.applicable);
  const completionPct = applicableSteps.length > 0 ? Math.round((applicableSteps.filter(c => c.done).length / applicableSteps.length) * 100) : 0;

  // Smart "continue" routing — jumps to whatever's next incomplete
  const nextAction = attendancePendingToday.length > 0 ? { key: "attendance", label: "Mark Attendance" }
    : todaysSchedule.some(b => !assessmentDoneTodayBatchIds.has(b.batch_id)) && todaysSchedule.length > 0 ? { key: "assessment", label: "Conduct Assessment" }
    : todaysSchedule.some(b => !certIssuedTodayBatchIds.has(b.batch_id)) && todaysSchedule.length > 0 ? { key: "certificate", label: "Generate Certificates" }
    : { key: "beneficiary", label: "Register a Beneficiary" };

  const thisMonth = now.toISOString().slice(0, 7);
  const registeredThisMonth = beneficiaries.filter(b => (b.registration_date || "").slice(0, 7) === thisMonth).length;
  const trainingsThisMonth = batches.filter(b => (b.start_date || "").slice(0, 7) === thisMonth).length;
  const monthAttendance = attendanceRecords.filter(a => (a.session_date || "").slice(0, 7) === thisMonth);
  const attendancePctMonth = monthAttendance.length > 0 ? Math.round((monthAttendance.filter(a => a.status === "Present" || a.status === "Late").length / monthAttendance.length) * 100) : null;
  const certsThisMonth = certificates.filter(c => (c.certificate_date || "").slice(0, 7) === thisMonth).length;
  const aadhaarPending = beneficiaries.filter(b => b.aadhaar_verified !== "Yes").length;
  const pendingAssessments = todaysSchedule.filter(b => !assessmentDoneTodayBatchIds.has(b.batch_id)).length;
  const pendingCerts = assessmentMarks.filter(m => m.result === "Pass" && m.certificate_eligible === "Yes" && !certificates.some(c => c.assessment_id === m.assessment_id && c.beneficiary_id === m.beneficiary_id)).length;
  const scoreParts = [registeredThisMonth > 0 ? 100 : 0, attendancePctMonth ?? 0, trainingsThisMonth > 0 ? 100 : 0].filter(v => v !== null);
  const achievementPct = scoreParts.length ? Math.round(scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) : 0;

  const PENDING_TASKS = [
    ...(attendancePendingToday.length > 0 ? [{ label: `Mark attendance for ${attendancePendingToday.length} batch${attendancePendingToday.length > 1 ? "es" : ""} today`, icon: CheckCircle, color: "#F59E0B", urgent: true, onClick: () => onQuickAction("attendance") }] : []),
    ...(pendingAssessments > 0 ? [{ label: `Conduct assessment for ${pendingAssessments} today's batch${pendingAssessments > 1 ? "es" : ""}`, icon: ClipboardList, color: "#F59E0B", onClick: () => onQuickAction("assessment") }] : []),
    ...(pendingCerts > 0 ? [{ label: `Generate ${pendingCerts} pending certificate${pendingCerts > 1 ? "s" : ""}`, icon: Award, color: "#8B5CF6", onClick: () => onQuickAction("certificate") }] : []),
    ...(aadhaarPending > 0 ? [{ label: `Verify Aadhaar for ${aadhaarPending} beneficiar${aadhaarPending > 1 ? "ies" : "y"}`, icon: AlertCircle, color: "#EF4444", onClick: () => onQuickAction("beneficiaries-list") }] : []),
  ];

  const QUICK_ACTIONS = [
    { key: "beneficiary", label: "Register Beneficiary", emoji: "➕", icon: Users, color: "#2563EB" },
    { key: "training", label: "Continue Training", emoji: "🎓", icon: BookOpen, color: "#2563EB" },
    { key: "attendance", label: "Attendance", emoji: "✅", icon: CheckCircle, color: "#10B981" },
    { key: "assessment", label: "Assessment", emoji: "📝", icon: ClipboardList, color: "#F59E0B" },
    { key: "certificate", label: "Certificate", emoji: "🏆", icon: Award, color: "#8B5CF6" },
    { key: "beneficiaries-list", label: "Assigned Beneficiaries", emoji: "👥", icon: Users, color: "#2563EB" },
  ];

  const cardStyle = { background: "rgba(30,41,59,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" };
  const WORKFLOW_STEPS = [
    { key: "assigned", label: "Assigned" },
    { key: "start", label: "Start" },
    { key: "attendance", label: "Attendance" },
    { key: "assessment", label: "Assessment" },
    { key: "certificate", label: "Certificate" },
  ];

  return (
    <div className="-m-4 p-4 min-h-screen rounded-2xl relative" style={{ background: "linear-gradient(160deg,#0B1220 0%,#0E1A2E 55%,#0B1220 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div>
          <p className="text-[16px] font-bold text-white">{greeting}, {username || "there"} 👋</p>
          <p className="text-[10.5px] text-white/50 mt-0.5">{dateStr} · 🏘 {assignedVillages.length > 0 ? assignedVillages.slice(0, 2).join(", ") + (assignedVillages.length > 2 ? ` +${assignedVillages.length - 2}` : "") : "No village assigned"}</p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#2563EB,#1E3A8A)" }}>
          {(username || "?").charAt(0).toUpperCase()}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-white/50">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-60" />
          <p className="text-[13px]">Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Start My Day */}
          <div className="rounded-[22px] p-5 mb-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#10B981,#2563EB)" }}>
            <p className="text-[13px] font-bold tracking-wide">🎯 START MY DAY</p>
            <p className="text-[11px] text-white/80 mt-1 mb-3">{motivation}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {CHECKLIST.map(c => (
                <span key={c.key} className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: c.done ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)" }}>
                  {c.done ? "✅" : c.applicable ? "🟡" : "⬜"} {c.label}
                </span>
              ))}
            </div>
            <button onClick={() => onQuickAction(nextAction.key)}
              className="w-full rounded-xl py-3.5 text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ background: "white", color: "#059669" }}>
              ▶ {nextAction.label}
            </button>
          </div>

          {/* Today's Completion */}
          <div className="rounded-[20px] p-4 mb-4 flex items-center gap-4" style={cardStyle}>
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${completionPct * 0.974} 1000`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-white">{completionPct}%</div>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-white/70">Today's Completion</p>
              <p className="text-[11px] text-white/50 mt-0.5">{applicableSteps.filter(c => c.done).length} of {applicableSteps.length} steps done</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">Quick Actions</p>
              <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1 text-[10px] text-white/50">
                <RefreshCw size={11} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing..." : "Sync"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_ACTIONS.map(a => (
                <button key={a.key} onClick={() => onQuickAction(a.key)}
                  className="rounded-[18px] p-3.5 flex flex-col items-center gap-2 transition-all duration-200 active:scale-95"
                  style={cardStyle}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.color + "26" }}>
                    <a.icon size={16} style={{ color: a.color }} />
                  </div>
                  <span className="text-[10px] font-medium text-white text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Today's Trainings + workflow tracker */}
          <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-white/70 mb-3">Today's Trainings</p>
            {todaysSchedule.length === 0 ? (
              <p className="text-[12px] text-white/50 text-center py-4">No trainings scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {todaysSchedule.map(b => {
                  const participants = enrollments.filter(e => e.batch_id === b.batch_id).length;
                  const attDone = attendanceMarkedTodayBatchIds.has(b.batch_id);
                  const asmDone = assessmentDoneTodayBatchIds.has(b.batch_id);
                  const certDone = certIssuedTodayBatchIds.has(b.batch_id);
                  const stepDone = [true, true, attDone, asmDone, certDone]; // assigned+start always true for an ongoing batch
                  return (
                    <div key={b.batch_id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[12.5px] font-semibold text-white truncate">{b.training_name || b.training_type} · {b.venue}</p>
                        <button onClick={() => onQuickAction("attendance")} className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: "#2563EB" }}>Continue</button>
                      </div>
                      <p className="text-[10px] text-white/50 mb-2">{PROGRAM_MAP[b.program]?.short || b.program} · {participants} participants</p>
                      <div className="flex items-center">
                        {WORKFLOW_STEPS.map((s, i) => (
                          <React.Fragment key={s.key}>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: stepDone[i] ? "#10B981" : i === stepDone.findIndex(d => !d) ? "#2563EB" : "rgba(255,255,255,0.1)", color: stepDone[i] || i === stepDone.findIndex(d => !d) ? "#fff" : "rgba(255,255,255,0.4)" }}>
                                {stepDone[i] ? "✓" : i + 1}
                              </div>
                              <span className="text-[7.5px] text-white/40">{s.label}</span>
                            </div>
                            {i < WORKFLOW_STEPS.length - 1 && <div className="flex-1 h-0.5 mb-3" style={{ background: stepDone[i] ? "#10B981" : "rgba(255,255,255,0.1)" }} />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Beneficiaries */}
          <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-white/70">Assigned Beneficiaries</p>
              <button onClick={() => onQuickAction("beneficiaries-list")} className="text-[11px] font-semibold text-[#60A5FA]">View All →</button>
            </div>
            <p className="text-[26px] font-bold text-white leading-none mb-3">{beneficiaries.length}</p>
            <div className="space-y-1.5">
              {[...beneficiaries].sort((a, b) => (b.registration_date || "").localeCompare(a.registration_date || "")).slice(0, 4).map(b => (
                <button key={b.beneficiary_id} onClick={() => onViewBeneficiary && onViewBeneficiary(b)}
                  className="w-full flex items-center gap-2.5 py-1.5 px-1.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "#2563EB" }}>
                    {(b.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-white/90 truncate">{b.name || b.beneficiary_id}</p>
                    <p className="text-[9px] text-white/40 truncate">{b.beneficiary_id} · {PROGRAM_MAP[b.program]?.short || b.program}</p>
                  </div>
                  <span className="text-[9px] text-white/40 shrink-0">{b.village}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Villages */}
          {assignedVillages.length > 0 && (
            <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-white/70 mb-3">🏘 Assigned Villages</p>
              <div className="flex flex-wrap gap-2">
                {assignedVillages.map(v => (
                  <span key={v} className="text-[11px] font-medium text-white px-3 py-1.5 rounded-full" style={{ background: "rgba(37,99,235,0.2)" }}>{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          {PENDING_TASKS.length > 0 && (
            <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-white/70 mb-3">Pending Tasks</p>
              <div className="space-y-2">
                {PENDING_TASKS.map((t, i) => (
                  <button key={i} onClick={t.onClick} className="w-full flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/5" style={{ background: t.urgent ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)" }}>
                    <t.icon size={16} style={{ color: t.color }} className="shrink-0" />
                    <span className="text-[12px] text-white flex-1 text-left">{t.label}</span>
                    {t.urgent && <span className="text-[8.5px] font-bold text-[#EF4444] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)" }}>URGENT</span>}
                    <ChevronRight size={14} className="text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
            <p className="text-[12px] font-bold uppercase tracking-wide text-white/70 mb-3">Recent Activity</p>
            {myActivity.length === 0 ? (
              <p className="text-[12px] text-white/50 text-center py-4">No activity yet.</p>
            ) : (
              <div className="space-y-0">
                {myActivity.map((a, i) => (
                  <div key={a.id || i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#10B981" }} />
                      {i < myActivity.length - 1 && <div className="w-px flex-1 min-h-[20px]" style={{ background: "rgba(255,255,255,0.1)" }} />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <p className="text-[11.5px] text-white/85 leading-snug">{a.details || a.action}</p>
                      <p className="text-[9.5px] text-white/40 mt-0.5">{a.created_at ? new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Performance */}
          <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-white/70">Monthly Performance</p>
              <span className="text-[11px] font-bold text-[#10B981]">{achievementPct}% Achievement</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(37,99,235,0.15)" }}>
                <p className="text-[20px] font-bold text-[#60A5FA]">{registeredThisMonth}</p>
                <p className="text-[10px] text-white/60 mt-0.5">Registrations</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <p className="text-[20px] font-bold text-[#10B981]">{trainingsThisMonth}</p>
                <p className="text-[10px] text-white/60 mt-0.5">Trainings</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <p className="text-[20px] font-bold text-[#F59E0B]">{attendancePctMonth !== null ? attendancePctMonth + "%" : "—"}</p>
                <p className="text-[10px] text-white/60 mt-0.5">Attendance</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                <p className="text-[20px] font-bold text-[#8B5CF6]">{certsThisMonth}</p>
                <p className="text-[10px] text-white/60 mt-0.5">Certificates</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BeneficiaryList({ beneficiaries, isAdmin, isSuperAdmin, onEdit, onDelete, onExport, onPrint, onAddPrograms, onViewProfile, onPrintProfile, dynPrograms }) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regFrom, setRegFrom] = useState("");
  const [regTo, setRegTo] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

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

  // Hierarchical location — built from the real distinct values already on beneficiary
  // records (no separate master tables to keep in sync, no fake data). Each level's
  // options are derived only from records matching the level above it, so a Mandal/Village
  // list never shows anything unrelated to the selected District/Mandal.
  const stateOptions = useMemo(() => [...new Set(beneficiaries.map(b => b.state || "Andhra Pradesh"))].sort(), [beneficiaries]);
  const districtOptions = useMemo(() => {
    const scope = stateFilter === "all" ? beneficiaries : beneficiaries.filter(b => (b.state || "Andhra Pradesh") === stateFilter);
    return [...new Set(scope.map(b => b.district).filter(Boolean))].sort();
  }, [beneficiaries, stateFilter]);
  const mandalOptions = useMemo(() => {
    if (districtFilter === "all") return [];
    return [...new Set(beneficiaries.filter(b => b.district === districtFilter).map(b => b.mandal).filter(Boolean))].sort();
  }, [beneficiaries, districtFilter]);
  const villageOptions = useMemo(() => {
    let scope = beneficiaries;
    if (districtFilter !== "all") scope = scope.filter(b => b.district === districtFilter);
    if (mandalFilter !== "all") scope = scope.filter(b => b.mandal === mandalFilter);
    return [...new Set(scope.map(b => b.village).filter(Boolean))].sort();
  }, [beneficiaries, districtFilter, mandalFilter]);

  // Cascade resets: changing a parent level clears the now-stale child selections.
  const onStateChange = (v) => { setStateFilter(v); setDistrictFilter("all"); setMandalFilter("all"); setVillageFilter("all"); };
  const onDistrictChange = (v) => { setDistrictFilter(v); setMandalFilter("all"); setVillageFilter("all"); };
  const onMandalChange = (v) => { setMandalFilter(v); setVillageFilter("all"); };

  const ageGroups = [["Below 18", 0, 17], ["18-25", 18, 25], ["26-35", 26, 35], ["36-45", 36, 45], ["46-60", 46, 60], ["60+", 61, 999]];
  const inAgeGroup = (age, key) => {
    const g = ageGroups.find(g => g[0] === key);
    return g && age >= g[1] && age <= g[2];
  };

  const filtered = useMemo(() => {
    let r = beneficiaries;
    if (programFilter !== "all") r = r.filter(b => b.program === programFilter);
    if (statusFilter !== "all") r = r.filter(b => b.status === statusFilter);
    if (workerFilter !== "all") r = r.filter(b => b.field_worker_name === workerFilter);
    if (stateFilter !== "all") r = r.filter(b => (b.state || "Andhra Pradesh") === stateFilter);
    if (districtFilter !== "all") r = r.filter(b => b.district === districtFilter);
    if (mandalFilter !== "all") r = r.filter(b => b.mandal === mandalFilter);
    if (villageFilter !== "all") r = r.filter(b => b.village === villageFilter);
    if (genderFilter !== "all") r = r.filter(b => b.gender === genderFilter);
    if (ageGroupFilter !== "all") r = r.filter(b => inAgeGroup(Number(b.age), ageGroupFilter));
    if (categoryFilter !== "all") r = r.filter(b => b.category === categoryFilter);
    if (regFrom) r = r.filter(b => (b.registration_date || "") >= regFrom);
    if (regTo) r = r.filter(b => (b.registration_date || "") <= regTo);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(b => b.name?.toLowerCase().includes(q) || b.beneficiary_id?.toLowerCase().includes(q) || b.phone?.includes(q));
    }
    return [...r].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [beneficiaries, query, programFilter, statusFilter, workerFilter, stateFilter, districtFilter, mandalFilter, villageFilter, genderFilter, ageGroupFilter, categoryFilter, regFrom, regTo]);

  const clearAllFilters = () => {
    setQuery(""); setProgramFilter("all"); setStatusFilter("all"); setWorkerFilter("all");
    setStateFilter("all"); setDistrictFilter("all"); setMandalFilter("all"); setVillageFilter("all");
    setGenderFilter("all"); setAgeGroupFilter("all"); setCategoryFilter("all"); setRegFrom(""); setRegTo("");
  };

  // Dynamic summary — always reflects whatever filters are currently applied.
  const summary = useMemo(() => ({
    total: filtered.length,
    male: filtered.filter(b => b.gender === "Male").length,
    female: filtered.filter(b => b.gender === "Female").length,
    other: filtered.filter(b => b.gender === "Other").length,
    active: filtered.filter(b => b.status !== "Dropped" && b.status !== "Archived").length,
    inactive: filtered.filter(b => b.status === "Dropped" || b.status === "Archived").length,
  }), [filtered]);

  useEffect(() => { setPage(1); }, [query, programFilter, statusFilter, workerFilter, stateFilter, districtFilter, mandalFilter, villageFilter, genderFilter, ageGroupFilter, categoryFilter, regFrom, regTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3), [totalPages, page]);

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

      {/* Dynamic summary — updates with whatever filters are applied */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {[["Total", summary.total, "#1E3A8A"], ["Male", summary.male, "#2563EB"], ["Female", summary.female, "#DB2777"],
          ["Other", summary.other, "#7C3AED"], ["Active", summary.active, "#16A34A"], ["Inactive", summary.inactive, "#6B7280"]].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center">
            <p className="text-[16px] font-bold" style={{ color: c }}>{v}</p>
            <p className="text-[9.5px] text-[#6B7280]">{l}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, ID, or mobile number..." className={inputCls + " pl-9 text-[12.5px]"} />
      </div>

      <div className="flex gap-3 mb-3 flex-wrap">
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
        <button onClick={() => setShowMoreFilters(s => !s)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#1E3A8A]">
          <Filter size={13} /> {showMoreFilters ? "Hide" : "More"} Filters
        </button>
      </div>

      {showMoreFilters && (
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3.5 mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Location (State → District → Mandal → Village)</p>
          <div className="flex gap-2 flex-wrap mb-3">
            <select value={stateFilter} onChange={e => onStateChange(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All States</option>
              {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={districtFilter} onChange={e => onDistrictChange(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={mandalFilter} onChange={e => onMandalChange(e.target.value)} disabled={districtFilter === "all"} className={selectCls + " w-auto text-[12px] disabled:opacity-50"}>
              <option value="all">{districtFilter === "all" ? "Select District first" : "All Mandals"}</option>
              {mandalOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Villages</option>
              {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Other Filters</p>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Genders</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={ageGroupFilter} onChange={e => setAgeGroupFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Ages</option>
              {ageGroups.map(g => <option key={g[0]} value={g[0]}>{g[0]}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="text-[11px] text-[#6B7280]">Registered</label>
            <input type="date" value={regFrom} onChange={e => setRegFrom(e.target.value)} className={inputCls + " w-auto text-[12px]"} />
            <span className="text-[11px] text-[#9CA3AF]">to</span>
            <input type="date" value={regTo} onChange={e => setRegTo(e.target.value)} className={inputCls + " w-auto text-[12px]"} />
            <button onClick={clearAllFilters} className="text-[11.5px] font-semibold text-[#DC2626] px-2 py-1.5">Clear Filters</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ClipboardList size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No beneficiaries found for the selected filters.</p>
          <button onClick={clearAllFilters} className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold text-white" style={{ background: "#1E3A8A" }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map(b => {
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
                      {(b.village || b.mandal || b.district) && (
                        <div className="flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          <span>{[b.village, b.mandal, b.district].filter(Boolean).join(", ")}</span>
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

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
          <p className="text-[11.5px] text-[#6B7280]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>← Previous</button>
            {pageNumbers.map(n => (
              <button key={n} onClick={() => setPage(n)}
                className="rounded-lg text-[12px] font-semibold transition-colors"
                style={{ minWidth: 36, minHeight: 40, background: n === page ? "#1E3A8A" : "transparent", color: n === page ? "#fff" : "#374151" }}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>Next →</button>
          </div>
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
/* ============================================================
   TRAINING SESSION SCREEN — blue theme, distinct from Attendance.
   Purpose: conduct/manage today's training session before handing
   off to attendance marking. Start/Pause/End are session-flow UI
   state only (not persisted) — batch.status itself is unchanged,
   since editing that remains an admin action elsewhere.
   ============================================================ */
function TrainingSessionScreen({ batch, enrollments, attendanceRecords, onContinueToAttendance, onGoToAssessment, onGoToCertificates, onClose }) {
  // "running"/"ended" are local UI state for THIS visit only — they reset if the screen is reopened.
  // Whether "today's session" is already done is derived from real attendance_records (session_date),
  // not from any local flag, so it survives refresh/navigation and resets naturally each new calendar day.
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [myAssessments, setMyAssessments] = useState([]);
  const p = PROGRAM_MAP[batch.program] || PROGRAMS[0];
  const myEnrollments = (enrollments || []).filter(e => e.batch_id === batch.batch_id);
  const participants = myEnrollments.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysSessionDone = (attendanceRecords || []).some(r => r.batch_id === batch.batch_id && r.session_date === todayStr);
  const isFinalDay = batch.end_date === todayStr;

  // Last two days of the batch (end_date and the day before) are reserved for assessments, not regular sessions.
  const daysUntilEnd = batch.end_date ? Math.floor((new Date(batch.end_date) - new Date(todayStr)) / 86400000) : null;
  const isAssessmentPhase = daysUntilEnd !== null && daysUntilEnd <= 1;

  useEffect(() => {
    if (!isAssessmentPhase) return;
    (async () => {
      const { data } = await supabase.from("assessment_records").select("*").eq("batch_id", batch.batch_id);
      setMyAssessments(data || []);
    })();
  }, [isAssessmentPhase, batch.batch_id]);
  const assessmentCompleted = myAssessments.some(a => a.status === "Completed");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running, startedAt]);

  const timerLabel = (() => {
    const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  })();

  const durationLabel = (() => {
    if (!batch.start_date || !batch.end_date) return "—";
    const days = Math.round((new Date(batch.end_date) - new Date(batch.start_date)) / 86400000);
    if (days <= 0) return "1 day";
    if (days < 14) return `${days} days`;
    return `${Math.round(days / 7)} weeks`;
  })();

  const INFO = [
    ["Program", p.label],
    ["Batch ID", batch.batch_id?.slice(0, 8) || "—"],
    ["Village", batch.venue || "—"],
    ["Venue", batch.venue || "—"],
    ["Trainer", batch.trainer_name || "—"],
    ["Date", `${batch.start_date || "—"} → ${batch.end_date || "—"}`],
    ["Participants", participants],
    ["Duration", durationLabel],
    ["Session Status", batch.status || "—"],
  ];

  return (
    <div className="max-w-[560px] mx-auto">
      {/* Header */}
      <div className="rounded-[20px] p-4 mb-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#1E3A8A,#2563EB)" }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
          <p className="text-[10px] text-white/70">Training / Session</p>
        </div>
        <p className="text-[17px] font-bold">🎓 {batch.training_name || batch.training_type}</p>
        <p className="text-[11px] text-white/80 mt-0.5">Conduct and manage today's training session</p>
      </div>

      {/* Batch info card */}
      <div className="rounded-[20px] p-4 mb-4" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", border: "1px solid #E5E7EB" }}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {INFO.map(([label, val]) => (
            <div key={label}>
              <p className="text-[9.5px] text-[#9CA3AF] uppercase tracking-wide">{label}</p>
              <p className="text-[12.5px] font-semibold text-[#111827] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowParticipants(s => !s)} className="w-full text-center text-[11.5px] font-semibold text-[#2563EB] mt-3 pt-3 border-t border-[#F3F4F6]">
          {showParticipants ? "Hide Participants ▲" : `View Participants (${participants}) ▼`}
        </button>
        {showParticipants && (
          <div className="mt-2 space-y-1.5 max-h-[180px] overflow-y-auto">
            {myEnrollments.length === 0 ? (
              <p className="text-[11.5px] text-[#9CA3AF] text-center py-2">No one enrolled yet.</p>
            ) : myEnrollments.map(e => (
              <div key={e.enrollment_id} className="flex items-center gap-2 py-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: p.color }}>
                  {(e.beneficiary_name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-[11.5px] text-[#374151]">{e.beneficiary_name || e.beneficiary_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {batch.status === "Completed" ? (
        <div className="rounded-[20px] p-6 mb-4 text-center" style={{ background: "rgba(243,244,246,0.9)", border: "1px solid #E5E7EB" }}>
          <CheckCircle size={36} className="mx-auto mb-2 text-[#6B7280]" />
          <p className="text-[15px] font-bold text-[#374151]">Training Already Completed</p>
          <p className="text-[12px] text-[#6B7280] mt-1 mb-4">This batch has finished. Training cannot be started or re-run.</p>
          <button onClick={onContinueToAttendance}
            className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(90deg,#16A34A,#22C55E)", boxShadow: "0 8px 20px -6px rgba(22,163,74,0.45)" }}>
            ✓ Mark Attendance
          </button>
        </div>
      ) : isAssessmentPhase ? (
        <div className="rounded-[20px] p-4 mb-4" style={{ background: "rgba(237,233,254,0.85)", border: "1px solid #C4B5FD" }}>
          <div className="text-center mb-3">
            <ClipboardList size={30} className="mx-auto mb-2 text-[#7C3AED]" />
            <p className="text-[15px] font-bold text-[#6D28D9]">📝 Assessment Phase</p>
            <p className="text-[11.5px] text-[#5B21B6] mt-1">
              {isFinalDay ? "This is the batch's final day — reserved for assessment." : "These last 2 days are reserved for assessment, not regular sessions."}
            </p>
          </div>
          <div className="space-y-2">
            <button onClick={onGoToAssessment}
              className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,#7C3AED,#A78BFA)", boxShadow: "0 8px 20px -6px rgba(124,58,237,0.4)" }}>
              📝 Go to Assessment
            </button>
            <button onClick={onContinueToAttendance}
              className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,#16A34A,#22C55E)" }}>
              ✓ Mark Attendance
            </button>
            {isFinalDay && assessmentCompleted && (
              <button onClick={onGoToCertificates}
                className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white transition active:scale-[0.98]"
                style={{ background: "linear-gradient(90deg,#F59E0B,#FBBF24)" }}>
                🏆 Generate Certificates
              </button>
            )}
          </div>
          {isFinalDay && !assessmentCompleted && (
            <p className="text-[10.5px] text-[#7C3AED] text-center mt-3">Complete today's assessment to unlock Certificate Generation.</p>
          )}
        </div>
      ) : (todaysSessionDone && !running) || ended ? (
        <div className="rounded-[20px] p-6 mb-4 text-center" style={{ background: "rgba(220,252,231,0.9)", border: "1px solid #86EFAC" }}>
          <CheckCircle size={36} className="mx-auto mb-2 text-[#16A34A]" />
          <p className="text-[15px] font-bold text-[#16A34A]">Today's Class Completed</p>
          <p className="text-[12px] text-[#15803D] mt-1 mb-4">
            {isFinalDay
              ? "This was the batch's final day. Once assessment and certificates are done, an Admin will mark the batch Completed."
              : "Great work! \"Start Today's Session\" will be available again tomorrow for this batch."}
          </p>
          <button onClick={onContinueToAttendance}
            className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition active:scale-[0.98]"
            style={{ background: "linear-gradient(90deg,#16A34A,#22C55E)", boxShadow: "0 8px 20px -6px rgba(22,163,74,0.45)" }}>
            ✓ Review Today's Attendance
          </button>
        </div>
      ) : (
        <div className="rounded-[20px] p-4 mb-4 text-center" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", border: "1px solid #E5E7EB" }}>
          {running ? (
            <>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280] mb-1">Session Timer</p>
              <p className="text-[30px] font-black text-[#2563EB] mb-3 tabular-nums">{timerLabel}</p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] mb-1">Session Status</p>
              <p className="text-[15px] font-bold mb-4 text-[#6B7280]">⚪ Today's Session Not Started</p>
            </>
          )}

          {!running && (
            <button onClick={() => { setRunning(true); setStartedAt(Date.now()); setElapsed(0); }}
              className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white transition active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,#1E3A8A,#2563EB)", boxShadow: "0 8px 20px -6px rgba(37,99,235,0.45)" }}>
              ▶ Start Today's Session
            </button>
          )}
          {running && (
            <button onClick={() => setEnded(true)}
              className="w-full rounded-xl py-3.5 text-[13.5px] font-bold text-white transition active:scale-[0.98]" style={{ background: "#16A34A" }}>
              🏁 End Today's Session
            </button>
          )}
        </div>
      )}

      {batch.status !== "Completed" && !isAssessmentPhase && !todaysSessionDone && !ended && (
        <button onClick={onContinueToAttendance} className="w-full text-center text-[12px] font-semibold text-[#2563EB] py-2">
          Skip to Attendance →
        </button>
      )}
    </div>
  );
}


function AttendanceScreen({ batch, batches, onSwitchBatch, enrollments, attendanceRecords, onSaveDailyAttendance, onCancelEnrollment, onClose, currentUser, isAdmin }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const myBatches = useMemo(() => (batches || []).filter(b => isAdmin || b.assigned_field_worker === currentUser?.username), [batches, isAdmin, currentUser]);
  const [query, setQuery] = useState("");
  const batchEnrollments = enrollments.filter(e =>
    e.batch_id === batch.batch_id &&
    (e.enrollment_status || "Active") !== "Cancelled" &&
    (isAdmin || !e.enrolled_by || e.enrolled_by === currentUser?.username)
  );
  const visibleEnrollments = query.trim()
    ? batchEnrollments.filter(e => (e.beneficiary_name || "").toLowerCase().includes(query.toLowerCase()) || (e.beneficiary_id || "").toLowerCase().includes(query.toLowerCase()))
    : batchEnrollments;
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

  // Re-initialize marks whenever the session date or batch changes
  useEffect(() => {
    const init = {};
    batchEnrollments.forEach(e => {
      const existing = batchRecords.find(r => r.beneficiary_id === e.beneficiary_id && r.session_date === sessionDate);
      init[e.beneficiary_id] = existing?.status || "Present";
    });
    setMarks(init);
    // eslint-disable-next-line
  }, [sessionDate, batch.batch_id]);

  const statusOptions = ["Present", "Absent", "Late", "Leave"];
  const statusColors = { Present: "#16A34A", Absent: "#DC2626", Late: "#F97316", Leave: "#8B5CF6" };
  const statusIcons = { Present: "🟢", Absent: "🔴", Late: "🟡", Leave: "🟣" };

  const markCounts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
    Object.values(marks).forEach(v => { if (c[v] !== undefined) c[v]++; });
    return c;
  }, [marks]);

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
      <div className="rounded-[20px] p-4 mb-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#15803D,#16A34A)" }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
          <p className="text-[10px] text-white/70">Training / Attendance</p>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[17px] font-bold">✅ {batch.training_name}</h2>
            <p className="text-[11px] text-white/80 mt-0.5">Record who attended today's session.</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-black">{totalSessions}</p>
            <p className="text-[9.5px] text-white/75">Total Sessions</p>
          </div>
        </div>
      </div>

      {/* Batch selector */}
      {myBatches.length > 1 && (
        <div className="mb-3">
          <label className="text-[10.5px] font-semibold text-[#6B7280] block mb-1">BATCH</label>
          <select value={batch.batch_id} onChange={e => { const b = myBatches.find(x => x.batch_id === e.target.value); if (b) onSwitchBatch(b); }}
            className={selectCls + " text-[13px]"}>
            {myBatches.map(b => <option key={b.batch_id} value={b.batch_id}>{b.training_name} · {b.venue}</option>)}
          </select>
        </div>
      )}

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

      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search beneficiary..." className={inputCls + " pl-9 text-[12.5px]"} />
      </div>

      {/* Live counter summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {statusOptions.map(st => (
          <div key={st} className="rounded-xl p-2.5 text-center" style={{ background: statusColors[st] + "15" }}>
            <p className="text-[16px] font-bold" style={{ color: statusColors[st] }}>{markCounts[st]}</p>
            <p className="text-[9px] font-medium" style={{ color: statusColors[st] }}>{st}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden shadow-sm">
        {visibleEnrollments.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <Users size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]">{query ? "No matching beneficiaries." : "No beneficiaries enrolled yet."}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] max-h-[55vh] overflow-y-auto">
            {visibleEnrollments.map(e => {
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
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {statusOptions.map(st => {
                      const selected = marks[e.beneficiary_id] === st;
                      return (
                        <button key={st} onClick={() => setMarks(m => ({ ...m, [e.beneficiary_id]: st }))}
                          className="py-2.5 rounded-xl text-[10.5px] font-bold transition-all active:scale-95"
                          style={selected
                            ? { background: statusColors[st], color: "white", boxShadow: `0 4px 12px -2px ${statusColors[st]}66` }
                            : { background: "#F3F4F6", color: "#6B7280" }}>
                          <span className="block text-[14px] mb-0.5">{statusIcons[st]}</span>{st}
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
            style={{ background: saving ? "#9CA3AF" : "linear-gradient(90deg,#15803D,#16A34A)" }}>
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
                        {batch.status !== "Completed" && batch.status !== "Cancelled" && (
                          <button onClick={() => onAttendance(batch)} title={batch.status === "Ongoing" ? "Continue Training" : "Start Training"}
                            className="px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                            style={{ background: "#2563EB" }}>
                            {batch.status === "Ongoing" ? "▶ Continue" : "▶ Start"}
                          </button>
                        )}
                        {batch.status === "Completed" && (
                          <button onClick={() => onAttendance(batch)} title="Mark Attendance"
                            className="px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-white"
                            style={{ background: "#16A34A" }}>
                            ✓ Attendance
                          </button>
                        )}
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
  const summaryFor = (e) => {
    if (e.outcome_type && e.details) {
      const fields = OUTCOME_FIELDS[e.outcome_type] || [];
      return fields.map(f => e.details[f.key]).filter(Boolean).slice(0, 3).join(" · ");
    }
    // Legacy records saved before this module existed
    return [e.job_role, e.employer, e.monthly_income ? `₹${e.monthly_income}/mo` : null].filter(Boolean).join(" · ");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Livelihood &amp; Outcomes</h2>
          <p className="text-[12px] text-[#6B7280]">{employment.length} outcome records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-bold" style={{ background: "#16A34A", color: "#fff" }}>
            <Plus size={14} /> Add Outcome
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
        <div className="text-center py-12 text-[#9CA3AF]"><Briefcase size={28} className="mx-auto mb-2 opacity-40" /><p className="text-[13px]">No livelihood outcomes recorded yet.</p></div>
      ) : (
        <div className="space-y-2.5">
          {employment.map(e => (
            <div key={e.job_id} className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3" style={{ borderLeft: "4px solid #F97316" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] text-[#111827]">{getBeneficiaryName(e.beneficiary_id)}</span>
                  <Badge label={OUTCOME_TYPE_LABELS[e.outcome_type] || e.employment_type || "Legacy Record"} color="#F97316" tint="#FFF7ED" />
                  <Badge label={e.status} color={e.status === "Active" ? "#16A34A" : "#888"} tint={e.status === "Active" ? "#DCFCE7" : "#F5F5F5"} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#6B7280] flex-wrap">
                  <span className="font-mono">{e.beneficiary_id}</span>
                  <span>•</span><span>{summaryFor(e) || "—"}</span>
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
function BeneficiaryProfile({ beneficiary: b, onClose, beneficiaries, isAdmin, isSuperAdmin, enrollments, currentUser, showToast }) {
  const p = PROGRAM_MAP[b.program] || PROGRAMS[0];
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    if (!b.photo_path) { setPhotoUrl(null); return; }
    (async () => {
      const { data } = await supabase.storage.from("beneficiary-documents").createSignedUrl(b.photo_path, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    })();
  }, [b.photo_path]);

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
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[24px] font-black text-white shrink-0 overflow-hidden"
            style={{ background: p.color }}>
            {photoUrl ? <img src={photoUrl} alt={b.name} className="w-full h-full object-cover" /> : (b.name || "?").charAt(0).toUpperCase()}
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

      {/* Documents — shared DMS, reused as-is */}
      <div className="mb-4">
        <h4 className="text-[13px] font-bold text-[#111827] mb-2 px-1">📁 Documents</h4>
        <DocumentRepository entityType="beneficiary" entityId={b.beneficiary_id} currentUser={currentUser} showToast={showToast} />
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
    { key: "roles", label: "Roles & Permissions", desc: "RBAC roles, permission matrix (read-only, Phase 2)", icon: Lock, color: "#0EA5E9", tint: "#F0F9FF", ready: true },
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
  if (subView === "roles") {
    return <RoleManagementScreen currentUser={currentUser} onBack={() => setSubView(null)} />;
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

function RoleManagementScreen({ currentUser, onBack }) {
  const rbac = useRBAC(currentUser);
  const [tab, setTab] = useState("account"); // account | roles | permissions
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const usersPerRole = useMemo(() => {
    const m = {};
    rbac.userRoles.forEach(ur => { m[ur.role] = (m[ur.role] || 0) + 1; });
    return m;
  }, [rbac.userRoles]);

  const permsPerRole = useMemo(() => {
    const m = {};
    rbac.rolePermissions.forEach(rp => { if (rp.allowed) m[rp.role_id] = (m[rp.role_id] || 0) + 1; });
    return m;
  }, [rbac.rolePermissions]);

  const moduleOptions = useMemo(() => [...new Set(rbac.permissions.map(p => p.module))], [rbac.permissions]);
  const filteredPermissions = useMemo(() => rbac.permissions.filter(p =>
    (moduleFilter === "all" || p.module === moduleFilter) &&
    (!query.trim() || p.module.toLowerCase().includes(query.toLowerCase()) || p.action.toLowerCase().includes(query.toLowerCase()))
  ), [rbac.permissions, moduleFilter, query]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">Roles & Permissions</h2>
          <p className="text-[12px] text-[#6B7280]">Read-only · RBAC Phase 2 — infrastructure integration, no enforcement yet</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {[["account", "My Account"], ["roles", "Role Management"], ["permissions", "Permissions"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors"
            style={tab === key ? { background: "#1E3A8A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
            {label}
          </button>
        ))}
      </div>

      {rbac.loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : (
        <>
          {tab === "account" && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <SectionHeader title="My Account" color="#1E3A8A" />
              <div className="grid grid-cols-2 gap-y-3">
                <InfoRow label="Current Role" value={rbac.currentRole?.role_name || currentUser?.role} />
                <InfoRow label="Account Status" value={rbac.currentRole?.status || "Active"} />
                <InfoRow label="Assigned State" value={rbac.myUserRoleRow?.assigned_state} />
                <InfoRow label="Assigned District" value={rbac.myUserRoleRow?.assigned_district} />
                <InfoRow label="Assigned Partner" value={rbac.myUserRoleRow?.assigned_partner_id} />
              </div>
              <p className="text-[10.5px] text-[#9CA3AF] mt-3">Scope assignment (state/district/partner) will be editable in a future phase.</p>
            </div>
          )}

          {tab === "roles" && (
            <div className="space-y-2">
              {rbac.roles.length === 0 ? (
                <div className="text-center py-10 text-[#9CA3AF]"><p className="text-[12.5px]">No roles found.</p></div>
              ) : rbac.roles.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{r.role_name}</p>
                    <p className="text-[10.5px] text-[#6B7280] mt-0.5">{r.description}</p>
                    <p className="text-[10.5px] text-[#6B7280] mt-1">{usersPerRole[r.role_key] || 0} users · {permsPerRole[r.id] || 0} permissions</p>
                  </div>
                  <Badge label={r.status} color={r.status === "Active" ? "#16A34A" : "#9CA3AF"} tint={r.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
                </div>
              ))}
            </div>
          )}

          {tab === "permissions" && (
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search module or action…" className={inputCls + " pl-8 text-[12px]"} />
                </div>
                <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
                  <option value="all">All Modules</option>
                  {moduleOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {filteredPermissions.length === 0 ? (
                <div className="text-center py-10 text-[#9CA3AF]"><p className="text-[12.5px]">No permissions found.</p></div>
              ) : (
                <div className="space-y-1.5">
                  {filteredPermissions.map(p => (
                    <div key={p.id} className="bg-white rounded-lg border border-[#E5E7EB] px-3.5 py-2.5 flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-[#111827]">{p.module}</span>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] uppercase">{p.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
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
  const css = "@page{margin:20px;} body{font-family:Arial,sans-serif;font-size:11px;color:#111827;} " +
    ".print-header{display:flex;gap:10px;align-items:center;border-bottom:2px solid #1E3A8A;padding:6px 0 10px 0;} " +
    ".print-header img{width:38px;height:38px;} .print-header .org{font-weight:bold;color:#1E3A8A;font-size:15px;} " +
    "table{width:100%;border-collapse:collapse;} .hdrcell{border:none !important;padding:0 !important;background:#fff !important;} " +
    "th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;} th{background:#F3F4F6;} thead{display:table-header-group;}";
  const header = "<div class='print-header'><img src='" + logoUrl + "'/><div><div class='org'>TAPASVI Society</div><div style='font-size:10px;color:#666;'>Assessment Result Sheet</div></div></div>";
  const meta = "<p><b>Batch:</b> " + (assessment.batch_label || "") + " &nbsp; <b>Course:</b> " + (assessment.course || "") +
    " &nbsp; <b>Trainer:</b> " + (assessment.trainer || "") + "</p><p><b>Date:</b> " + (assessment.assessment_date || "") +
    " &nbsp; <b>Type:</b> " + (assessment.assessment_type || "") + " &nbsp; <b>Max Marks:</b> " + assessment.max_marks +
    " &nbsp; <b>Pass Marks:</b> " + assessment.pass_marks + "</p>";
  const orgHeaderRow = "<tr><td class='hdrcell' colspan='9'>" + header + meta + "</td></tr>";
  w.document.write("<!DOCTYPE html><html><head><title>Assessment Result Sheet</title><style>" + css + "</style></head><body>" +
    "<table><thead>" + orgHeaderRow + thead + "</thead><tbody>" + tbody + "</tbody></table></body></html>");
  w.document.close(); w.focus();
  setTimeout(() => { w.print(); }, 600);
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
    if (!isAdmin) { showToast("Only Admin can print certificates. Please visit the NGO office.", "error"); return; }
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
    return <CertificatePreview cert={preview} settings={settings} orgSettings={orgSettings} isAdmin={isAdmin} onPrint={() => doPrint(preview, false)} onClose={() => setPreview(null)} onVerify={() => { setPreview(null); setTab("verify"); }} />;
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
                <button onClick={() => generateCertificate(row)} disabled={!row.eligible}
                  className="w-full mt-3 rounded-lg py-1.5 text-[11.5px] font-medium text-white disabled:opacity-40" style={{ background: row.eligible ? "#16A34A" : "#9CA3AF" }}>
                  Generate Certificate
                </button>
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
                    <button onClick={() => setPreview(c)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">View</button>
                    {isAdmin && (
                      <button onClick={() => doPrint(c, !!c.printed_at)} className="flex-1 rounded-lg py-1.5 text-[11.5px] font-medium text-white" style={{ background: "#1E3A8A" }}>
                        {c.printed_at ? "Reprint" : "Print"}
                      </button>
                    )}
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

function CertificatePreview({ cert, settings, orgSettings, isAdmin, onPrint, onClose, onVerify }) {
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
            {isAdmin ? (
              <>
                <button onClick={onPrint} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition active:scale-[0.98]" style={{ background: `linear-gradient(90deg,${primary},#16A34A)` }}>
                  <Download size={15} /> Download PDF
                </button>
                <button onClick={onPrint} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] py-3 text-[13px] font-semibold text-[#374151]">
                  <Printer size={15} /> Print
                </button>
              </>
            ) : (
              <p className="text-[11px] text-[#9CA3AF] text-center py-1">Certificates are printed only at the NGO office.</p>
            )}
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
  const css = "@page{margin:20px;} body{font-family:Arial,sans-serif;font-size:11px;color:#111827;} " +
    ".hdr{padding:6px 0 10px 0;border-bottom:2px solid #1E3A8A;} .hdr b{color:#1E3A8A;font-size:15px;}" +
    "table{width:100%;border-collapse:collapse;} .hdrcell{border:none !important;padding:0 !important;background:#fff !important;} " +
    "th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;} th{background:#F3F4F6;} thead{display:table-header-group;}";
  const orgHeaderRow = "<tr><td class='hdrcell' colspan='" + columns.length + "'><div class='hdr'><b>TAPASVI Society</b><div style='font-size:11px;color:#666;'>" + title + "</div></div></td></tr>";
  w.document.write("<!DOCTYPE html><html><head><title>" + title + "</title><style>" + css + "</style></head><body>" +
    "<table><thead>" + orgHeaderRow + thead + "</thead><tbody>" + tbody + "</tbody></table></body></html>");
  w.document.close(); w.focus();
  setTimeout(() => { w.print(); }, 600);
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
  const [partners, setPartners] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [section, setSection] = useState("beneficiary");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [fwFilter, setFwFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, bt, en, ar, asr, asm, ct, em, vl, us, pt, dc] = await Promise.all([
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
        supabase.from("partners").select("*"),
        supabase.from("documents").select("*").eq("status", "Active"),
      ]);
      setBeneficiaries(b.data || []); setBatches(bt.data || []); setEnrollments(en.data || []);
      setAttendanceRecords(ar.data || []); setAssessmentRecords(asr.data || []); setAssessmentMarks(asm.data || []);
      setCertificates(ct.data || []); setEmployment(em.data || []); setVillages(vl.data || []);
      setFieldWorkers((us.data || []).filter(u => u.role === "fieldworker"));
      setPartners(pt.data || []); setDocuments(dc.data || []);
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
  const stateOptions = useMemo(() => [...new Set(scopedBeneficiaries.map(b => b.state || "Andhra Pradesh"))].sort(), [scopedBeneficiaries]);
  const districtOptions = useMemo(() => {
    const scope = stateFilter === "all" ? scopedBeneficiaries : scopedBeneficiaries.filter(b => (b.state || "Andhra Pradesh") === stateFilter);
    return [...new Set(scope.map(b => b.district).filter(Boolean))].sort();
  }, [scopedBeneficiaries, stateFilter]);
  const mandalOptions = useMemo(() => districtFilter === "all" ? [] : [...new Set(scopedBeneficiaries.filter(b => b.district === districtFilter).map(b => b.mandal).filter(Boolean))].sort(), [scopedBeneficiaries, districtFilter]);
  const onStateChange = (v) => { setStateFilter(v); setDistrictFilter("all"); setMandalFilter("all"); };
  const onDistrictChange = (v) => { setDistrictFilter(v); setMandalFilter("all"); };

  const filteredBeneficiaries = useMemo(() => scopedBeneficiaries.filter(b =>
    (programFilter === "all" || b.program === programFilter) &&
    (villageFilter === "all" || b.village === villageFilter) &&
    (fwFilter === "all" || b.field_worker_name === fwFilter) &&
    (stateFilter === "all" || (b.state || "Andhra Pradesh") === stateFilter) &&
    (districtFilter === "all" || b.district === districtFilter) &&
    (mandalFilter === "all" || b.mandal === mandalFilter) &&
    (genderFilter === "all" || b.gender === genderFilter) &&
    (categoryFilter === "all" || b.category === categoryFilter) &&
    (!dateFrom || (b.registration_date || "") >= dateFrom) &&
    (!dateTo || (b.registration_date || "") <= dateTo)
  ), [scopedBeneficiaries, programFilter, villageFilter, fwFilter, stateFilter, districtFilter, mandalFilter, genderFilter, categoryFilter, dateFrom, dateTo]);

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
  const activeBeneficiaries = filteredBeneficiaries.filter(b => b.status !== "Dropped" && b.status !== "Archived").length;
  const inactiveBeneficiaries = totalBeneficiaries - activeBeneficiaries;
  const activePrograms = new Set(filteredBeneficiaries.map(b => b.program).filter(Boolean)).size;
  const activePartners = partners.filter(p => p.status === "Active").length;
  const totalTrainings = filteredBatches.length;
  const totalAssessments = filteredAssessmentRecords.length;
  const certsIssued = filteredCertificates.filter(c => c.status === "Active").length;
  const placements = filteredEmployment.filter(e => e.status === "Active").length;
  const livelihoodOutcomes = filteredEmployment.length;
  const totalVillages = new Set(filteredBeneficiaries.map(b => b.village).filter(Boolean)).size;
  const totalTrainers = new Set(filteredBatches.map(b => b.trainer_name).filter(Boolean)).size;
  const completionPct = totalTrainings > 0 ? Math.round(filteredBatches.filter(b => b.status === "Completed").length / totalTrainings * 100) : 0;
  const placementPct = totalBeneficiaries > 0 ? Math.round(placements / totalBeneficiaries * 100) : 0;
  const attendancePct = scopedAttendance.length > 0 ? Math.round(scopedAttendance.filter(a => a.status === "Present" || a.status === "Late").length / scopedAttendance.length * 100) : 0;
  const documentsUploaded = documents.length;

  const SUMMARY = [
    { label: "Total Beneficiaries", value: totalBeneficiaries, icon: Users, color: "#1E3A8A" },
    { label: "Active Beneficiaries", value: activeBeneficiaries, icon: CheckCircle, color: "#16A34A" },
    { label: "Inactive Beneficiaries", value: inactiveBeneficiaries, icon: XCircle, color: "#DC2626" },
    { label: "Active Programs", value: activePrograms, icon: BookOpen, color: "#7C3AED" },
    { label: "Active Partners", value: activePartners, icon: Building2, color: "#0EA5E9" },
    { label: "Training Batches", value: totalTrainings, icon: BookOpen, color: "#DB2777" },
    { label: "Attendance %", value: attendancePct + "%", icon: ClipboardList, color: "#F97316" },
    { label: "Assessments Completed", value: totalAssessments, icon: ClipboardList, color: "#F97316" },
    { label: "Certificates Issued", value: certsIssued, icon: Award, color: "#16A34A" },
    { label: "Livelihood Outcomes", value: livelihoodOutcomes, icon: Briefcase, color: "#0EA5E9" },
    { label: "Documents Uploaded", value: documentsUploaded, icon: FileSpreadsheet, color: "#7C3AED" },
    { label: "Total Villages", value: totalVillages, icon: MapPin, color: "#7C3AED" },
    { label: "Training Completion %", value: completionPct + "%", icon: CheckCircle, color: "#16A34A" },
  ];

  // Beneficiary breakdowns
  const programWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.program), [filteredBeneficiaries]);
  const villageWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.village), [filteredBeneficiaries]);
  const genderWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.gender), [filteredBeneficiaries]);
  const ageWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => ageBucket(b.age)), [filteredBeneficiaries]);
  const educationWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.education), [filteredBeneficiaries]);
  const skillWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.skill_interest), [filteredBeneficiaries]);
  const fwWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.field_worker_name), [filteredBeneficiaries]);
  const districtWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.district), [filteredBeneficiaries]);
  const categoryWise = useMemo(() => reportsGroupBy(filteredBeneficiaries, b => b.category), [filteredBeneficiaries]);

  // Top 10 lists
  const top10Programs = useMemo(() => [...programWise].sort((a, b) => b.count - a.count).slice(0, 10), [programWise]);
  const top10Partners = useMemo(() => {
    const counts = {};
    partners.forEach(p => { counts[p.partner_name] = (counts[p.partner_name] || 0) + 1; });
    return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [partners]);
  const top10Districts = useMemo(() => [...districtWise].sort((a, b) => b.count - a.count).slice(0, 10), [districtWise]);
  const top10Villages = useMemo(() => [...villageWise].sort((a, b) => b.count - a.count).slice(0, 10), [villageWise]);
  const newestRegistrations = useMemo(() => [...filteredBeneficiaries].sort((a, b) => (b.registration_date || "").localeCompare(a.registration_date || "")).slice(0, 10), [filteredBeneficiaries]);

  // Partner-wise Programs — how many program links each partner has (from Sprint 2A linking table)
  const [partnerProgramLinks, setPartnerProgramLinks] = useState([]);
  useEffect(() => { (async () => { const { data } = await supabase.from("partner_programs").select("*").eq("status", "Active"); setPartnerProgramLinks(data || []); })(); }, []);
  const partnerWisePrograms = useMemo(() => {
    const counts = {};
    partnerProgramLinks.forEach(l => {
      const partner = partners.find(p => p.id === l.partner_id);
      const name = partner?.partner_name || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [partnerProgramLinks, partners]);

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
    { key: "partner", label: "Partner" },
    { key: "livelihood", label: "Livelihood" },
    { key: "document", label: "Document" },
  ];

  // Partner breakdowns
  const filteredPartners = useMemo(() => partnerFilter === "all" ? partners : partners.filter(p => p.id === partnerFilter), [partners, partnerFilter]);
  const partnerTypeWise = useMemo(() => reportsGroupBy(filteredPartners, p => PARTNER_TYPE_MAP[p.partner_type]?.label || p.partner_type), [filteredPartners]);
  const partnerStatusWise = useMemo(() => reportsGroupBy(filteredPartners, p => p.status), [filteredPartners]);
  const partnerDistrictWise = useMemo(() => reportsGroupBy(filteredPartners, p => p.districts || "—"), [filteredPartners]);

  // Livelihood breakdowns (uses the newer outcome_type/details model where present)
  const outcomeTypeWise = useMemo(() => reportsGroupBy(filteredEmployment, e => OUTCOME_TYPE_LABELS[e.outcome_type] || e.employment_type || "Legacy"), [filteredEmployment]);
  const outcomeProgramWise = useMemo(() => reportsGroupBy(filteredEmployment, e => PROGRAM_MAP[e.program]?.label || e.program || "—"), [filteredEmployment]);

  // Document breakdowns
  const docCategoryWise = useMemo(() => reportsGroupBy(documents, d => d.category), [documents]);
  const docTypeWise = useMemo(() => reportsGroupBy(documents, d => d.document_type), [documents]);

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
          <select value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Partners</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.partner_name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
            <option value="all">All Status</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
          </select>
          <button onClick={() => setShowMoreFilters(s => !s)} className="flex items-center gap-1.5 rounded-lg border border-[#1E3A8A] px-3 py-1.5 text-[11px] font-semibold text-[#1E3A8A]">
            <Filter size={12} /> {showMoreFilters ? "Hide" : "More"} Filters
          </button>
        </div>

        {showMoreFilters && (
          <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3 mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Location</p>
            <div className="flex gap-2 flex-wrap mb-3">
              <select value={stateFilter} onChange={e => onStateChange(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
                <option value="all">All States</option>
                {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={districtFilter} onChange={e => onDistrictChange(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
                <option value="all">All Districts</option>
                {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={mandalFilter} onChange={e => setMandalFilter(e.target.value)} disabled={districtFilter === "all"} className={selectCls + " w-auto text-[11px] py-1.5 disabled:opacity-50"}>
                <option value="all">{districtFilter === "all" ? "Select District first" : "All Mandals"}</option>
                {mandalOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Demographics</p>
            <div className="flex gap-2 flex-wrap">
              <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
                <option value="all">All Genders</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectCls + " w-auto text-[11px] py-1.5"}>
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic summary — updates instantly with every filter change */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
        {[["Total", totalBeneficiaries, "#1E3A8A"], ["Male", genderWise.find(g => g.label === "Male")?.count || 0, "#2563EB"],
          ["Female", genderWise.find(g => g.label === "Female")?.count || 0, "#DB2777"], ["Other", genderWise.find(g => g.label === "Other")?.count || 0, "#7C3AED"],
          ["Active", activeBeneficiaries, "#16A34A"], ["Inactive", inactiveBeneficiaries, "#DC2626"],
          ["Programs", activePrograms, "#F97316"], ["Partners", activePartners, "#0EA5E9"]].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-2 text-center">
            <p className="text-[14px] font-bold" style={{ color: c }}>{v}</p>
            <p className="text-[9px] text-[#6B7280]">{l}</p>
          </div>
        ))}
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
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Partner Type Distribution</p>
          <MiniBarChart data={partnerTypeWise} color="#7C3AED" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Documents by Category</p>
          <MiniBarChart data={docCategoryWise} color="#F97316" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Beneficiaries by District</p>
          <MiniBarChart data={districtWise} color="#1E3A8A" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Beneficiaries by Category</p>
          <MiniDonut data={categoryWise} />
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Partner-wise Programs</p>
          {partnerWisePrograms.length === 0 ? <p className="text-[11px] text-[#9CA3AF] text-center py-6">No partner-program links yet.</p> : <MiniBarChart data={partnerWisePrograms} color="#7C3AED" />}
        </div>
      </div>

      {/* Top 10 Lists */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[["Top 10 Programs", top10Programs], ["Top 10 Partners", top10Partners], ["Top 10 Districts", top10Districts], ["Top 10 Villages", top10Villages]].map(([title, rows]) => (
          <div key={title} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <p className="text-[12px] font-bold text-[#111827] mb-2">{title}</p>
            {rows.length === 0 ? <p className="text-[11px] text-[#9CA3AF] text-center py-4">No data.</p> : (
              <div className="space-y-1">
                {rows.map((r, i) => (
                  <div key={r.label} className="flex items-center justify-between text-[11.5px]">
                    <span className="text-[#374151] truncate">{i + 1}. {r.label}</span>
                    <span className="font-bold text-[#1E3A8A] shrink-0">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:col-span-2">
          <p className="text-[12px] font-bold text-[#111827] mb-2">Newest Registrations</p>
          {newestRegistrations.length === 0 ? <p className="text-[11px] text-[#9CA3AF] text-center py-4">No data.</p> : (
            <div className="space-y-1">
              {newestRegistrations.map(b => (
                <div key={b.beneficiary_id} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-[#374151]">{b.name} <span className="text-[#9CA3AF] font-mono">({b.beneficiary_id})</span></span>
                  <span className="text-[#6B7280] shrink-0">{b.registration_date}</span>
                </div>
              ))}
            </div>
          )}
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
          <ReportTable title="Beneficiary Report" filenamePrefix="beneficiary_report"
            columns={[
              { key: "beneficiary_id", label: "Beneficiary ID" }, { key: "name", label: "Name" }, { key: "gender", label: "Gender" },
              { key: "program", label: "Program" }, { key: "field_worker_name", label: "Field Worker" }, { key: "village", label: "Village" },
              { key: "mandal", label: "Mandal" }, { key: "district", label: "District" }, { key: "status", label: "Status" }, { key: "registration_date", label: "Registration Date" },
            ]}
            rows={filteredBeneficiaries.map(b => ({
              beneficiary_id: b.beneficiary_id, name: b.name, gender: b.gender, program: PROGRAM_MAP[b.program]?.short || b.program,
              field_worker_name: b.field_worker_name || "—", village: b.village || "—", mandal: b.mandal || "—", district: b.district || "—",
              status: b.status || "Registered", registration_date: b.registration_date || "—",
            }))} />
          <ReportTable title="Program-wise" columns={[{ key: "label", label: "Program" }, { key: "count", label: "Count" }]} rows={programWise} filenamePrefix="beneficiaries_program" />
          <ReportTable title="Village-wise" columns={[{ key: "label", label: "Village" }, { key: "count", label: "Count" }]} rows={villageWise} filenamePrefix="beneficiaries_village" />
          <ReportTable title="District-wise" columns={[{ key: "label", label: "District" }, { key: "count", label: "Count" }]} rows={districtWise} filenamePrefix="beneficiaries_district" />
          <ReportTable title="Category-wise" columns={[{ key: "label", label: "Category" }, { key: "count", label: "Count" }]} rows={categoryWise} filenamePrefix="beneficiaries_category" />
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

      {section === "partner" && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[["Total Partners", filteredPartners.length, "#1E3A8A"], ["Active", activePartners, "#16A34A"]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <ReportTable title="Type-wise" columns={[{ key: "label", label: "Partner Type" }, { key: "count", label: "Count" }]} rows={partnerTypeWise} filenamePrefix="partner_type" />
          <ReportTable title="Status-wise" columns={[{ key: "label", label: "Status" }, { key: "count", label: "Count" }]} rows={partnerStatusWise} filenamePrefix="partner_status" />
          <ReportTable title="District-wise" columns={[{ key: "label", label: "District" }, { key: "count", label: "Count" }]} rows={partnerDistrictWise} filenamePrefix="partner_district" />
        </>
      )}

      {section === "livelihood" && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[["Total Outcomes", livelihoodOutcomes, "#0EA5E9"], ["Active", placements, "#16A34A"]].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
                <p className="text-[18px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px] text-[#6B7280]">{l}</p>
              </div>
            ))}
          </div>
          <ReportTable title="Outcome Type-wise" columns={[{ key: "label", label: "Outcome Type" }, { key: "count", label: "Count" }]} rows={outcomeTypeWise} filenamePrefix="livelihood_outcome" />
          <ReportTable title="Program-wise" columns={[{ key: "label", label: "Program" }, { key: "count", label: "Count" }]} rows={outcomeProgramWise} filenamePrefix="livelihood_program" />
        </>
      )}

      {section === "document" && (
        <>
          <div className="grid grid-cols-1 gap-2 mb-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 text-center">
              <p className="text-[18px] font-bold text-[#7C3AED]">{documentsUploaded}</p>
              <p className="text-[10px] text-[#6B7280]">Documents Uploaded</p>
            </div>
          </div>
          <ReportTable title="By Category" columns={[{ key: "label", label: "Category" }, { key: "count", label: "Count" }]} rows={docCategoryWise} filenamePrefix="documents_category" />
          <ReportTable title="By Document Type" columns={[{ key: "label", label: "Document Type" }, { key: "count", label: "Count" }]} rows={docTypeWise} filenamePrefix="documents_type" />
        </>
      )}
    </div>
  );
}

/* ============================================================
   MOBILE NAVIGATION DRAWER
   Left slide-in drawer replacing the old bottom nav. Reuses the
   exact same section/onClick config the desktop sidebar uses —
   no new routes, no new logic, only presentation.
   ============================================================ */
function NavDrawer({ open, onClose, sections, currentUser, isSuperAdmin, isAdmin, view }) {
  const touchStartX = React.useRef(null);
  const touchDeltaX = React.useRef(0);
  const [dragX, setDragX] = useState(0);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = dx;
    if (dx < 0) setDragX(dx);
  };
  const onTouchEnd = () => {
    if (touchDeltaX.current < -70) onClose();
    touchStartX.current = null; touchDeltaX.current = 0; setDragX(0);
  };

  const roleLabel = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Field Worker";

  return (
    <>
      <style>{`
        .tp-drawer-overlay { transition: opacity 300ms ease; }
        .tp-drawer-panel { transition: transform 300ms cubic-bezier(0.22,1,0.36,1); will-change: transform; }
        .tp-menu-item { position: relative; overflow: hidden; }
        .tp-menu-item:active { background: rgba(37,99,235,0.12) !important; }
      `}</style>

      {/* Dark overlay */}
      <div className="md:hidden fixed inset-0 z-[60] bg-black/50 tp-drawer-overlay"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={onClose} />

      {/* Sliding panel */}
      <div className="md:hidden fixed top-0 left-0 bottom-0 z-[65] w-[82%] max-w-[320px] bg-white tp-drawer-panel flex flex-col shadow-2xl"
        style={{ transform: open ? `translateX(${Math.min(0, dragX)}px)` : "translateX(-100%)" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        {/* Glass header */}
        <div className="relative overflow-hidden px-5 pt-6 pb-5 text-white" style={{ background: "linear-gradient(120deg,#1E3A8A,#16A34A)" }}>
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div className="min-w-0">
              <p className="text-[17px] font-extrabold tracking-wide">TAPASVI</p>
              <p className="text-[10px] text-white/80 truncate">Digital NGO Management System</p>
            </div>
          </div>
          <span className="inline-block mt-2.5 text-[9px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>v2.0</span>
        </div>

        {/* User profile */}
        <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold text-white" style={{ background: "#1E3A8A" }}>
              {(currentUser?.username || "?").charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#16A34A] border-2 border-white" title="Online" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#111827] truncate">{currentUser?.username || "User"}</p>
            <p className="text-[11px] text-[#6B7280]">{roleLabel} · TAPASVI Society</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map(s => (
            <div key={s.section}>
              <p className="text-[9.5px] font-bold tracking-wider text-[#9CA3AF] px-3 mb-1">{s.section}</p>
              <div className="space-y-1">
                {s.items.map(item => (
                  <button key={item.key} onClick={item.onClick}
                    className="tp-menu-item w-full flex items-center gap-3 px-3 rounded-xl text-[13.5px] font-medium transition-all duration-200 hover:bg-[#EFF6FF]"
                    style={{ minHeight: 52, background: item.active ? "#DCFCE7" : "transparent", color: item.danger ? "#F97316" : item.active ? "#16A34A" : "#374151" }}>
                    {item.active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: "#16A34A" }} />}
                    <span className="text-[18px]">{item.emoji}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

/* ============================================================
   WASTE MANAGEMENT — Sprint 1 master module.
   Mirrors the Partners module architecture exactly (List/Form/Profile,
   search, hierarchical filters, pagination, export, soft delete).
   Reuses DocumentRepository (DMS) and the audit_logs Timeline pattern
   already built for Partners — no new upload engine, no new Timeline.
   ============================================================ */
function nextWasteRegNumber(records) {
  const nums = records.filter(r => r.registration_number?.startsWith("WM-")).map(r => {
    const m = r.registration_number?.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  return `WM-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
}

/* ============================================================
   DAILY WASTE COLLECTION — Sprint 2.
   Every record links to an existing waste_management master record
   (via waste_management_id). No new household/registration table.
   Reuses: DMS pattern for future docs, audit_logs Timeline pattern,
   the same search/filter/pagination/export/soft-delete conventions
   from Sprint 1.
   ============================================================ */
const WASTE_TYPE_FIELDS = [
  ["wet_waste_kg", "Wet Waste (Kg)"], ["dry_waste_kg", "Dry Waste (Kg)"], ["plastic_kg", "Plastic (Kg)"],
  ["paper_kg", "Paper (Kg)"], ["glass_kg", "Glass (Kg)"], ["metal_kg", "Metal (Kg)"], ["other_kg", "Other (Kg)"],
];

function DailyWasteCollectionModule({ isAdmin, isSuperAdmin, currentUser, showToast, logAppAudit }) {
  const [collections, setCollections] = useState([]);
  const [households, setHouseholds] = useState([]); // active waste_management records, for the picker
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("list"); // list | form
  const [editing, setEditing] = useState(null);
  const [preselected, setPreselected] = useState(null);

  const load = async () => {
    setLoading(true);
    const [cl, hh] = await Promise.all([
      supabase.from("daily_waste_collection").select("*, waste_management(*)").eq("status", "Active").order("collection_date", { ascending: false }),
      supabase.from("waste_management").select("*").eq("status", "Active"),
    ]);
    setCollections(cl.data || []);
    setHouseholds(hh.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCollection = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    const hh = households.find(h => h.id === form.waste_management_id);
    if (editing) {
      const rec = { ...form, updated_by: who, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("daily_waste_collection").update(rec).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await logAppAudit("UPDATE", "Waste Collection", `Edited collection for ${hh?.family_head_name} (${hh?.registration_number}) on ${form.collection_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      const rec = { ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now };
      const { error } = await supabase.from("daily_waste_collection").insert(rec);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await logAppAudit("CREATE", "Waste Collection", `Collection added for ${hh?.family_head_name} (${hh?.registration_number}) on ${form.collection_date}`);
      showToast("Collection Added Successfully");
    }
    setEditing(null); setPreselected(null); setSub("list"); load();
  };

  const softDelete = async (c) => {
    if (!window.confirm("Remove this collection record?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    const { error } = await supabase.from("daily_waste_collection").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    await logAppAudit("DELETE", "Waste Collection", `Removed collection for ${c.waste_management?.family_head_name} on ${c.collection_date}`);
    showToast("Removed Successfully");
    load();
  };

  if (sub === "form") {
    return (
      <DailyWasteCollectionForm editing={editing} households={households} preselected={preselected} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}
        onSave={saveCollection} onCancel={() => { setEditing(null); setPreselected(null); setSub("list"); }} />
    );
  }
  return (
    <DailyWasteCollectionList collections={collections} households={households} isAdmin={isAdmin} loading={loading}
      onAdd={() => { setEditing(null); setPreselected(null); setSub("form"); }}
      onEdit={c => { setEditing(c); setSub("form"); }}
      onDelete={softDelete}
      onExport={() => downloadCSV(collections.map(c => ({
        "Reg No": c.waste_management?.registration_number, "Family Head": c.waste_management?.family_head_name,
        "Village": c.waste_management?.village, "Date": c.collection_date, "Collector": c.collector,
        "Wet(kg)": c.wet_waste_kg, "Dry(kg)": c.dry_waste_kg, "Plastic(kg)": c.plastic_kg, "Status": c.collection_status,
      })), `TAPASVI_WasteCollection_${new Date().toISOString().slice(0, 10)}.csv`)} />
  );
}

function DailyWasteCollectionList({ collections, households, isAdmin, loading, onAdd, onEdit, onDelete, onExport }) {
  const [query, setQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [collectorFilter, setCollectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const districtOptions = useMemo(() => [...new Set(households.map(h => h.district).filter(Boolean))].sort(), [households]);
  const mandalOptions = useMemo(() => districtFilter === "all" ? [] : [...new Set(households.filter(h => h.district === districtFilter).map(h => h.mandal).filter(Boolean))].sort(), [households, districtFilter]);
  const villageOptions = useMemo(() => {
    let scope = households;
    if (districtFilter !== "all") scope = scope.filter(h => h.district === districtFilter);
    if (mandalFilter !== "all") scope = scope.filter(h => h.mandal === mandalFilter);
    return [...new Set(scope.map(h => h.village).filter(Boolean))].sort();
  }, [households, districtFilter, mandalFilter]);
  const collectorOptions = useMemo(() => [...new Set(collections.map(c => c.collector).filter(Boolean))].sort(), [collections]);

  const filtered = useMemo(() => collections.filter(c => {
    const hh = c.waste_management;
    if (districtFilter !== "all" && hh?.district !== districtFilter) return false;
    if (mandalFilter !== "all" && hh?.mandal !== mandalFilter) return false;
    if (villageFilter !== "all" && hh?.village !== villageFilter) return false;
    if (collectorFilter !== "all" && c.collector !== collectorFilter) return false;
    if (statusFilter !== "all" && c.collection_status !== statusFilter) return false;
    if (dateFrom && c.collection_date < dateFrom) return false;
    if (dateTo && c.collection_date > dateTo) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(hh?.registration_number?.toLowerCase().includes(q) || hh?.family_head_name?.toLowerCase().includes(q) ||
            c.collector?.toLowerCase().includes(q) || hh?.village?.toLowerCase().includes(q) || hh?.mobile_number?.includes(q))) return false;
    }
    return true;
  }), [collections, query, districtFilter, mandalFilter, villageFilter, collectorFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [query, districtFilter, mandalFilter, villageFilter, collectorFilter, statusFilter, dateFrom, dateTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3), [totalPages, page]);

  const statusColor = { Collected: "#16A34A", Missed: "#DC2626", Partial: "#F97316" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">♻ Daily Collection</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><FileSpreadsheet size={13} /> CSV</button>
          <button onClick={() => printSimpleTable("Daily Waste Collection", [{ key: "date", label: "Date" }, { key: "head", label: "Family Head" }, { key: "village", label: "Village" }, { key: "status", label: "Status" }],
            filtered.map(c => ({ date: c.collection_date, head: c.waste_management?.family_head_name, village: c.waste_management?.village, status: c.collection_status })))}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><Printer size={13} /> Print</button>
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}><Plus size={15} /> Add Collection</button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Reg No, Family Head, Collector, Village, Mobile..." className={inputCls + " pl-9 text-[12.5px]"} style={{ minHeight: 44 }} />
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
          <option value="all">All Status</option>
          <option value="Collected">Collected</option>
          <option value="Missed">Missed</option>
          <option value="Partial">Partial</option>
        </select>
        <select value={collectorFilter} onChange={e => setCollectorFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
          <option value="all">All Collectors</option>
          {collectorOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowMoreFilters(s => !s)} className="flex items-center gap-1.5 rounded-lg border border-[#16A34A] px-3 py-2 text-[12px] font-semibold text-[#16A34A]" style={{ minHeight: 44 }}>
          <Filter size={13} /> {showMoreFilters ? "Hide" : "More"} Filters
        </button>
      </div>
      {showMoreFilters && (
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3.5 mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Location & Date</p>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setMandalFilter("all"); setVillageFilter("all"); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={mandalFilter} onChange={e => { setMandalFilter(e.target.value); setVillageFilter("all"); }} disabled={districtFilter === "all"} className={selectCls + " w-auto text-[12px] disabled:opacity-50"}>
              <option value="all">All Mandals</option>
              {mandalOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Villages</option>
              {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <label className="text-[11px] text-[#6B7280]">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls + " w-auto text-[12px]"} />
            <label className="text-[11px] text-[#6B7280]">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls + " w-auto text-[12px]"} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-3/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]"><Leaf size={28} className="mx-auto mb-3 opacity-40" /><p className="text-[13px]">No collection records found.</p></div>
      ) : (
        <>
          <div className="space-y-2.5">
            {paginated.map(c => {
              const hh = c.waste_management;
              const totalKg = WASTE_TYPE_FIELDS.reduce((s, [k]) => s + (Number(c[k]) || 0), 0);
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#111827]">{hh?.family_head_name} <span className="text-[10.5px] font-mono text-[#9CA3AF]">{hh?.registration_number}</span></p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{c.collection_date} · {c.collector || "—"} · {hh?.village || "—"} · {totalKg.toFixed(1)} kg total</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0" style={{ background: statusColor[c.collection_status] + "18", color: statusColor[c.collection_status] }}>{c.collection_status}</span>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && <button onClick={() => onEdit(c)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">Edit</button>}
                    {isAdmin && <button onClick={() => onDelete(c)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11.5px] font-medium text-[#DC2626]">Remove</button>}
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
              <p className="text-[11.5px] text-[#6B7280]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>← Previous</button>
                {pageNumbers.map(n => (
                  <button key={n} onClick={() => setPage(n)} className="rounded-lg text-[12px] font-semibold transition-colors" style={{ minWidth: 36, minHeight: 40, background: n === page ? "#16A34A" : "transparent", color: n === page ? "#fff" : "#374151" }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DailyWasteCollectionForm({ editing, households, preselected, isAdmin, isSuperAdmin, onSave, onCancel }) {
  const blank = {
    waste_management_id: preselected?.id || "", collection_date: new Date().toISOString().slice(0, 10), collector: "",
    wet_waste_kg: "", dry_waste_kg: "", plastic_kg: "", paper_kg: "", glass_kg: "", metal_kg: "", other_kg: "",
    collection_status: "Collected", missed_reason: "", remarks: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [hhQuery, setHhQuery] = useState("");
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const selectedHousehold = households.find(h => h.id === form.waste_management_id) || editing?.waste_management || preselected;
  const hhMatches = useMemo(() => {
    if (!hhQuery.trim()) return [];
    const q = hhQuery.toLowerCase();
    return households.filter(h => h.family_head_name?.toLowerCase().includes(q) || h.registration_number?.toLowerCase().includes(q) || h.village?.toLowerCase().includes(q)).slice(0, 8);
  }, [households, hhQuery]);

  const validate = () => {
    const e = {};
    if (!form.waste_management_id) e.waste_management_id = "Select a household";
    if (!form.collection_date) e.collection_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const payload = { ...form };
    WASTE_TYPE_FIELDS.forEach(([k]) => { payload[k] = parseFloat(payload[k]) || 0; });
    onSave(payload);
  };

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Collection" : "Add Collection"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        {!selectedHousehold ? (
          <Field label="Waste Management Registration" required error={errors.waste_management_id}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input value={hhQuery} onChange={e => setHhQuery(e.target.value)} placeholder="Search by name, Reg No, or village..." className={inputCls + " pl-9"} />
            </div>
            {hhMatches.length > 0 && (
              <div className="mt-2 space-y-1 max-h-[220px] overflow-y-auto">
                {hhMatches.map(h => (
                  <button key={h.id} type="button" onClick={() => { setForm(f => ({ ...f, waste_management_id: h.id })); setHhQuery(""); }}
                    className="w-full text-left rounded-lg border border-[#E5E7EB] px-3 py-2 hover:bg-[#F8FAFC]">
                    <p className="text-[12.5px] font-semibold text-[#111827]">{h.family_head_name} <span className="text-[10.5px] font-mono text-[#9CA3AF]">{h.registration_number}</span></p>
                    <p className="text-[10.5px] text-[#6B7280]">{h.village}, {h.mandal}, {h.district}</p>
                  </button>
                ))}
              </div>
            )}
          </Field>
        ) : (
          <div className="rounded-xl p-3.5 mb-4" style={{ background: "#DCFCE7" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#166534]">Household Details (Auto-fetched · Read Only)</p>
              {!editing && <button type="button" onClick={() => setForm(f => ({ ...f, waste_management_id: "" }))} className="text-[10.5px] font-semibold text-[#DC2626]">Change</button>}
            </div>
            <p className="text-[13px] font-bold text-[#16A34A] mb-2">{selectedHousehold.family_head_name} <span className="font-mono text-[10.5px] text-[#166534]">{selectedHousehold.registration_number}</span></p>
            <div className="grid grid-cols-2 gap-y-2 text-[11px] text-[#166534]">
              <div><span className="opacity-70">Mobile:</span> {selectedHousehold.mobile_number || "—"}</div>
              <div><span className="opacity-70">Aadhaar:</span> {aadhaarForRole(selectedHousehold.aadhaar_number, isSuperAdmin, isAdmin) ?? "Restricted"}</div>
              <div><span className="opacity-70">State:</span> {selectedHousehold.state || "—"}</div>
              <div><span className="opacity-70">District:</span> {selectedHousehold.district || "—"}</div>
              <div><span className="opacity-70">Mandal:</span> {selectedHousehold.mandal || "—"}</div>
              <div><span className="opacity-70">Gram Panchayat:</span> {selectedHousehold.gram_panchayat || "—"}</div>
              <div><span className="opacity-70">Village:</span> {selectedHousehold.village || "—"}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Collection Date" required error={errors.collection_date}><Input type="date" value={form.collection_date} onChange={set("collection_date")} /></Field>
          <Field label="Collector"><Input value={form.collector} onChange={set("collector")} /></Field>
        </div>

        <SectionHeader title="Waste Quantities" color="#16A34A" />
        <div className="grid grid-cols-2 gap-x-4">
          {WASTE_TYPE_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}><Input type="number" min="0" step="0.1" value={form[key]} onChange={set(key)} /></Field>
          ))}
        </div>

        <SectionHeader title="Status" color="#16A34A" />
        <Field label="Collection Status"><Select value={form.collection_status} onChange={set("collection_status")} options={["Collected", "Missed", "Partial"]} /></Field>
        {form.collection_status === "Missed" && (
          <Field label="Missed Reason (Optional)"><Input value={form.missed_reason} onChange={set("missed_reason")} /></Field>
        )}
        <Field label="Remarks"><textarea value={form.remarks} onChange={set("remarks")} rows={2} className={inputCls} /></Field>

        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>Save</button>
          <button onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-6 text-[13px] font-medium text-[#111827]" style={{ minHeight: 44 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Reusable block dropped into WasteManagementProfile's "Waste Collection" tab —
// same DailyWasteCollectionForm is reused for add/edit, scoped to one household.
function WasteCollectionProfileTab({ household, currentUser, showToast, logAppAudit, isAdmin, isSuperAdmin }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("daily_waste_collection").select("*").eq("waste_management_id", household.id).eq("status", "Active").order("collection_date", { ascending: false });
    setCollections(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [household.id]);

  const saveCollection = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      const { error } = await supabase.from("daily_waste_collection").update({ ...form, updated_by: who, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await logAppAudit("UPDATE", "Waste Collection", `Edited collection for ${household.family_head_name} (${household.registration_number}) on ${form.collection_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      const { error } = await supabase.from("daily_waste_collection").insert({ ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now });
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await logAppAudit("CREATE", "Waste Collection", `Collection added for ${household.family_head_name} (${household.registration_number}) on ${form.collection_date}`);
      showToast("Collection Added Successfully");
    }
    setEditing(null); setShowForm(false); load();
  };

  const softDelete = async (c) => {
    if (!window.confirm("Remove this collection record?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("daily_waste_collection").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", c.id);
    await logAppAudit("DELETE", "Waste Collection", `Removed collection for ${household.family_head_name} on ${c.collection_date}`);
    showToast("Removed Successfully");
    load();
  };

  const summary = useMemo(() => {
    const active = collections;
    return {
      total: active.length,
      wet: active.reduce((s, c) => s + (Number(c.wet_waste_kg) || 0), 0),
      dry: active.reduce((s, c) => s + (Number(c.dry_waste_kg) || 0), 0),
      plastic: active.reduce((s, c) => s + (Number(c.plastic_kg) || 0), 0),
      missed: active.filter(c => c.collection_status === "Missed").length,
      last: active[0]?.collection_date || "—",
    };
  }, [collections]);

  if (showForm) {
    return <DailyWasteCollectionForm editing={editing} households={[household]} preselected={household} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}
      onSave={saveCollection} onCancel={() => { setEditing(null); setShowForm(false); }} />;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[["Total Collections", summary.total, "#16A34A"], ["Wet Waste (kg)", summary.wet.toFixed(1), "#0EA5E9"], ["Dry Waste (kg)", summary.dry.toFixed(1), "#F97316"],
          ["Plastic (kg)", summary.plastic.toFixed(1), "#7C3AED"], ["Missed Visits", summary.missed, "#DC2626"], ["Last Collection", summary.last, "#1E3A8A"]].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center">
            <p className="text-[13px] font-bold" style={{ color: c }}>{v}</p>
            <p className="text-[9px] text-[#6B7280]">{l}</p>
          </div>
        ))}
      </div>
      <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white mb-4 active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>+ Add Collection</button>
      {loading ? (
        <p className="text-[12px] text-[#9CA3AF] text-center py-6">Loading...</p>
      ) : collections.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF]"><p className="text-[12.5px]">No collection history yet.</p></div>
      ) : (
        <div className="space-y-2">
          {collections.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[12.5px] font-semibold text-[#111827]">{c.collection_date} · {c.collector || "—"}</p>
                <Badge label={c.collection_status} color={c.collection_status === "Collected" ? "#16A34A" : c.collection_status === "Missed" ? "#DC2626" : "#F97316"}
                  tint={c.collection_status === "Collected" ? "#DCFCE7" : c.collection_status === "Missed" ? "#FEE2E2" : "#FFF7ED"} />
              </div>
              <p className="text-[10.5px] text-[#6B7280]">Wet {c.wet_waste_kg}kg · Dry {c.dry_waste_kg}kg · Plastic {c.plastic_kg}kg · Paper {c.paper_kg}kg · Glass {c.glass_kg}kg · Metal {c.metal_kg}kg · Other {c.other_kg}kg</p>
              {c.remarks && <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">{c.remarks}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => softDelete(c)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   WASTE MANAGEMENT — Phase 2: Village Management & Project Planning.
   Sub-modules of Waste Management (same RBAC bucket, no new
   permission rows needed). Village = operational planning unit,
   distinct from the Waste Management Registration (household)
   master created in Sprint 1 — no duplicate registration here.
   ============================================================ */
const VILLAGE_PROJECT_STATUSES = ["Planned", "Baseline Survey", "Awareness Running", "Collection Started", "Fully Operational", "Plastic-Free Village"];
const MEETING_TYPES = ["District Collector", "Panchayat", "SHG", "CSR", "Community", "Review Meeting"];
const AWARENESS_TYPES = ["Door-to-Door Campaign", "School Awareness", "SHG Meeting", "Street Play", "Plastic-Free Campaign", "Wall Painting", "Poster Campaign"];

function nextVillageCode(records) {
  const nums = records.filter(r => r.village_code?.startsWith("VLG-")).map(r => {
    const m = r.village_code?.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  return `VLG-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
}

function VillageManagementModule({ canEdit, canDelete, currentUser, showToast, logAppAudit }) {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("list"); // list | form | profile
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("waste_villages").select("*").order("created_at", { ascending: false });
    if (error) { showToast("Error loading villages: " + error.message, "error"); setLoading(false); return; }
    setVillages(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveVillage = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      const rec = { ...form, updated_by: who, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("waste_villages").update(rec).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      const statusChanged = editing.project_status !== form.project_status;
      await logAppAudit("UPDATE", "Waste Villages", `Updated village: ${form.village_name} (${form.village_code})${statusChanged ? ` — status → ${form.project_status}` : ""}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      const rec = { ...form, village_code: nextVillageCode(villages), status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now };
      const { error } = await supabase.from("waste_villages").insert(rec);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      await logAppAudit("CREATE", "Waste Villages", `Village created: ${rec.village_name} (${rec.village_code})`);
      showToast("Village Created Successfully");
    }
    setEditing(null); setSub("list"); load();
  };

  const toggleStatus = async (v) => {
    const newStatus = v.status === "Active" ? "Inactive" : "Active";
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("waste_villages").update({ status: newStatus, updated_by: who, updated_at: new Date().toISOString() }).eq("id", v.id);
    await logAppAudit(newStatus === "Active" ? "RESTORE" : "DEACTIVATE", "Waste Villages", `${v.village_name} (${v.village_code}) → ${newStatus}`);
    showToast(newStatus === "Active" ? "Restored Successfully" : "Deactivated Successfully");
    load();
  };

  if (sub === "form") {
    return <WasteVillageForm editing={editing} onSave={saveVillage} onCancel={() => { setEditing(null); setSub(editing ? "profile" : "list"); }} />;
  }
  if (sub === "profile" && viewing) {
    return <VillageProfile village={viewing} currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} canEdit={canEdit}
      onEdit={() => { setEditing(viewing); setSub("form"); }} onBack={() => { setViewing(null); setSub("list"); }} />;
  }
  return (
    <VillageList villages={villages} canEdit={canEdit} canDelete={canDelete} loading={loading}
      onAdd={() => { setEditing(null); setSub("form"); }}
      onView={v => { setViewing(v); setSub("profile"); }}
      onEdit={v => { setEditing(v); setSub("form"); }}
      onToggleStatus={toggleStatus}
      onExport={() => downloadCSV(villages.map(v => ({
        "Village Code": v.village_code, "Village Name": v.village_name, "Mandal": v.mandal, "District": v.district,
        "Households": v.total_households, "Coordinator": v.field_coordinator, "Status": v.project_status,
      })), `TAPASVI_Villages_${new Date().toISOString().slice(0, 10)}.csv`)} />
  );
}

function VillageList({ villages, canEdit, canDelete, loading, onAdd, onView, onEdit, onToggleStatus, onExport }) {
  const [query, setQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [gpFilter, setGpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const districtOptions = useMemo(() => [...new Set(villages.map(v => v.district).filter(Boolean))].sort(), [villages]);
  const mandalOptions = useMemo(() => districtFilter === "all" ? [] : [...new Set(villages.filter(v => v.district === districtFilter).map(v => v.mandal).filter(Boolean))].sort(), [villages, districtFilter]);
  const gpOptions = useMemo(() => [...new Set(villages.map(v => v.gram_panchayat).filter(Boolean))].sort(), [villages]);

  const filtered = useMemo(() => villages.filter(v => {
    if (districtFilter !== "all" && v.district !== districtFilter) return false;
    if (mandalFilter !== "all" && v.mandal !== mandalFilter) return false;
    if (gpFilter !== "all" && v.gram_panchayat !== gpFilter) return false;
    if (statusFilter !== "all" && v.project_status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(v.village_name?.toLowerCase().includes(q) || v.village_code?.toLowerCase().includes(q) ||
            v.mandal?.toLowerCase().includes(q) || v.district?.toLowerCase().includes(q) || v.field_coordinator?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [villages, query, districtFilter, mandalFilter, gpFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [query, districtFilter, mandalFilter, gpFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3), [totalPages, page]);
  const statusColors = { "Planned": "#6B7280", "Baseline Survey": "#F97316", "Awareness Running": "#7C3AED", "Collection Started": "#0EA5E9", "Fully Operational": "#16A34A", "Plastic-Free Village": "#059669" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">📍 Villages</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} village{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><FileSpreadsheet size={13} /> CSV</button>
          {canEdit && <button onClick={onAdd} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}><Plus size={15} /> Add Village</button>}
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Village Name, Code, Mandal, District, Coordinator..." className={inputCls + " pl-9 text-[12.5px]"} style={{ minHeight: 44 }} />
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
          <option value="all">All Statuses</option>
          {VILLAGE_PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowMoreFilters(s => !s)} className="flex items-center gap-1.5 rounded-lg border border-[#16A34A] px-3 py-2 text-[12px] font-semibold text-[#16A34A]" style={{ minHeight: 44 }}>
          <Filter size={13} /> {showMoreFilters ? "Hide" : "More"} Filters
        </button>
      </div>
      {showMoreFilters && (
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3.5 mb-4">
          <div className="flex gap-2 flex-wrap">
            <select value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setMandalFilter("all"); }} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={mandalFilter} onChange={e => setMandalFilter(e.target.value)} disabled={districtFilter === "all"} className={selectCls + " w-auto text-[12px] disabled:opacity-50"}>
              <option value="all">All Mandals</option>
              {mandalOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={gpFilter} onChange={e => setGpFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Gram Panchayats</option>
              {gpOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-3/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]"><MapPin size={28} className="mx-auto mb-3 opacity-40" /><p className="text-[13px]">No villages found.</p></div>
      ) : (
        <>
          <div className="space-y-2.5">
            {paginated.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#111827]">{v.village_name} <span className="text-[10.5px] font-mono text-[#9CA3AF]">{v.village_code}</span></p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{[v.gram_panchayat, v.mandal, v.district].filter(Boolean).join(", ")} · {v.field_coordinator || "No coordinator"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0" style={{ background: (statusColors[v.project_status] || "#6B7280") + "18", color: statusColors[v.project_status] || "#6B7280" }}>{v.project_status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onView(v)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">View</button>
                  {canEdit && <button onClick={() => onEdit(v)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">Edit</button>}
                  {canDelete && <button onClick={() => onToggleStatus(v)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">{v.status === "Active" ? "Deactivate" : "Restore"}</button>}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
              <p className="text-[11.5px] text-[#6B7280]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>← Previous</button>
                {pageNumbers.map(n => (
                  <button key={n} onClick={() => setPage(n)} className="rounded-lg text-[12px] font-semibold transition-colors" style={{ minWidth: 36, minHeight: 40, background: n === page ? "#16A34A" : "transparent", color: n === page ? "#fff" : "#374151" }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WasteVillageForm({ editing, onSave, onCancel }) {
  const blank = {
    village_name: "", gram_panchayat: "", mandal: "", district: "", state: "Andhra Pradesh",
    total_households: "", population: "", estimated_daily_waste_kg: "", assigned_shg: "", assigned_mrf: "",
    field_coordinator: "", project_status: "Planned",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (!form.village_name.trim()) e.village_name = "Required";
    if (!form.district) e.district = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => { if (validate()) onSave(form); };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Village" : "New Village"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        {editing && <Field label="Village Code"><Input value={editing.village_code} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono"} /></Field>}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Village Name" required error={errors.village_name}><Input value={form.village_name} onChange={set("village_name")} /></Field>
          <Field label="Gram Panchayat"><Input value={form.gram_panchayat} onChange={set("gram_panchayat")} /></Field>
          <Field label="District" required error={errors.district}><Select value={form.district} onChange={set("district")} options={DISTRICTS_AP} placeholder="Select district" /></Field>
          <Field label="Mandal"><Input value={form.mandal} onChange={set("mandal")} /></Field>
          <Field label="State"><Input value={form.state} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} /></Field>
          <Field label="Field Coordinator"><Input value={form.field_coordinator} onChange={set("field_coordinator")} /></Field>
          <Field label="Total Households"><Input type="number" min="0" value={form.total_households} onChange={set("total_households")} /></Field>
          <Field label="Population (Optional)"><Input type="number" min="0" value={form.population} onChange={set("population")} /></Field>
          <Field label="Estimated Daily Waste (Kg)"><Input type="number" min="0" step="0.1" value={form.estimated_daily_waste_kg} onChange={set("estimated_daily_waste_kg")} /></Field>
          <Field label="Assigned SHG (Optional)"><Input value={form.assigned_shg} onChange={set("assigned_shg")} /></Field>
          <Field label="Assigned MRF (Optional)"><Input value={form.assigned_mrf} onChange={set("assigned_mrf")} /></Field>
          <Field label="Project Status"><Select value={form.project_status} onChange={set("project_status")} options={VILLAGE_PROJECT_STATUSES} /></Field>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="rounded-lg px-6 py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save</button>
          <button onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function VillageProfile({ village: v, currentUser, showToast, logAppAudit, canEdit, onEdit, onBack }) {
  const [tab, setTab] = useState("basic"); // basic | meetings | awareness | shg | mrf | documents | timeline
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [counts, setCounts] = useState({ meetings: 0, awareness: 0, households: 0 });

  useEffect(() => {
    (async () => {
      const [mt, aw] = await Promise.all([
        supabase.from("waste_meetings").select("id", { count: "exact", head: true }).eq("village_id", v.id).eq("status", "Active"),
        supabase.from("waste_awareness_campaigns").select("households_covered").eq("village_id", v.id).eq("status", "Active"),
      ]);
      setCounts({
        meetings: mt.count || 0,
        awareness: (aw.data || []).length,
        households: (aw.data || []).reduce((s, a) => s + (a.households_covered || 0), 0),
      });
    })();
  }, [v.id]);

  useEffect(() => {
    (async () => {
      setLoadingActivity(true);
      const { data } = await supabase.from("audit_logs").select("*")
        .eq("module", "Waste Villages").ilike("details", `%${v.village_code}%`)
        .order("created_at", { ascending: false }).limit(10);
      setActivity(data || []);
      setLoadingActivity(false);
    })();
  }, [v.village_code]);

  const TABS = [["basic", "Basic Information"], ["meetings", "Meetings"], ["awareness", "Awareness Activities"], ["shg", "Assigned SHG"], ["mrf", "Assigned MRF"], ["documents", "Documents"], ["timeline", "Timeline"]];

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">{v.village_name}</h2>
          <p className="text-[11.5px] text-[#6B7280] font-mono">{v.village_code}</p>
        </div>
        {canEdit && <button onClick={onEdit} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#1E3A8A]">Edit</button>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[["Meetings", counts.meetings, "#7C3AED"], ["Awareness", counts.awareness, "#F97316"], ["Households Covered", counts.households, "#16A34A"]].map(([l, val, c]) => (
          <div key={l} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center">
            <p className="text-[15px] font-bold" style={{ color: c }}>{val}</p>
            <p className="text-[9px] text-[#6B7280]">{l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-colors shrink-0"
            style={tab === key ? { background: "#16A34A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <SectionHeader title="Location" color="#16A34A" />
          <div className="grid grid-cols-2 gap-y-3">
            <InfoRow label="Gram Panchayat" value={v.gram_panchayat} />
            <InfoRow label="Mandal" value={v.mandal} />
            <InfoRow label="District" value={v.district} />
            <InfoRow label="State" value={v.state} />
          </div>
          <SectionHeader title="Project Details" color="#16A34A" />
          <div className="grid grid-cols-2 gap-y-3">
            <InfoRow label="Total Households" value={v.total_households} />
            <InfoRow label="Population" value={v.population} />
            <InfoRow label="Estimated Daily Waste (Kg)" value={v.estimated_daily_waste_kg} />
            <InfoRow label="Field Coordinator" value={v.field_coordinator} />
            <InfoRow label="Project Status" value={v.project_status} />
            <InfoRow label="Status" value={v.status} />
          </div>
        </div>
      )}

      {tab === "meetings" && <VillageMeetingsTab village={v} currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} />}
      {tab === "awareness" && <VillageAwarenessTab village={v} currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} />}

      {tab === "shg" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <SectionHeader title="Assigned SHG" color="#16A34A" />
          <p className="text-[13px] text-[#111827]">{v.assigned_shg || "No SHG assigned yet."}</p>
          <p className="text-[10.5px] text-[#9CA3AF] mt-2">SHG assignment management (linking to a full SHG master) is planned for a future phase — edit this from the village's Edit form for now.</p>
        </div>
      )}
      {tab === "mrf" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <SectionHeader title="Assigned MRF" color="#16A34A" />
          <p className="text-[13px] text-[#111827]">{v.assigned_mrf || "No MRF assigned yet."}</p>
          <p className="text-[10.5px] text-[#9CA3AF] mt-2">MRF assignment management is planned for a future phase — edit this from the village's Edit form for now.</p>
        </div>
      )}

      {tab === "documents" && <DocumentRepository entityType="waste_village" entityId={v.id} currentUser={currentUser} showToast={showToast} />}

      {tab === "timeline" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          {loadingActivity ? <p className="text-[12px] text-[#9CA3AF] text-center py-4">Loading...</p> : activity.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-4">No activity recorded yet.</p>
          ) : (
            <div className="space-y-0">
              {activity.map((a, i) => (
                <div key={a.id || i} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: a.action === "CREATE" ? "#16A34A" : a.action === "DEACTIVATE" ? "#DC2626" : "#1E3A8A" }} />
                    {i < activity.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-[#E5E7EB]" />}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-[11.5px] text-[#111827] leading-snug">{a.details || a.action}</p>
                    <p className="text-[9.5px] text-[#9CA3AF] mt-0.5">{a.user_email || "—"} · {a.created_at ? new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Meetings: shared form (used standalone AND inside Village Profile) ---- */
function MeetingForm({ editing, villages, preselected, onSave, onCancel }) {
  const blank = {
    village_id: preselected?.id || "", meeting_date: new Date().toISOString().slice(0, 10), meeting_type: MEETING_TYPES[0],
    organizer: "", participants_count: "", key_decisions: "", next_action: "", meeting_status: "Completed",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (!form.village_id) e.village_id = "Select a village";
    if (!form.meeting_date) e.meeting_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => { if (validate()) onSave({ ...form, participants_count: parseInt(form.participants_count) || 0 }); };

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Meeting" : "Add Meeting"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        {!preselected && (
          <Field label="Village" required error={errors.village_id}>
            <Select value={form.village_id} onChange={set("village_id")} placeholder="Select village"
              options={villages.map(v => ({ value: v.id, label: `${v.village_name} (${v.village_code})` }))} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Meeting Date" required error={errors.meeting_date}><Input type="date" value={form.meeting_date} onChange={set("meeting_date")} /></Field>
          <Field label="Meeting Type"><Select value={form.meeting_type} onChange={set("meeting_type")} options={MEETING_TYPES} /></Field>
          <Field label="Organizer"><Input value={form.organizer} onChange={set("organizer")} /></Field>
          <Field label="Participants Count"><Input type="number" min="0" value={form.participants_count} onChange={set("participants_count")} /></Field>
        </div>
        <Field label="Key Decisions"><textarea value={form.key_decisions} onChange={set("key_decisions")} rows={2} className={inputCls} /></Field>
        <Field label="Next Action"><textarea value={form.next_action} onChange={set("next_action")} rows={2} className={inputCls} /></Field>
        <Field label="Status"><Select value={form.meeting_status} onChange={set("meeting_status")} options={["Completed", "Scheduled", "Cancelled"]} /></Field>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>Save</button>
          <button onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-6 text-[13px] font-medium text-[#111827]" style={{ minHeight: 44 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function VillageMeetingsTab({ village, currentUser, showToast, logAppAudit }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("waste_meetings").select("*").eq("village_id", village.id).eq("status", "Active").order("meeting_date", { ascending: false });
    setMeetings(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [village.id]);

  const save = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      await supabase.from("waste_meetings").update({ ...form, updated_by: who, updated_at: new Date().toISOString() }).eq("id", editing.id);
      await logAppAudit("UPDATE", "Waste Villages", `Meeting edited for ${village.village_name} on ${form.meeting_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      await supabase.from("waste_meetings").insert({ ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now });
      await logAppAudit("CREATE", "Waste Villages", `Meeting added for ${village.village_name} on ${form.meeting_date}`);
      showToast("Meeting Added Successfully");
    }
    setEditing(null); setShowForm(false); load();
  };

  const remove = async (m) => {
    if (!window.confirm("Remove this meeting?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("waste_meetings").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", m.id);
    await logAppAudit("DELETE", "Waste Villages", `Meeting removed for ${village.village_name} (${m.meeting_date})`);
    showToast("Removed Successfully"); load();
  };

  if (showForm) return <MeetingForm editing={editing} villages={[village]} preselected={village} onSave={save} onCancel={() => { setEditing(null); setShowForm(false); }} />;

  return (
    <div>
      <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white mb-4 active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>+ Add Meeting</button>
      {loading ? <p className="text-[12px] text-[#9CA3AF] text-center py-6">Loading...</p> : meetings.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF]"><p className="text-[12.5px]">No meetings recorded yet.</p></div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[12.5px] font-semibold text-[#111827]">{m.meeting_date} · {m.meeting_type}</p>
                <Badge label={m.meeting_status} color="#7C3AED" tint="#F5F3FF" />
              </div>
              <p className="text-[10.5px] text-[#6B7280]">Organizer: {m.organizer || "—"} · {m.participants_count || 0} participants</p>
              {m.key_decisions && <p className="text-[10.5px] text-[#374151] mt-1">Decisions: {m.key_decisions}</p>}
              {m.next_action && <p className="text-[10.5px] text-[#9CA3AF]">Next: {m.next_action}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditing(m); setShowForm(true); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => remove(m)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Awareness Campaigns: shared form ---- */
function AwarenessForm({ editing, villages, preselected, onSave, onCancel }) {
  const blank = {
    village_id: preselected?.id || "", activity_date: new Date().toISOString().slice(0, 10), campaign_type: AWARENESS_TYPES[0],
    team: "", volunteers_count: "", households_covered: "", participants_count: "", remarks: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (!form.village_id) e.village_id = "Select a village";
    if (!form.activity_date) e.activity_date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const submit = () => {
    if (!validate()) return;
    onSave({ ...form, volunteers_count: parseInt(form.volunteers_count) || 0, households_covered: parseInt(form.households_covered) || 0, participants_count: parseInt(form.participants_count) || 0 });
  };

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Awareness Activity" : "Add Awareness Activity"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        {!preselected && (
          <Field label="Village" required error={errors.village_id}>
            <Select value={form.village_id} onChange={set("village_id")} placeholder="Select village"
              options={villages.map(v => ({ value: v.id, label: `${v.village_name} (${v.village_code})` }))} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Activity Date" required error={errors.activity_date}><Input type="date" value={form.activity_date} onChange={set("activity_date")} /></Field>
          <Field label="Campaign Type"><Select value={form.campaign_type} onChange={set("campaign_type")} options={AWARENESS_TYPES} /></Field>
          <Field label="Team"><Input value={form.team} onChange={set("team")} /></Field>
          <Field label="Volunteers"><Input type="number" min="0" value={form.volunteers_count} onChange={set("volunteers_count")} /></Field>
          <Field label="Households Covered"><Input type="number" min="0" value={form.households_covered} onChange={set("households_covered")} /></Field>
          <Field label="Participants"><Input type="number" min="0" value={form.participants_count} onChange={set("participants_count")} /></Field>
        </div>
        <Field label="Remarks"><textarea value={form.remarks} onChange={set("remarks")} rows={2} className={inputCls} /></Field>
        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="flex-1 rounded-xl py-3 text-[13.5px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>Save</button>
          <button onClick={onCancel} className="rounded-xl border border-[#E5E7EB] px-6 text-[13px] font-medium text-[#111827]" style={{ minHeight: 44 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function VillageAwarenessTab({ village, currentUser, showToast, logAppAudit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("waste_awareness_campaigns").select("*").eq("village_id", village.id).eq("status", "Active").order("activity_date", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [village.id]);

  const save = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      await supabase.from("waste_awareness_campaigns").update({ ...form, updated_by: who, updated_at: new Date().toISOString() }).eq("id", editing.id);
      await logAppAudit("UPDATE", "Waste Villages", `Awareness activity edited for ${village.village_name} on ${form.activity_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      await supabase.from("waste_awareness_campaigns").insert({ ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now });
      await logAppAudit("CREATE", "Waste Villages", `Awareness activity added for ${village.village_name} on ${form.activity_date}`);
      showToast("Activity Added Successfully");
    }
    setEditing(null); setShowForm(false); load();
  };

  const remove = async (a) => {
    if (!window.confirm("Remove this awareness activity?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("waste_awareness_campaigns").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", a.id);
    await logAppAudit("DELETE", "Waste Villages", `Awareness activity removed for ${village.village_name} (${a.activity_date})`);
    showToast("Removed Successfully"); load();
  };

  if (showForm) return <AwarenessForm editing={editing} villages={[village]} preselected={village} onSave={save} onCancel={() => { setEditing(null); setShowForm(false); }} />;

  return (
    <div>
      <button onClick={() => { setEditing(null); setShowForm(true); }} className="w-full rounded-xl py-3 text-[13.5px] font-bold text-white mb-4 active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}>+ Add Awareness Activity</button>
      {loading ? <p className="text-[12px] text-[#9CA3AF] text-center py-6">Loading...</p> : items.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF]"><p className="text-[12.5px]">No awareness activities recorded yet.</p></div>
      ) : (
        <div className="space-y-2">
          {items.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <p className="text-[12.5px] font-semibold text-[#111827]">{a.activity_date} · {a.campaign_type}</p>
              <p className="text-[10.5px] text-[#6B7280]">Team: {a.team || "—"} · {a.volunteers_count || 0} volunteers · {a.households_covered || 0} households · {a.participants_count || 0} participants</p>
              {a.remarks && <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">{a.remarks}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditing(a); setShowForm(true); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => remove(a)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Standalone Meetings module (sidebar entry) ---- */
function MeetingsModule({ canEdit, canDelete, currentUser, showToast, logAppAudit }) {
  const [meetings, setMeetings] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [mt, vl] = await Promise.all([
      supabase.from("waste_meetings").select("*, waste_villages(*)").eq("status", "Active").order("meeting_date", { ascending: false }),
      supabase.from("waste_villages").select("*").eq("status", "Active"),
    ]);
    setMeetings(mt.data || []); setVillages(vl.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      await supabase.from("waste_meetings").update({ ...form, updated_by: who, updated_at: new Date().toISOString() }).eq("id", editing.id);
      await logAppAudit("UPDATE", "Waste Villages", `Meeting edited on ${form.meeting_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      await supabase.from("waste_meetings").insert({ ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now });
      await logAppAudit("CREATE", "Waste Villages", `Meeting added on ${form.meeting_date}`);
      showToast("Meeting Added Successfully");
    }
    setEditing(null); setShowForm(false); load();
  };

  const remove = async (m) => {
    if (!window.confirm("Remove this meeting?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("waste_meetings").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", m.id);
    await logAppAudit("DELETE", "Waste Villages", `Meeting removed (${m.meeting_date})`);
    showToast("Removed Successfully"); load();
  };

  if (showForm) return <MeetingForm editing={editing} villages={villages} onSave={save} onCancel={() => { setEditing(null); setShowForm(false); }} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">📅 Meetings</h2>
          <p className="text-[12px] text-[#6B7280]">{meetings.length} meeting{meetings.length !== 1 ? "s" : ""}</p>
        </div>
        {canEdit && <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}><Plus size={15} /> Add Meeting</button>}
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]"><ClipboardList size={28} className="mx-auto mb-3 opacity-40" /><p className="text-[13px]">No meetings recorded yet.</p></div>
      ) : (
        <div className="space-y-2.5">
          {meetings.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[13px] font-semibold text-[#111827]">{m.waste_villages?.village_name || "—"} · {m.meeting_date}</p>
                <Badge label={m.meeting_type} color="#7C3AED" tint="#F5F3FF" />
              </div>
              <p className="text-[11px] text-[#6B7280]">Organizer: {m.organizer || "—"} · {m.participants_count || 0} participants</p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setEditing(m); setShowForm(true); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                  {canDelete && <button onClick={() => remove(m)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Remove</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Standalone Awareness Campaigns module (sidebar entry) ---- */
function AwarenessModule({ canEdit, canDelete, currentUser, showToast, logAppAudit }) {
  const [items, setItems] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [aw, vl] = await Promise.all([
      supabase.from("waste_awareness_campaigns").select("*, waste_villages(*)").eq("status", "Active").order("activity_date", { ascending: false }),
      supabase.from("waste_villages").select("*").eq("status", "Active"),
    ]);
    setItems(aw.data || []); setVillages(vl.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      await supabase.from("waste_awareness_campaigns").update({ ...form, updated_by: who, updated_at: new Date().toISOString() }).eq("id", editing.id);
      await logAppAudit("UPDATE", "Waste Villages", `Awareness activity edited on ${form.activity_date}`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      await supabase.from("waste_awareness_campaigns").insert({ ...form, status: "Active", created_by: who, created_at: now, updated_by: who, updated_at: now });
      await logAppAudit("CREATE", "Waste Villages", `Awareness activity added on ${form.activity_date}`);
      showToast("Activity Added Successfully");
    }
    setEditing(null); setShowForm(false); load();
  };

  const remove = async (a) => {
    if (!window.confirm("Remove this activity?")) return;
    const who = currentUser?.username || currentUser?.email || "unknown";
    await supabase.from("waste_awareness_campaigns").update({ status: "Inactive", updated_by: who, updated_at: new Date().toISOString() }).eq("id", a.id);
    await logAppAudit("DELETE", "Waste Villages", `Awareness activity removed (${a.activity_date})`);
    showToast("Removed Successfully"); load();
  };

  if (showForm) return <AwarenessForm editing={editing} villages={villages} onSave={save} onCancel={() => { setEditing(null); setShowForm(false); }} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">📢 Awareness Campaigns</h2>
          <p className="text-[12px] text-[#6B7280]">{items.length} activit{items.length !== 1 ? "ies" : "y"}</p>
        </div>
        {canEdit && <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-white active:scale-95 transition" style={{ background: "#16A34A", minHeight: 44 }}><Plus size={15} /> Add Activity</button>}
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]"><ClipboardList size={28} className="mx-auto mb-3 opacity-40" /><p className="text-[13px]">No awareness activities yet.</p></div>
      ) : (
        <div className="space-y-2.5">
          {items.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[13px] font-semibold text-[#111827]">{a.waste_villages?.village_name || "—"} · {a.activity_date}</p>
                <Badge label={a.campaign_type} color="#F97316" tint="#FFF7ED" />
              </div>
              <p className="text-[11px] text-[#6B7280]">{a.households_covered || 0} households · {a.participants_count || 0} participants · {a.volunteers_count || 0} volunteers</p>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setEditing(a); setShowForm(true); }} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                  {canDelete && <button onClick={() => remove(a)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Remove</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function WasteManagementModule({ isAdmin, isSuperAdmin, canEdit, canDelete, currentUser, showToast, logAppAudit }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("list"); // list | form | profile
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("waste_management").select("*").order("created_at", { ascending: false });
    if (error) { showToast("Error loading records: " + error.message, "error"); setLoading(false); return; }
    setRecords(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveRecord = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      const rec = { ...form, household_id: editing.registration_number, updated_by: who, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("waste_management").update(rec).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setRecords(rs => rs.map(r => r.id === editing.id ? { ...r, ...rec } : r));
      await logAppAudit("UPDATE", "Waste Management", `Updated: ${form.family_head_name} (${form.registration_number})`);
      showToast("Updated Successfully");
    } else {
      const now = new Date().toISOString();
      const regNo = nextWasteRegNumber(records);
      const rec = { ...form, registration_number: regNo, household_id: regNo, status: form.status || "Active", created_by: who, created_at: now, updated_by: who, updated_at: now };
      const { data, error } = await supabase.from("waste_management").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setRecords(rs => [data, ...rs]);
      await logAppAudit("CREATE", "Waste Management", `Registered: ${data.family_head_name} (${data.registration_number})`);
      showToast("Registered Successfully");
    }
    setEditing(null); setSub("list");
  };

  const toggleStatus = async (r) => {
    const newStatus = r.status === "Active" ? "Inactive" : "Active";
    const who = currentUser?.username || currentUser?.email || "unknown";
    const { error } = await supabase.from("waste_management").update({ status: newStatus, updated_by: who, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setRecords(rs => rs.map(x => x.id === r.id ? { ...x, status: newStatus } : x));
    await logAppAudit(newStatus === "Active" ? "RESTORE" : "DEACTIVATE", "Waste Management", `${r.family_head_name} (${r.registration_number}) → ${newStatus}`);
    showToast(newStatus === "Active" ? "Restored Successfully" : "Deactivated Successfully");
  };

  if (sub === "form") {
    return <WasteManagementForm editing={editing} records={records} onSave={saveRecord} onCancel={() => { setEditing(null); setSub(editing ? "profile" : "list"); }} />;
  }
  if (sub === "profile" && viewing) {
    return <WasteManagementProfile record={viewing} currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} canEdit={canEdit}
      onEdit={() => { setEditing(viewing); setSub("form"); }} onBack={() => { setViewing(null); setSub("list"); }} />;
  }
  return (
    <WasteManagementList records={records} isAdmin={isAdmin} canEdit={canEdit} canDelete={canDelete} loading={loading}
      onAdd={() => { setEditing(null); setSub("form"); }}
      onView={r => { setViewing(r); setSub("profile"); }}
      onEdit={r => { setEditing(r); setSub("form"); }}
      onToggleStatus={toggleStatus}
      onExport={() => downloadCSV(records.map(r => ({
        "Registration No / Household ID": r.registration_number, "Family Head": r.family_head_name,
        "Gender": r.gender, "Age": r.age, "Mobile": r.mobile_number, "Village": r.village, "Mandal": r.mandal,
        "District": r.district, "Status": r.status,
      })), `TAPASVI_WasteManagement_${new Date().toISOString().slice(0, 10)}.csv`)} />
  );
}

function WasteManagementList({ records, isAdmin, canEdit, canDelete, loading, onAdd, onView, onEdit, onToggleStatus, onExport }) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const stateOptions = useMemo(() => [...new Set(records.map(r => r.state || "Andhra Pradesh"))].sort(), [records]);
  const districtOptions = useMemo(() => {
    const scope = stateFilter === "all" ? records : records.filter(r => (r.state || "Andhra Pradesh") === stateFilter);
    return [...new Set(scope.map(r => r.district).filter(Boolean))].sort();
  }, [records, stateFilter]);
  const mandalOptions = useMemo(() => districtFilter === "all" ? [] : [...new Set(records.filter(r => r.district === districtFilter).map(r => r.mandal).filter(Boolean))].sort(), [records, districtFilter]);
  const villageOptions = useMemo(() => {
    let scope = records;
    if (districtFilter !== "all") scope = scope.filter(r => r.district === districtFilter);
    if (mandalFilter !== "all") scope = scope.filter(r => r.mandal === mandalFilter);
    return [...new Set(scope.map(r => r.village).filter(Boolean))].sort();
  }, [records, districtFilter, mandalFilter]);
  const onStateChange = (v) => { setStateFilter(v); setDistrictFilter("all"); setMandalFilter("all"); setVillageFilter("all"); };
  const onDistrictChange = (v) => { setDistrictFilter(v); setMandalFilter("all"); setVillageFilter("all"); };
  const onMandalChange = (v) => { setMandalFilter(v); setVillageFilter("all"); };

  const filtered = useMemo(() => records.filter(r => {
    if (stateFilter !== "all" && (r.state || "Andhra Pradesh") !== stateFilter) return false;
    if (districtFilter !== "all" && r.district !== districtFilter) return false;
    if (mandalFilter !== "all" && r.mandal !== mandalFilter) return false;
    if (villageFilter !== "all" && r.village !== villageFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(r.registration_number?.toLowerCase().includes(q) ||
            r.family_head_name?.toLowerCase().includes(q) || r.mobile_number?.includes(q) || r.aadhaar_number?.includes(q) ||
            r.village?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [records, query, stateFilter, districtFilter, mandalFilter, villageFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [query, stateFilter, districtFilter, mandalFilter, villageFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3), [totalPages, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">♻️ Waste Management</h2>
          <p className="text-[12px] text-[#6B7280]">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><FileSpreadsheet size={13} /> CSV</button>
          <button onClick={() => printSimpleTable("Waste Management", [{ key: "registration_number", label: "Reg No" }, { key: "family_head_name", label: "Family Head" }, { key: "village", label: "Village" }, { key: "status", label: "Status" }], records)} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] text-[#111827]"><Printer size={13} /> Print</button>
          {canEdit && <button onClick={onAdd} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-bold text-white" style={{ background: "#16A34A" }}><Plus size={14} /> Add</button>}
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Registration No. (Household ID), Name, Mobile, Aadhaar, Village..." className={inputCls + " pl-9 text-[12.5px]"} />
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button onClick={() => setShowMoreFilters(s => !s)} className="flex items-center gap-1.5 rounded-lg border border-[#16A34A] px-3 py-2 text-[12px] font-semibold text-[#16A34A]">
          <Filter size={13} /> {showMoreFilters ? "Hide" : "More"} Filters
        </button>
      </div>
      {showMoreFilters && (
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-[#E5E7EB] p-3.5 mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Location (State → District → Mandal → Village)</p>
          <div className="flex gap-2 flex-wrap">
            <select value={stateFilter} onChange={e => onStateChange(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All States</option>
              {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={districtFilter} onChange={e => onDistrictChange(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={mandalFilter} onChange={e => onMandalChange(e.target.value)} disabled={districtFilter === "all"} className={selectCls + " w-auto text-[12px] disabled:opacity-50"}>
              <option value="all">{districtFilter === "all" ? "Select District first" : "All Mandals"}</option>
              {mandalOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={villageFilter} onChange={e => setVillageFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"}>
              <option value="all">All Villages</option>
              {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-3/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Leaf size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">No records found for the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {paginated.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#111827]">{r.family_head_name} <span className="text-[10.5px] font-mono text-[#9CA3AF]">{r.registration_number}</span></p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{r.mobile_number || "—"} · {[r.village, r.mandal, r.district].filter(Boolean).join(", ")}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0" style={{ background: r.status === "Active" ? "#DCFCE7" : "#F3F4F6", color: r.status === "Active" ? "#16A34A" : "#6B7280" }}>{r.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onView(r)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">View</button>
                  {canEdit && <button onClick={() => onEdit(r)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#1E3A8A]">Edit</button>}
                  {canDelete && (
                    <button onClick={() => onToggleStatus(r)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11.5px] font-medium text-[#374151]">
                      {r.status === "Active" ? "Deactivate" : "Restore"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
              <p className="text-[11.5px] text-[#6B7280]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>← Previous</button>
                {pageNumbers.map(n => (
                  <button key={n} onClick={() => setPage(n)} className="rounded-lg text-[12px] font-semibold transition-colors" style={{ minWidth: 36, minHeight: 40, background: n === page ? "#16A34A" : "transparent", color: n === page ? "#fff" : "#374151" }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WasteManagementForm({ editing, records, onSave, onCancel }) {
  const blank = {
    family_head_name: "", gender: "Male", age: "", mobile_number: "", aadhaar_number: "",
    education: "", occupation: "", family_members: "", state: "Andhra Pradesh", district: "", mandal: "",
    gram_panchayat: "", village: "", status: "Active", remarks: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (!form.family_head_name.trim()) e.family_head_name = "Required";
    if (!form.district) e.district = "Required";
    if (form.mobile_number && !/^\d{10}$/.test(form.mobile_number)) e.mobile_number = "Must be 10 digits";
    if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) e.aadhaar_number = "Must be 12 digits";
    if (!editing && form.aadhaar_number) {
      const dup = records.find(r => r.aadhaar_number === form.aadhaar_number && r.status === "Active");
      if (dup) e.aadhaar_number = `Already registered as ${dup.registration_number}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => { if (validate()) onSave(form); };

  return (
    <div className="max-w-[620px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Registration" : "New Waste Management Registration"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        {editing && (
          <Field label="Registration Number"><Input value={editing.registration_number} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono"} /></Field>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Household ID (= Registration Number)">
            <Input value={editing ? editing.registration_number : "Auto-generated on save"} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono"} />
          </Field>
          <Field label="Family Head Name" required error={errors.family_head_name}><Input value={form.family_head_name} onChange={set("family_head_name")} /></Field>
          <Field label="Gender"><Select value={form.gender} onChange={set("gender")} options={GENDER_OPTIONS} /></Field>
          <Field label="Age"><Input type="number" min="1" max="99" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value.replace(/\D/g, "").slice(0, 2) }))} /></Field>
          <Field label="Mobile Number" error={errors.mobile_number}><Input value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))} inputMode="numeric" /></Field>
          <Field label="Aadhaar Number" error={errors.aadhaar_number}><Input value={form.aadhaar_number} onChange={e => setForm(f => ({ ...f, aadhaar_number: e.target.value.replace(/\D/g, "").slice(0, 12) }))} inputMode="numeric" /></Field>
          <Field label="Education"><Select value={form.education} onChange={set("education")} options={EDUCATION_OPTIONS} placeholder="Select" /></Field>
          <Field label="Occupation"><Input value={form.occupation} onChange={set("occupation")} /></Field>
          <Field label="Family Members"><Input type="number" min="1" value={form.family_members} onChange={set("family_members")} /></Field>
        </div>

        <SectionHeader title="Location" color="#16A34A" />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="State"><Input value={form.state} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} /></Field>
          <Field label="District" required error={errors.district}><Select value={form.district} onChange={set("district")} options={DISTRICTS_AP} placeholder="Select district" /></Field>
          <Field label="Mandal"><Input value={form.mandal} onChange={set("mandal")} /></Field>
          <Field label="Gram Panchayat"><Input value={form.gram_panchayat} onChange={set("gram_panchayat")} /></Field>
          <Field label="Village"><Input value={form.village} onChange={set("village")} /></Field>
        </div>

        <SectionHeader title="Status" color="#16A34A" />
        <Field label="Status"><Select value={form.status} onChange={set("status")} options={["Active", "Inactive"]} /></Field>
        <Field label="Remarks"><textarea value={form.remarks} onChange={set("remarks")} rows={2} className={inputCls} /></Field>

        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="rounded-lg px-6 py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save</button>
          <button onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function WasteManagementProfile({ record: r, currentUser, showToast, logAppAudit, isAdmin, isSuperAdmin, canEdit, onEdit, onBack }) {
  const [tab, setTab] = useState("basic"); // basic | collection | documents | timeline
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingActivity(true);
      const { data } = await supabase.from("audit_logs").select("*")
        .eq("module", "Waste Management").ilike("details", `%${r.registration_number}%`)
        .order("created_at", { ascending: false }).limit(10);
      setActivity(data || []);
      setLoadingActivity(false);
    })();
  }, [r.registration_number]);

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">{r.family_head_name}</h2>
          <p className="text-[11.5px] text-[#6B7280] font-mono">{r.registration_number}</p>
        </div>
        {canEdit && <button onClick={onEdit} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#1E3A8A]">Edit</button>}
      </div>

      <div className="flex gap-1 mb-4">
        {[["basic", "Basic Information"], ["collection", "Waste Collection"], ["documents", "Documents"], ["timeline", "Timeline"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors"
            style={tab === key ? { background: "#16A34A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <SectionHeader title="Basic Information" color="#16A34A" />
          <div className="grid grid-cols-2 gap-y-3">
            <InfoRow label="Household ID (= Reg. No.)" value={r.registration_number} />
            <InfoRow label="Gender" value={r.gender} />
            <InfoRow label="Age" value={r.age} />
            <InfoRow label="Mobile Number" value={r.mobile_number} />
            <InfoRow label="Aadhaar Number" value={r.aadhaar_number} />
            <InfoRow label="Education" value={r.education} />
            <InfoRow label="Occupation" value={r.occupation} />
            <InfoRow label="Family Members" value={r.family_members} />
            <InfoRow label="Status" value={r.status} />
          </div>
          <SectionHeader title="Location" color="#16A34A" />
          <div className="grid grid-cols-2 gap-y-3">
            <InfoRow label="State" value={r.state} />
            <InfoRow label="District" value={r.district} />
            <InfoRow label="Mandal" value={r.mandal} />
            <InfoRow label="Gram Panchayat" value={r.gram_panchayat} />
            <InfoRow label="Village" value={r.village} />
          </div>
          {r.remarks && (
            <>
              <SectionHeader title="Remarks" color="#16A34A" />
              <p className="text-[12.5px] text-[#111827]">{r.remarks}</p>
            </>
          )}
          <SectionHeader title="Audit Information" color="#16A34A" />
          <div className="grid grid-cols-2 gap-y-3">
            <InfoRow label="Created By" value={r.created_by} />
            <InfoRow label="Created At" value={r.created_at ? new Date(r.created_at).toLocaleString() : "—"} />
            <InfoRow label="Updated By" value={r.updated_by} />
            <InfoRow label="Updated At" value={r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"} />
          </div>
        </div>
      )}

      {tab === "collection" && (
        <WasteCollectionProfileTab household={r} currentUser={currentUser} showToast={showToast} logAppAudit={logAppAudit} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
      )}

      {tab === "documents" && (
        <DocumentRepository entityType="waste_management" entityId={r.id} currentUser={currentUser} showToast={showToast} />
      )}

      {tab === "timeline" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          {loadingActivity ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-4">Loading...</p>
          ) : activity.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF] text-center py-4">No activity recorded yet.</p>
          ) : (
            <div className="space-y-0">
              {activity.map((a, i) => (
                <div key={a.id || i} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: a.action === "CREATE" ? "#16A34A" : a.action === "DEACTIVATE" ? "#DC2626" : "#1E3A8A" }} />
                    {i < activity.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-[#E5E7EB]" />}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-[11.5px] text-[#111827] leading-snug">{a.details || a.action}</p>
                    <p className="text-[9.5px] text-[#9CA3AF] mt-0.5">{a.user_email || "—"} · {a.created_at ? new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function PartnersModule({ isAdmin, currentUser, showToast, logAppAudit }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("dashboard"); // dashboard | list | form | profile
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false });
    if (error) { showToast("Error loading partners: " + error.message, "error"); setLoading(false); return; }
    setPartners(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const savePartner = async (form) => {
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editing) {
      const rec = { ...form, updated_at: new Date().toISOString(), updated_by: who };
      const { error } = await supabase.from("partners").update(rec).eq("id", editing.id);
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setPartners(ps => ps.map(p => p.id === editing.id ? { ...p, ...rec } : p));
      await logAppAudit("UPDATE", "Partners", `Updated partner: ${form.partner_name} (${form.partner_code})`);
      showToast("Partner updated.");
    } else {
      const prefix = PARTNER_TYPE_MAP[form.partner_type]?.prefix || "PTR";
      const now = new Date().toISOString();
      const rec = { ...form, partner_code: nextPartnerCode(partners, prefix), status: form.status || "Active", created_at: now, updated_at: now, created_by: who, updated_by: who };
      const { data, error } = await supabase.from("partners").insert(rec).select().single();
      if (error) { showToast("Error: " + error.message, "error"); return; }
      setPartners(ps => [data, ...ps]);
      await logAppAudit("CREATE", "Partners", `Added partner: ${data.partner_name} (${data.partner_code})`);
      showToast(`Partner ${data.partner_code} added.`);
    }
    setEditing(null); setSub("list");
  };

  const toggleStatus = async (p) => {
    const newStatus = p.status === "Active" ? "Inactive" : "Active";
    const who = currentUser?.username || currentUser?.email || "unknown";
    const { error } = await supabase.from("partners").update({ status: newStatus, updated_at: new Date().toISOString(), updated_by: who }).eq("id", p.id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setPartners(ps => ps.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    await logAppAudit(newStatus === "Active" ? "ACTIVATE" : "DEACTIVATE", "Partners", `${p.partner_name} (${p.partner_code}) → ${newStatus}`);
    showToast(`${p.partner_name} ${newStatus === "Active" ? "activated" : "deactivated"}.`);
  };

  const totalPartners = partners.length;
  const activeCount = partners.filter(p => p.status === "Active").length;
  const inactiveCount = totalPartners - activeCount;
  const countByType = (key) => partners.filter(p => p.partner_type === key).length;
  const recentPartners = [...partners].slice(0, 5);

  const KPI = [
    { label: "Total Partners", value: totalPartners, icon: Building2, grad: ["#1E3A8A", "#3B82F6"] },
    { label: "Companies", value: countByType("company"), icon: Briefcase, grad: ["#DB2777", "#F472B6"] },
    { label: "Industries", value: countByType("industry"), icon: Building2, grad: ["#7C3AED", "#A78BFA"] },
    { label: "SHGs", value: countByType("shg"), icon: Users, grad: ["#F97316", "#FDBA74"] },
    { label: "NGOs", value: countByType("ngo"), icon: Users, grad: ["#16A34A", "#4ADE80"] },
    { label: "CSR Partners", value: countByType("csr"), icon: Award, grad: ["#0EA5E9", "#38BDF8"] },
    { label: "Govt Departments", value: countByType("government"), icon: ShieldCheck, grad: ["#DC2626", "#F87171"] },
    { label: "Banks", value: countByType("bank"), icon: Briefcase, grad: ["#7C3AED", "#C4B5FD"] },
    { label: "Waste Recyclers", value: countByType("recycler"), icon: Leaf, grad: ["#16A34A", "#065F46"] },
    { label: "Training Partners", value: countByType("training_partner"), icon: BookOpen, grad: ["#F97316", "#FB923C"] },
    { label: "Placement Partners", value: countByType("placement_partner"), icon: Briefcase, grad: ["#0EA5E9", "#0369A1"] },
    { label: "Active Partners", value: activeCount, icon: CheckCircle, grad: ["#16A34A", "#22C55E"] },
    { label: "Inactive Partners", value: inactiveCount, icon: XCircle, grad: ["#6B7280", "#9CA3AF"] },
  ];

  if (sub === "form") {
    return <PartnerForm editing={editing} onSave={savePartner} onCancel={() => { setEditing(null); setSub(editing ? "profile" : "list"); }} />;
  }
  if (sub === "profile" && viewing) {
    return <PartnerProfile partner={viewing} currentUser={currentUser} showToast={showToast} onEdit={() => { setEditing(viewing); setSub("form"); }} onBack={() => { setViewing(null); setSub("list"); }} />;
  }
  if (sub === "list") {
    return (
      <PartnerList partners={partners} isAdmin={isAdmin} loading={loading}
        onAdd={() => { setEditing(null); setSub("form"); }}
        onView={p => { setViewing(p); setSub("profile"); }}
        onEdit={p => { setEditing(p); setSub("form"); }}
        onToggleStatus={toggleStatus}
        onExport={() => downloadCSV(partners.map(p => ({
          "Partner Code": p.partner_code, "Name": p.partner_name, "Type": PARTNER_TYPE_MAP[p.partner_type]?.label || p.partner_type,
          "Contact": p.contact_person, "Mobile": p.mobile, "District": p.districts, "Programs": p.supported_programs, "Status": p.status,
        })), `TAPASVI_Partners_${new Date().toISOString().slice(0, 10)}.csv`)}
        onBack={() => setSub("dashboard")} />
    );
  }

  // Dashboard
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#111827]">Partners</h2>
          <p className="text-[12px] text-[#6B7280]">Master data for external organizations</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {KPI.map(s => (
          <div key={s.label} className="rounded-2xl p-3.5 text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
            style={{ background: `linear-gradient(135deg,${s.grad[0]},${s.grad[1]})`, boxShadow: "0 8px 20px -10px rgba(0,0,0,0.25)" }}>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2"><s.icon size={15} /></div>
            <p className="text-[20px] font-bold leading-none">{loading ? "…" : s.value}</p>
            <p className="text-[10px] text-white/85 mt-1.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280] mb-2">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => { setEditing(null); setSub("form"); }} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col items-center gap-2 hover:shadow-md transition">
            <Plus size={18} className="text-[#1E3A8A]" /><span className="text-[11px] font-medium text-[#111827]">Add Partner</span>
          </button>
          <button onClick={() => setSub("list")} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col items-center gap-2 hover:shadow-md transition">
            <Users size={18} className="text-[#16A34A]" /><span className="text-[11px] font-medium text-[#111827]">View Partners</span>
          </button>
          <button onClick={() => downloadCSV(partners.map(p => ({ Code: p.partner_code, Name: p.partner_name, Type: p.partner_type, Status: p.status })), "TAPASVI_Partners.csv")}
            className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col items-center gap-2 hover:shadow-md transition">
            <Download size={18} className="text-[#7C3AED]" /><span className="text-[11px] font-medium text-[#111827]">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Recent Partners</p>
          <button onClick={() => setSub("list")} className="text-[11px] font-semibold text-[#1E3A8A]">View All →</button>
        </div>
        {recentPartners.length === 0 ? (
          <p className="text-[12px] text-[#9CA3AF] text-center py-6">No partners added yet.</p>
        ) : (
          <div className="space-y-1">
            {recentPartners.map(p => (
              <button key={p.id} onClick={() => { setViewing(p); setSub("profile"); }} className="w-full flex items-center gap-2.5 py-2 px-1.5 rounded-lg hover:bg-[#F8FAFC] text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "#1E3A8A" }}>
                  {(p.partner_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#111827] truncate">{p.partner_name}</p>
                  <p className="text-[10px] text-[#6B7280]">{p.partner_code} · {PARTNER_TYPE_MAP[p.partner_type]?.label}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerList({ partners, isAdmin, loading, onAdd, onView, onEdit, onToggleStatus, onExport, onBack }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const stateOptions = useMemo(() => [...new Set(partners.map(p => p.state).filter(Boolean))], [partners]);
  const districtOptions = useMemo(() => [...new Set(partners.flatMap(p => (p.districts || "").split(",").map(d => d.trim()).filter(Boolean)))], [partners]);
  const programOptions = useMemo(() => [...new Set(partners.flatMap(p => (p.supported_programs || "").split(",").map(d => d.trim()).filter(Boolean)))], [partners]);

  const TYPE_COLORS = { company: "#1E3A8A", industry: "#7C3AED", shg: "#F97316", ngo: "#16A34A", csr: "#0EA5E9", government: "#DC2626", bank: "#7C3AED", recycler: "#065F46", training_partner: "#F97316", placement_partner: "#0369A1" };
  const activeFilterCount = [typeFilter, stateFilter, districtFilter, programFilter, statusFilter].filter(f => f !== "all").length;

  const filtered = useMemo(() => partners.filter(p => {
    if (typeFilter !== "all" && p.partner_type !== typeFilter) return false;
    if (stateFilter !== "all" && p.state !== stateFilter) return false;
    if (districtFilter !== "all" && !(p.districts || "").includes(districtFilter)) return false;
    if (programFilter !== "all" && !(p.supported_programs || "").includes(programFilter)) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(p.partner_name?.toLowerCase().includes(q) || p.partner_code?.toLowerCase().includes(q) || p.contact_person?.toLowerCase().includes(q) || p.mobile?.includes(q))) return false;
    }
    return true;
  }), [partners, typeFilter, stateFilter, districtFilter, programFilter, statusFilter, query]);

  useEffect(() => { setPage(1); }, [query, typeFilter, stateFilter, districtFilter, programFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3), [totalPages, page]);

  return (
    <div className="relative pb-16">
      {/* Sticky header: back + title + search + collapsible filters */}
      <div className="sticky top-0 z-10 bg-[#F8FAFC] pb-3 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 mb-3 pt-1">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#F3F4F6]" style={{ minWidth: 44, minHeight: 44 }}><ChevronRight size={16} className="rotate-180" /></button>
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-[#111827]">Partner List</h2>
            <p className="text-[12px] text-[#6B7280]">{filtered.length} partner{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onExport} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 text-[12px] text-[#111827]" style={{ minHeight: 44 }}><FileSpreadsheet size={13} /> CSV</button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search code, name, contact, mobile..." className={inputCls + " pl-9 text-[12.5px]"} style={{ minHeight: 44 }} />
          </div>
          <button onClick={() => setFiltersOpen(o => !o)}
            className="flex items-center gap-1.5 rounded-xl border px-3.5 text-[12.5px] font-semibold shrink-0 transition-colors"
            style={{ minHeight: 44, minWidth: 44, borderColor: activeFilterCount > 0 ? "#1E3A8A" : "#E5E7EB", background: activeFilterCount > 0 ? "#EFF6FF" : "#fff", color: activeFilterCount > 0 ? "#1E3A8A" : "#374151" }}>
            <Filter size={14} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <ChevronRight size={13} className="transition-transform duration-300" style={{ transform: filtersOpen ? "rotate(-90deg)" : "rotate(90deg)" }} />
          </button>
        </div>

        <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: filtersOpen ? 220 : 0, opacity: filtersOpen ? 1 : 0, marginTop: filtersOpen ? 10 : 0 }}>
          <div className="flex gap-2 flex-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
              <option value="all">All Types</option>
              {PARTNER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
              <option value="all">All States</option>
              {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
              <option value="all">All Districts</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
              <option value="all">All Programs</option>
              {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls + " w-auto text-[12px]"} style={{ minHeight: 44 }}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {activeFilterCount > 0 && (
              <button onClick={() => { setTypeFilter("all"); setStateFilter("all"); setDistrictFilter("all"); setProgramFilter("all"); setStatusFilter("all"); }}
                className="text-[11.5px] font-semibold text-[#DC2626] px-2">Clear all</button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-[20px] border border-[#E5E7EB] p-4 animate-pulse" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="h-3.5 w-2/5 bg-[#F3F4F6] rounded mb-2.5" />
              <div className="h-2.5 w-1/3 bg-[#F3F4F6] rounded mb-3" />
              <div className="h-2.5 w-3/5 bg-[#F3F4F6] rounded mb-3" />
              <div className="h-9 w-full bg-[#F3F4F6] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
            <Building2 size={26} className="text-[#93C5FD]" />
          </div>
          <p className="text-[14px] font-semibold text-[#374151]">No Partners Found</p>
          <p className="text-[12px] text-[#9CA3AF] mt-1 mb-5">{partners.length === 0 ? "Get started by adding your first partner." : "Try adjusting your search or filters."}</p>
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: "#1E3A8A", minHeight: 44 }}>
            <Plus size={15} /> Add Partner
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(p => {
              const tColor = TYPE_COLORS[p.partner_type] || "#6B7280";
              const programList = (p.supported_programs || "").split(",").map(s => s.trim()).filter(Boolean);
              const shownPrograms = programList.slice(0, 2);
              const extraPrograms = programList.length - shownPrograms.length;
              const location = [p.districts, p.state].filter(Boolean).join(" / ");
              return (
                <div key={p.id} className="bg-white rounded-[22px] border border-[#E5E7EB] p-4.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" style={{ padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[#111827] truncate">{p.partner_name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="text-[10px] font-mono font-semibold text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded-md">{p.partner_code}</span>
                        <Badge label={PARTNER_TYPE_MAP[p.partner_type]?.label || "—"} color={tColor} tint={tColor + "18"} />
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0" style={{ background: p.status === "Active" ? "#DCFCE7" : "#F3F4F6", color: p.status === "Active" ? "#16A34A" : "#6B7280" }}>
                      {p.status}
                    </span>
                  </div>

                  <div className="text-[12px] text-[#4B5563] space-y-1 mb-2.5">
                    {p.mobile && <p className="truncate">📱 {p.mobile}</p>}
                    {location && <p className="truncate">📍 {location}</p>}
                  </div>

                  {shownPrograms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {shownPrograms.map(pr => (
                        <span key={pr} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">{pr}</span>
                      ))}
                      {extraPrograms > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E3A8A]">+{extraPrograms} More</span>}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => onView(p)} title="View" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] text-[12px] font-medium text-[#374151] transition hover:bg-[#F8FAFC]" style={{ minHeight: 44 }}>
                      👁 View
                    </button>
                    {isAdmin && (
                      <button onClick={() => onEdit(p)} title="Edit" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] text-[12px] font-medium text-[#1E3A8A] transition hover:bg-[#EFF6FF]" style={{ minHeight: 44 }}>
                        ✏ Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onToggleStatus(p)} title={p.status === "Active" ? "Deactivate" : "Activate"}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border text-[12px] font-medium transition"
                        style={{ minHeight: 44, borderColor: p.status === "Active" ? "#FCA5A5" : "#BBF7D0", color: p.status === "Active" ? "#DC2626" : "#16A34A" }}>
                        {p.status === "Active" ? "⏸ Deactivate" : "▶ Activate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
              <p className="text-[11.5px] text-[#6B7280]">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>← Previous</button>
                {pageNumbers.map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className="rounded-lg text-[12px] font-semibold transition-colors"
                    style={{ minWidth: 36, minHeight: 40, background: n === page ? "#1E3A8A" : "transparent", color: n === page ? "#fff" : "#374151" }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium disabled:opacity-40" style={{ minHeight: 40 }}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Add Button */}
      <button onClick={onAdd} aria-label="Add Partner"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
        style={{ background: "#1E3A8A", boxShadow: "0 10px 25px -6px rgba(30,58,138,0.5)" }}>
        <Plus size={24} />
      </button>
    </div>
  );
}

function PartnerForm({ editing, onSave, onCancel }) {
  const blank = {
    partner_name: "", partner_type: "company", registration_number: "", gst: "", pan: "",
    contact_person: "", designation: "", mobile: "", alternate_mobile: "", email: "", website: "",
    state: "Andhra Pradesh", districts: "", mandal: "", coverage_notes: "",
    supported_programs: "", address: "", village_city: "", pincode: "",
    status: "Active", remarks: "",
  };
  const [form, setForm] = useState(editing ? { ...blank, ...editing } : blank);
  const [selectedDistricts, setSelectedDistricts] = useState(new Set((editing?.districts || "").split(",").map(s => s.trim()).filter(Boolean)));
  const [selectedPrograms, setSelectedPrograms] = useState(new Set((editing?.supported_programs || "").split(",").map(s => s.trim()).filter(Boolean)));
  const [errors, setErrors] = useState({});
  const set = k => e => setForm(f => ({ ...f, [k]: e.target ? e.target.value : e }));

  const toggleDistrict = (d) => setSelectedDistricts(s => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; });
  const toggleProgram = (p) => setSelectedPrograms(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const validate = () => {
    const e = {};
    if (!form.partner_name.trim()) e.partner_name = "Required";
    if (!form.partner_type) e.partner_type = "Required";
    if (!form.contact_person.trim()) e.contact_person = "Required";
    if (!form.mobile.trim()) e.mobile = "Required";
    else if (!/^\d{10}$/.test(form.mobile)) e.mobile = "Must be 10 digits";
    if (!form.status) e.status = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSave({ ...form, districts: [...selectedDistricts].join(", "), supported_programs: [...selectedPrograms].join(", ") });
  };

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-[#111827]">{editing ? "Edit Partner" : "Add Partner"}</h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]"><X size={18} /></button>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <SectionHeader title="Basic Information" color="#1E3A8A" />
        {editing && (
          <Field label="Partner Code"><Input value={editing.partner_code} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280] font-mono"} /></Field>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Partner Name" required error={errors.partner_name}><Input value={form.partner_name} onChange={set("partner_name")} /></Field>
          <Field label="Partner Type" required error={errors.partner_type}><Select value={form.partner_type} onChange={set("partner_type")} options={PARTNER_TYPES.map(t => ({ value: t.key, label: t.label }))} /></Field>
          <Field label="Registration Number"><Input value={form.registration_number} onChange={set("registration_number")} /></Field>
          <Field label="GST (Optional)"><Input value={form.gst} onChange={set("gst")} /></Field>
          <Field label="PAN (Optional)"><Input value={form.pan} onChange={set("pan")} /></Field>
        </div>

        <SectionHeader title="Contact" color="#1E3A8A" />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Contact Person" required error={errors.contact_person}><Input value={form.contact_person} onChange={set("contact_person")} /></Field>
          <Field label="Designation"><Input value={form.designation} onChange={set("designation")} /></Field>
          <Field label="Mobile" required error={errors.mobile}><Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} inputMode="numeric" /></Field>
          <Field label="Alternate Mobile"><Input value={form.alternate_mobile} onChange={set("alternate_mobile")} inputMode="numeric" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Website"><Input value={form.website} onChange={set("website")} /></Field>
        </div>

        <SectionHeader title="Coverage Area" color="#1E3A8A" />
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="State"><Input value={form.state} onChange={set("state")} /></Field>
          <Field label="Mandal (Optional)"><Input value={form.mandal} onChange={set("mandal")} /></Field>
        </div>
        <Field label="Districts (Multi Select)">
          <div className="flex flex-wrap gap-1.5">
            {DISTRICTS_AP.map(d => (
              <button key={d} type="button" onClick={() => toggleDistrict(d)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={selectedDistricts.has(d) ? { background: "#1E3A8A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Coverage Notes"><textarea value={form.coverage_notes} onChange={set("coverage_notes")} rows={2} className={inputCls} /></Field>

        <SectionHeader title="Programs Supported" color="#1E3A8A" />
        <Field label="Programs (Multi Select)">
          <div className="flex flex-wrap gap-1.5">
            {PROGRAMS.map(p => (
              <button key={p.key} type="button" onClick={() => toggleProgram(p.label)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={selectedPrograms.has(p.label) ? { background: p.color, color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
                {p.short}
              </button>
            ))}
          </div>
        </Field>

        <SectionHeader title="Address" color="#1E3A8A" />
        <Field label="Address"><textarea value={form.address} onChange={set("address")} rows={2} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Village/City"><Input value={form.village_city} onChange={set("village_city")} /></Field>
          <Field label="Pincode"><Input value={form.pincode} onChange={set("pincode")} /></Field>
        </div>

        <SectionHeader title="Status" color="#1E3A8A" />
        <Field label="Status" required error={errors.status}><Select value={form.status} onChange={set("status")} options={["Active", "Inactive"]} /></Field>
        <Field label="Remarks"><textarea value={form.remarks} onChange={set("remarks")} rows={2} className={inputCls} /></Field>

        <div className="flex gap-3 mt-4 pt-4 border-t border-[#F3F4F6]">
          <button onClick={submit} className="rounded-lg px-6 py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save</button>
          <button onClick={onCancel} className="rounded-lg border border-[#E5E7EB] px-6 py-2.5 text-[13px] font-medium text-[#111827]">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PartnerProfile({ partner: p, onEdit, onBack, currentUser, showToast }) {
  const [tab, setTab] = useState("overview");
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [counts, setCounts] = useState({ programs: 0, batches: 0, beneficiaries: 0, districts: 0 });

  useEffect(() => {
    (async () => {
      const [pr, bt, lv, cv] = await Promise.all([
        supabase.from("partner_programs").select("id", { count: "exact", head: true }).eq("partner_id", p.id).eq("status", "Active"),
        supabase.from("partner_training_batches").select("id", { count: "exact", head: true }).eq("partner_id", p.id).eq("status", "Active"),
        supabase.from("partner_livelihood").select("beneficiary_count").eq("partner_id", p.id).eq("status", "Active"),
        supabase.from("partner_coverage").select("district").eq("partner_id", p.id).eq("status", "Active"),
      ]);
      setCounts({
        programs: pr.count || 0,
        batches: bt.count || 0,
        beneficiaries: (lv.data || []).reduce((s, l) => s + (l.beneficiary_count || 0), 0),
        districts: new Set((cv.data || []).map(c => c.district).filter(Boolean)).size,
      });
    })();
  }, [p.id]);

  useEffect(() => {
    (async () => {
      setLoadingActivity(true);
      const { data } = await supabase.from("audit_logs").select("*")
        .eq("module", "Partners").ilike("details", `%${p.partner_code}%`)
        .order("created_at", { ascending: false }).limit(10);
      setActivity(data || []);
      setLoadingActivity(false);
    })();
  }, [p.partner_code]);

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "projects", label: "Projects" },
    { key: "training", label: "Training" },
    { key: "coverage", label: "Coverage" },
    { key: "livelihood", label: "Livelihood" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold text-[#111827]">{p.partner_name}</h2>
          <p className="text-[11.5px] text-[#6B7280] font-mono">{p.partner_code} · {PARTNER_TYPE_MAP[p.partner_type]?.label}</p>
        </div>
        <button onClick={onEdit} className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-medium text-[#1E3A8A]">Edit</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-colors shrink-0"
            style={tab === t.key ? { background: "#1E3A8A", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center"><p className="text-[16px] font-bold text-[#1E3A8A]">{counts.programs}</p><p className="text-[9px] text-[#6B7280]">Programs</p></div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center"><p className="text-[16px] font-bold text-[#7C3AED]">{counts.batches}</p><p className="text-[9px] text-[#6B7280]">Batches</p></div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center"><p className="text-[16px] font-bold text-[#16A34A]">{counts.districts}</p><p className="text-[9px] text-[#6B7280]">Districts</p></div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5 text-center"><p className="text-[16px] font-bold text-[#F97316]">{counts.beneficiaries}</p><p className="text-[9px] text-[#6B7280]">Beneficiaries</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
            <SectionHeader title="Overview" color="#1E3A8A" />
            <div className="grid grid-cols-2 gap-y-3">
              <InfoRow label="Registration No." value={p.registration_number} />
              <InfoRow label="GST" value={p.gst} />
              <InfoRow label="PAN" value={p.pan} />
              <InfoRow label="Status" value={p.status} />
            </div>

            <SectionHeader title="Contact Details" color="#1E3A8A" />
            <div className="grid grid-cols-2 gap-y-3">
              <InfoRow label="Contact Person" value={p.contact_person} />
              <InfoRow label="Designation" value={p.designation} />
              <InfoRow label="Mobile" value={p.mobile} />
              <InfoRow label="Alternate Mobile" value={p.alternate_mobile} />
              <InfoRow label="Email" value={p.email} />
              <InfoRow label="Website" value={p.website} />
            </div>

            <SectionHeader title="Coverage Area" color="#1E3A8A" />
            <div className="grid grid-cols-2 gap-y-3">
              <InfoRow label="State" value={p.state} />
              <InfoRow label="Mandal" value={p.mandal} />
              <InfoRow label="Districts" value={p.districts} />
            </div>
            {p.coverage_notes && <p className="text-[12px] text-[#6B7280] mt-2">{p.coverage_notes}</p>}

            <SectionHeader title="Programs Supported" color="#1E3A8A" />
            <p className="text-[12.5px] text-[#111827]">{p.supported_programs || "—"}</p>

            <SectionHeader title="Address" color="#1E3A8A" />
            <p className="text-[12.5px] text-[#111827]">{p.address}{p.village_city ? `, ${p.village_city}` : ""}{p.pincode ? ` — ${p.pincode}` : ""}</p>

            {p.remarks && (
              <>
                <SectionHeader title="Remarks" color="#1E3A8A" />
                <p className="text-[12.5px] text-[#111827]">{p.remarks}</p>
              </>
            )}

            <SectionHeader title="Audit Information" color="#1E3A8A" />
            <div className="grid grid-cols-2 gap-y-3">
              <InfoRow label="Created At" value={p.created_at ? new Date(p.created_at).toLocaleString() : "—"} />
              <InfoRow label="Updated At" value={p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"} />
              <InfoRow label="Created By" value={p.created_by} />
              <InfoRow label="Updated By" value={p.updated_by} />
            </div>
          </div>

          {/* Activity History — basic version using the existing audit_logs pattern */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mb-4">
            <SectionHeader title="Activity History" color="#1E3A8A" />
            {loadingActivity ? (
              <p className="text-[12px] text-[#9CA3AF] text-center py-4">Loading...</p>
            ) : activity.length === 0 ? (
              <p className="text-[12px] text-[#9CA3AF] text-center py-4">No activity recorded yet.</p>
            ) : (
              <div className="space-y-0">
                {activity.map((a, i) => (
                  <div key={a.id || i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: a.action === "CREATE" ? "#16A34A" : a.action === "DEACTIVATE" ? "#DC2626" : "#1E3A8A" }} />
                      {i < activity.length - 1 && <div className="w-px flex-1 min-h-[20px] bg-[#E5E7EB]" />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <p className="text-[11.5px] text-[#111827] leading-snug">{a.details || a.action}</p>
                      <p className="text-[9.5px] text-[#9CA3AF] mt-0.5">{a.user_email || "—"} · {a.created_at ? new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#F8FAFC] rounded-2xl border border-dashed border-[#E5E7EB] p-5 text-center">
            <p className="text-[11px] text-[#9CA3AF]">Reports — coming soon</p>
          </div>
        </>
      )}

      {tab === "projects" && <PartnerProjectsTab partner={p} currentUser={currentUser} showToast={showToast} />}
      {tab === "training" && <PartnerTrainingTab partner={p} currentUser={currentUser} showToast={showToast} />}
      {tab === "coverage" && <PartnerCoverageTab partner={p} currentUser={currentUser} showToast={showToast} />}
      {tab === "livelihood" && <PartnerLivelihoodTab partner={p} currentUser={currentUser} showToast={showToast} />}
      {tab === "documents" && <DocumentRepository entityType="partner" entityId={p.id} currentUser={currentUser} showToast={showToast} />}
    </div>
  );
}

const PARTNER_ROLES = ["Funding Partner", "Implementation Partner", "Training Partner", "Placement Partner", "Technical Partner", "Monitoring Partner", "CSR Partner"];
const LIVELIHOOD_LINK_TYPES = ["Employment", "Self Employment", "Entrepreneurship", "Skill Development", "Apprenticeship", "Internship", "Placement", "Other"];

function LinkEmptyState({ label }) {
  return (
    <div className="text-center py-10 text-[#9CA3AF]">
      <p className="text-[12.5px]">No {label}.</p>
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl max-w-[340px] w-full p-5" onClick={e => e.stopPropagation()}>
        <p className="text-[14.5px] font-bold text-[#111827] mb-1.5">{title}</p>
        <p className="text-[12.5px] text-[#6B7280] leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-[#E5E7EB] py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: "#DC2626" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function PartnerProjectsTab({ partner, currentUser, showToast }) {
  const blankForm = { program: PROGRAMS[0].key, partner_role: PARTNER_ROLES[0], effective_from: "", effective_to: "", remarks: "" };
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_programs").select("*").eq("partner_id", partner.id).order("linked_on", { ascending: false });
    setLinks(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [partner.id]);

  const openAdd = () => { setEditingLink(null); setForm(blankForm); setErr(""); setShowForm(true); };
  const openEdit = (l) => { setEditingLink(l); setForm({ program: l.program, partner_role: l.partner_role, effective_from: l.effective_from || "", effective_to: l.effective_to || "", remarks: l.remarks || "" }); setErr(""); setShowForm(true); };

  const submit = async () => {
    setErr("");
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editingLink) {
      const { error } = await supabase.from("partner_programs").update({ ...form, updated_by: who, updated_on: new Date().toISOString() }).eq("id", editingLink.id);
      if (error) { setErr(error.message); return; }
      setShowForm(false); load(); showToast && showToast("Updated Successfully");
    } else {
      const dup = links.find(l => l.program === form.program && l.partner_role === form.partner_role && l.status === "Active");
      if (dup) { setErr("This partner is already linked to this program with this role."); return; }
      const { error } = await supabase.from("partner_programs").insert({ ...form, partner_id: partner.id, status: "Active", linked_by: who, linked_on: new Date().toISOString(), updated_by: who, updated_on: new Date().toISOString() });
      if (error) { setErr(error.message.includes("duplicate") ? "This link already exists." : error.message); return; }
      setShowForm(false); load(); showToast && showToast("Linked Successfully");
    }
  };

  const toggleStatus = async (l) => {
    const newStatus = l.status === "Active" ? "Inactive" : "Active";
    await supabase.from("partner_programs").update({ status: newStatus, updated_by: currentUser?.username, updated_on: new Date().toISOString() }).eq("id", l.id);
    load(); showToast && showToast(`Updated Successfully`);
  };

  const confirmDelete = async () => {
    await supabase.from("partner_programs").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); load(); showToast && showToast("Deleted Successfully");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Linked Programs ({links.filter(l => l.status === "Active").length})</p>
        <button onClick={openAdd} className="text-[11.5px] font-semibold text-[#1E3A8A]">+ Link Program</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          {err && <p className="text-[11.5px] text-[#DC2626] mb-2">⚠ {err}</p>}
          <Field label="Program"><Select value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} options={PROGRAMS.map(p => ({ value: p.key, label: p.label }))} /></Field>
          <Field label="Partner Role"><Select value={form.partner_role} onChange={e => setForm(f => ({ ...f, partner_role: e.target.value }))} options={PARTNER_ROLES} /></Field>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Effective From"><Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></Field>
            <Field label="Effective To"><Input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} /></Field>
          </div>
          <Field label="Remarks"><textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save Link</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-1/3 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : links.length === 0 ? <LinkEmptyState label="Programs Linked Yet" /> : (
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-[#111827]">{PROGRAM_MAP[l.program]?.label || l.program}</p>
                  <p className="text-[11px] text-[#6B7280]">{l.partner_role}{l.effective_from ? ` · ${l.effective_from} → ${l.effective_to || "—"}` : ""}</p>
                  {l.remarks && <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">{l.remarks}</p>}
                </div>
                <Badge label={l.status} color={l.status === "Active" ? "#16A34A" : "#6B7280"} tint={l.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => toggleStatus(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#374151]">{l.status === "Active" ? "Deactivate" : "Activate"}</button>
                <button onClick={() => setDeleteTarget(l)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Program Link?" message={`Remove the link to ${PROGRAM_MAP[deleteTarget.program]?.label || deleteTarget.program}? This cannot be undone.`}
          onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

function PartnerTrainingTab({ partner, currentUser, showToast }) {
  const [links, setLinks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const [lk, bt] = await Promise.all([
      supabase.from("partner_training_batches").select("*, batch_trainings(*)").eq("partner_id", partner.id).order("linked_on", { ascending: false }),
      supabase.from("batch_trainings").select("*"),
    ]);
    setLinks(lk.data || []);
    setBatches(bt.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [partner.id]);

  const openAdd = () => { setEditingLink(null); setSelectedBatch(""); setRemarks(""); setErr(""); setShowForm(true); };
  const openEdit = (l) => { setEditingLink(l); setSelectedBatch(l.batch_id); setRemarks(l.remarks || ""); setErr(""); setShowForm(true); };

  const submit = async () => {
    setErr("");
    if (!selectedBatch) { setErr("Select a training batch."); return; }
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editingLink) {
      const { error } = await supabase.from("partner_training_batches").update({ batch_id: selectedBatch, remarks, updated_by: who, updated_on: new Date().toISOString() }).eq("id", editingLink.id);
      if (error) { setErr(error.message); return; }
      setShowForm(false); load(); showToast && showToast("Updated Successfully");
    } else {
      const dup = links.find(l => l.batch_id === selectedBatch && l.status === "Active");
      if (dup) { setErr("This batch is already linked."); return; }
      const { error } = await supabase.from("partner_training_batches").insert({ partner_id: partner.id, batch_id: selectedBatch, remarks, status: "Active", linked_by: who, linked_on: new Date().toISOString(), updated_by: who, updated_on: new Date().toISOString() });
      if (error) { setErr(error.message.includes("duplicate") ? "This batch is already linked." : error.message); return; }
      setShowForm(false); load(); showToast && showToast("Linked Successfully");
    }
  };

  const toggleStatus = async (l) => {
    const newStatus = l.status === "Active" ? "Inactive" : "Active";
    await supabase.from("partner_training_batches").update({ status: newStatus, updated_by: currentUser?.username, updated_on: new Date().toISOString() }).eq("id", l.id);
    load(); showToast && showToast("Updated Successfully");
  };

  const confirmDelete = async () => {
    await supabase.from("partner_training_batches").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); load(); showToast && showToast("Deleted Successfully");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Linked Training Batches ({links.filter(l => l.status === "Active").length})</p>
        <button onClick={openAdd} className="text-[11.5px] font-semibold text-[#1E3A8A]">+ Link Batch</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          {err && <p className="text-[11.5px] text-[#DC2626] mb-2">⚠ {err}</p>}
          <Field label="Training Batch">
            <Select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} placeholder="Select batch"
              options={batches.map(b => ({ value: b.batch_id, label: `${b.training_name} · ${b.venue}` }))} />
          </Field>
          {selectedBatch && (() => {
            const b = batches.find(x => x.batch_id === selectedBatch);
            return b ? <p className="text-[11px] text-[#6B7280] -mt-2 mb-3">Trainer: {b.trainer_name || "—"} · {b.start_date} → {b.end_date}</p> : null;
          })()}
          <Field label="Remarks"><textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save Link</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-3/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : links.length === 0 ? <LinkEmptyState label="Training Batches Linked Yet" /> : (
        <div className="space-y-2">
          {links.map(l => {
            const b = l.batch_trainings;
            return (
              <div key={l.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#111827]">{b?.training_name || "—"}</p>
                    <p className="text-[11px] text-[#6B7280]">{PROGRAM_MAP[b?.program]?.short} · {b?.trainer_name || "—"} · {b?.venue || "—"} · {b?.start_date} → {b?.end_date}</p>
                    {l.remarks && <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">{l.remarks}</p>}
                  </div>
                  <Badge label={l.status} color={l.status === "Active" ? "#16A34A" : "#6B7280"} tint={l.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                  <button onClick={() => toggleStatus(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#374151]">{l.status === "Active" ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => setDeleteTarget(l)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Training Link?" message="Remove this training batch link? This cannot be undone."
          onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

function PartnerCoverageTab({ partner, currentUser, showToast }) {
  const blankForm = { state: "Andhra Pradesh", district: "", mandal: "", village: "" };
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_coverage").select("*").eq("partner_id", partner.id).order("linked_on", { ascending: false });
    setLinks(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [partner.id]);

  const openAdd = () => { setEditingLink(null); setForm(blankForm); setErr(""); setShowForm(true); };
  const openEdit = (l) => { setEditingLink(l); setForm({ state: l.state || "Andhra Pradesh", district: l.district || "", mandal: l.mandal || "", village: l.village || "" }); setErr(""); setShowForm(true); };

  const submit = async () => {
    setErr("");
    if (!form.district.trim()) { setErr("District is required."); return; }
    const who = currentUser?.username || currentUser?.email || "unknown";
    if (editingLink) {
      const { error } = await supabase.from("partner_coverage").update({ ...form, updated_by: who, updated_on: new Date().toISOString() }).eq("id", editingLink.id);
      if (error) { setErr(error.message); return; }
      setShowForm(false); load(); showToast && showToast("Updated Successfully");
    } else {
      const dup = links.find(l => l.status === "Active" && l.district === form.district && (l.mandal || "") === (form.mandal || "") && (l.village || "") === (form.village || ""));
      if (dup) { setErr("This coverage area is already added."); return; }
      const { error } = await supabase.from("partner_coverage").insert({ ...form, partner_id: partner.id, status: "Active", linked_by: who, linked_on: new Date().toISOString(), updated_by: who, updated_on: new Date().toISOString() });
      if (error) { setErr(error.message); return; }
      setShowForm(false); load(); showToast && showToast("Added Successfully");
    }
  };

  const toggleStatus = async (l) => {
    const newStatus = l.status === "Active" ? "Inactive" : "Active";
    await supabase.from("partner_coverage").update({ status: newStatus, updated_by: currentUser?.username, updated_on: new Date().toISOString() }).eq("id", l.id);
    load(); showToast && showToast("Updated Successfully");
  };

  const confirmDelete = async () => {
    await supabase.from("partner_coverage").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); load(); showToast && showToast("Deleted Successfully");
  };

  const activeCoverage = links.filter(l => l.status === "Active");
  const districtCount = new Set(activeCoverage.map(l => l.district).filter(Boolean)).size;
  const villageCount = new Set(activeCoverage.map(l => l.village).filter(Boolean)).size;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center"><p className="text-[18px] font-bold text-[#1E3A8A]">{districtCount}</p><p className="text-[10px] text-[#6B7280]">Districts</p></div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center"><p className="text-[18px] font-bold text-[#16A34A]">{villageCount}</p><p className="text-[10px] text-[#6B7280]">Villages</p></div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Coverage Areas</p>
        <button onClick={openAdd} className="text-[11.5px] font-semibold text-[#1E3A8A]">+ Add Coverage</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          {err && <p className="text-[11.5px] text-[#DC2626] mb-2">⚠ {err}</p>}
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="State"><Input value={form.state} readOnly className={inputCls + " bg-[#F3F4F6] text-[#6B7280]"} /></Field>
            <Field label="District" required><Select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} options={DISTRICTS_AP} placeholder="Select district" /></Field>
            <Field label="Mandal"><Input value={form.mandal} onChange={e => setForm(f => ({ ...f, mandal: e.target.value }))} /></Field>
            <Field label="Village"><Input value={form.village} onChange={e => setForm(f => ({ ...f, village: e.target.value }))} /></Field>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save Coverage</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 animate-pulse"><div className="h-3 w-3/5 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : links.length === 0 ? <LinkEmptyState label="Coverage Areas Linked Yet" /> : (
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[12.5px] font-semibold text-[#111827]">{[l.village, l.mandal, l.district, l.state].filter(Boolean).join(", ")}</p>
                <Badge label={l.status} color={l.status === "Active" ? "#16A34A" : "#6B7280"} tint={l.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => toggleStatus(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#374151]">{l.status === "Active" ? "Deactivate" : "Activate"}</button>
                <button onClick={() => setDeleteTarget(l)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Coverage Area?" message="Remove this coverage area? This cannot be undone."
          onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

function PartnerLivelihoodTab({ partner, currentUser, showToast }) {
  const blankForm = { livelihood_type: LIVELIHOOD_LINK_TYPES[0], beneficiary_count: "", remarks: "" };
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_livelihood").select("*").eq("partner_id", partner.id).order("linked_on", { ascending: false });
    setLinks(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [partner.id]);

  const openAdd = () => { setEditingLink(null); setForm(blankForm); setErr(""); setShowForm(true); };
  const openEdit = (l) => { setEditingLink(l); setForm({ livelihood_type: l.livelihood_type, beneficiary_count: String(l.beneficiary_count || ""), remarks: l.remarks || "" }); setErr(""); setShowForm(true); };

  const submit = async () => {
    setErr("");
    const who = currentUser?.username || currentUser?.email || "unknown";
    const payload = { livelihood_type: form.livelihood_type, beneficiary_count: parseInt(form.beneficiary_count) || 0, remarks: form.remarks };
    if (editingLink) {
      const { error } = await supabase.from("partner_livelihood").update({ ...payload, updated_by: who, updated_on: new Date().toISOString() }).eq("id", editingLink.id);
      if (error) { setErr(error.message); return; }
      setShowForm(false); load(); showToast && showToast("Updated Successfully");
    } else {
      const dup = links.find(l => l.livelihood_type === form.livelihood_type && l.status === "Active");
      if (dup) { setErr("This livelihood activity is already linked."); return; }
      const { error } = await supabase.from("partner_livelihood").insert({ ...payload, partner_id: partner.id, status: "Active", linked_by: who, linked_on: new Date().toISOString(), updated_by: who, updated_on: new Date().toISOString() });
      if (error) { setErr(error.message.includes("duplicate") ? "This link already exists." : error.message); return; }
      setShowForm(false); load(); showToast && showToast("Linked Successfully");
    }
  };

  const toggleStatus = async (l) => {
    const newStatus = l.status === "Active" ? "Inactive" : "Active";
    await supabase.from("partner_livelihood").update({ status: newStatus, updated_by: currentUser?.username, updated_on: new Date().toISOString() }).eq("id", l.id);
    load(); showToast && showToast("Updated Successfully");
  };

  const confirmDelete = async () => {
    await supabase.from("partner_livelihood").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null); load(); showToast && showToast("Deleted Successfully");
  };

  const totalBeneficiaries = links.filter(l => l.status === "Active").reduce((s, l) => s + (l.beneficiary_count || 0), 0);

  return (
    <div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center mb-4">
        <p className="text-[20px] font-bold text-[#16A34A]">{totalBeneficiaries}</p>
        <p className="text-[10.5px] text-[#6B7280]">Beneficiaries Supported</p>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">Livelihood Activities</p>
        <button onClick={openAdd} className="text-[11.5px] font-semibold text-[#1E3A8A]">+ Add Activity</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-4">
          {err && <p className="text-[11.5px] text-[#DC2626] mb-2">⚠ {err}</p>}
          <Field label="Livelihood Type"><Select value={form.livelihood_type} onChange={e => setForm(f => ({ ...f, livelihood_type: e.target.value }))} options={LIVELIHOOD_LINK_TYPES} /></Field>
          <Field label="Beneficiary Count"><Input type="number" value={form.beneficiary_count} onChange={e => setForm(f => ({ ...f, beneficiary_count: e.target.value }))} /></Field>
          <Field label="Remarks"><textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded-lg py-2.5 text-[13px] font-bold text-white" style={{ background: "#16A34A" }}>Save Link</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#E5E7EB] px-5 py-2.5 text-[13px] font-medium text-[#374151]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 animate-pulse"><div className="h-3 w-2/5 bg-[#F3F4F6] rounded mb-2" /><div className="h-2.5 w-1/3 bg-[#F3F4F6] rounded" /></div>)}</div>
      ) : links.length === 0 ? <LinkEmptyState label="Livelihood Activities Linked Yet" /> : (
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-[#111827]">{l.livelihood_type}</p>
                  <p className="text-[11px] text-[#6B7280]">{l.beneficiary_count || 0} beneficiaries</p>
                  {l.remarks && <p className="text-[10.5px] text-[#9CA3AF] mt-0.5">{l.remarks}</p>}
                </div>
                <Badge label={l.status} color={l.status === "Active" ? "#16A34A" : "#6B7280"} tint={l.status === "Active" ? "#DCFCE7" : "#F3F4F6"} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#1E3A8A]">Edit</button>
                <button onClick={() => toggleStatus(l)} className="flex-1 rounded-lg border border-[#E5E7EB] py-1.5 text-[11px] font-medium text-[#374151]">{l.status === "Active" ? "Deactivate" : "Activate"}</button>
                <button onClick={() => setDeleteTarget(l)} className="flex-1 rounded-lg border border-[#FCA5A5] py-1.5 text-[11px] font-medium text-[#DC2626]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Livelihood Link?" message="Remove this livelihood activity link? This cannot be undone."
          onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
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
  const [authChecking, setAuthChecking] = useState(true);
  const [view, setView] = useState("dashboard");
  const [subView, setSubView] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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

  // Restore login on page refresh instead of forcing a logout: Admin/Super
  // Admin sessions already persist via Supabase Auth's own storage — we just
  // never checked for one on load. Field Workers have no Supabase Auth
  // session (custom app_users table check at login), so their login is
  // persisted separately in localStorage and re-verified (still active)
  // here before restoring.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single();
          if (roleData && (roleData.role === "admin" || roleData.role === "super_admin")) {
            if (!cancelled) { setUser({ role: roleData.role, username: session.user.email, supabaseUser: session.user }); setAuthChecking(false); }
            return;
          }
        }
      } catch (_) { /* fall through to field worker check */ }
      try {
        const stored = localStorage.getItem("tapasvi_fw_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          const { data: fwData } = await supabase.from("app_users").select("id, full_name, role, status, must_change_password").eq("id", parsed.userId).eq("role", "fieldworker").single();
          if (fwData && fwData.status === "active") {
            if (!cancelled) { setUser({ role: "fieldworker", username: fwData.full_name, mustChangePassword: !!fwData.must_change_password, userId: fwData.id }); setAuthChecking(false); }
            return;
          }
          localStorage.removeItem("tapasvi_fw_session");
        }
      } catch (_) { /* non-fatal — falls through to login screen */ }
      if (!cancelled) setAuthChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Trap the hardware/gesture back button inside the app instead of exiting
  // it: every time the user navigates one level deeper (a view change, a
  // subview, a beneficiary profile, or the drawer opening), we push a guard
  // history entry. Pressing back then pops that guard — we catch it via
  // popstate and unwind one level of app state instead of letting the
  // browser leave the page. At the true root (Dashboard, nothing open),
  // back is left alone and behaves normally.
  useEffect(() => {
    if (!user || authChecking) return;
    window.history.pushState({ tapasviGuard: true }, "", window.location.href);
    const onPopState = () => {
      if (subView) { setSubView(null); window.history.pushState({ tapasviGuard: true }, "", window.location.href); return; }
      if (profileBeneficiary) { setProfileBeneficiary(null); window.history.pushState({ tapasviGuard: true }, "", window.location.href); return; }
      if (drawerOpen) { setDrawerOpen(false); window.history.pushState({ tapasviGuard: true }, "", window.location.href); return; }
      if (view !== "dashboard") { setView("dashboard"); window.history.pushState({ tapasviGuard: true }, "", window.location.href); return; }
      // Already at the true root — allow the back navigation to proceed.
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user, authChecking, subView, profileBeneficiary, drawerOpen, view]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const rbac = useRBAC(user);
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
    try { localStorage.removeItem("tapasvi_fw_session"); } catch (_) { /* non-fatal */ }
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
        (form.aadhaar_number && b.aadhaar_number === form.aadhaar_number)
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
      let beneficiary_id, insertError, rec;
      for (let attempt = 0; attempt < 4; attempt++) {
        // Always ask the live database for the latest ID with this prefix — the local `beneficiaries`
        // list can be stale if another field worker registered someone moments ago, which is what
        // caused the duplicate-key errors.
        const { data: latest } = await supabase
          .from("beneficiaries_v2")
          .select("beneficiary_id")
          .like("beneficiary_id", `${prefix}-%`)
          .order("beneficiary_id", { ascending: false })
          .limit(1);
        const lastNum = latest?.[0]?.beneficiary_id?.match(/(\d+)$/);
        const localNext = nextId(beneficiaries, prefix).match(/(\d+)$/);
        const nextNum = Math.max(lastNum ? parseInt(lastNum[1], 10) : 0, localNext ? parseInt(localNext[1], 10) : 0) + 1 + attempt;
        beneficiary_id = `${prefix}-${String(nextNum).padStart(4, "0")}`;
        rec = { ...form, beneficiary_id, created_at: new Date().toISOString() };
        const { error } = await supabase.from("beneficiaries_v2").insert(rec);
        insertError = error;
        if (!error) break;
        if (!(error.message || "").includes("duplicate key")) break; // some other error — don't keep retrying
      }
      if (insertError) { showToast("Error: " + insertError.message, "error"); return; }
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

  const completeTraining = async (batchToComplete) => {
    if (!batchToComplete) return;
    if (!isAdmin && batchToComplete.assigned_field_worker !== user.username) {
      showToast("This training is not assigned to you. You cannot end it.", "error");
      return;
    }
    if (batchToComplete.status === "Completed") return; // already completed — no-op, guards against duplicate transition
    const { error } = await supabase.from("batch_trainings").update({ status: "Completed" }).eq("batch_id", batchToComplete.batch_id);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    setBatches(bs => bs.map(b => b.batch_id === batchToComplete.batch_id ? { ...b, status: "Completed" } : b));
    setActiveBatch(b => b && b.batch_id === batchToComplete.batch_id ? { ...b, status: "Completed" } : b);

    // Same cascade as the admin edit-form completion path: release active enrollments so beneficiaries are free for new batches.
    const toRelease = enrollments.filter(e => e.batch_id === batchToComplete.batch_id && (e.enrollment_status || "Active") === "Active");
    if (toRelease.length > 0) {
      const { error: relError } = await supabase.from("training_enrollments").update({ enrollment_status: "Completed" }).eq("batch_id", batchToComplete.batch_id).eq("enrollment_status", "Active");
      if (!relError) {
        setEnrollments(es => es.map(e => e.batch_id === batchToComplete.batch_id && (e.enrollment_status || "Active") === "Active" ? { ...e, enrollment_status: "Completed" } : e));
      }
    }
    await logTrainingAudit("Training Completed", `${batchToComplete.training_name} marked Completed`);
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

  if (authChecking) return <div className="min-h-screen flex items-center justify-center text-[13px] text-[#6B7280]">Loading…</div>;
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

  const goTo = (v) => { setView(v); setSubView(null); setEditing(null); setProfileBeneficiary(null); setDrawerOpen(false); };
  const goToTraining = (sub) => { setView("training"); setSubView(null); setTrainingSubView(sub); setDrawerOpen(false); };

  const MENU_SECTIONS = [
    {
      section: "MAIN",
      items: [
        { key: "dashboard", label: "Dashboard", emoji: "🏠", icon: LayoutDashboard, onClick: () => goTo("dashboard"), active: view === "dashboard" },
        { key: "beneficiaries", label: "Beneficiaries", emoji: "👥", icon: Users, onClick: () => goTo("beneficiaries"), active: view === "beneficiaries" },
        { key: "ocr-import", label: "Smart Import (OCR)", emoji: "📇", icon: ClipboardList, onClick: () => goTo("ocr-import"), active: view === "ocr-import" },
        { key: "bulk-ai-import", label: "Bulk AI Import", emoji: "🤖", icon: FileSpreadsheet, onClick: () => goTo("bulk-ai-import"), active: view === "bulk-ai-import" },
        { key: "aadhaar-match", label: "Aadhaar Auto-Match", emoji: "🪪", icon: CreditCard, onClick: () => goTo("aadhaar-match"), active: view === "aadhaar-match" },
        { key: "training", label: "Training", emoji: "🎓", icon: BookOpen, onClick: () => goTo("training"), active: view === "training" && !trainingSubView },
      ],
    },
    {
      section: "OPERATIONS",
      items: [
        { key: "attendance", label: "Attendance", emoji: "📅", icon: CheckCircle, onClick: () => goToTraining(null) },
        ...(isAdmin ? [{ key: "assessments", label: "Assessments", emoji: "📝", icon: ClipboardList, onClick: () => goToTraining("assessment-management"), active: trainingSubView === "assessment-management" }] : []),
        ...(isAdmin ? [{ key: "certificates", label: "Certificates", emoji: "🏆", icon: Award, onClick: () => goToTraining("certificate-generation"), active: trainingSubView === "certificate-generation" }] : []),
        { key: "employment", label: "Livelihood & Outcomes", emoji: "💼", icon: Briefcase, onClick: () => goTo("employment"), active: view === "employment" },
        ...(isAdmin ? [{ key: "villages", label: "Villages", emoji: "🏘", icon: MapPin, onClick: () => goTo("villages"), active: view === "villages" }] : []),
        { key: "reports", label: "Reports", emoji: "📊", icon: BarChart3, onClick: () => goTo("reports"), active: view === "reports" },
      ],
    },
    {
      section: "ADMINISTRATION",
      items: [
        ...(isAdmin ? [{ key: "users", label: "Users", emoji: "👤", icon: Lock, onClick: () => goTo("users"), active: view === "users" }] : []),
        ...(isAdmin ? [{ key: "partners", label: "Partners", emoji: "🤝", icon: Building2, onClick: () => goTo("partners"), active: view === "partners" }] : []),
        ...(rbac.canView("Waste Management") ? [{ key: "waste-management", label: "Waste Management", emoji: "♻️", icon: Leaf, onClick: () => goTo("waste-management"), active: view === "waste-management" }] : []),
        ...(isAdmin ? [{ key: "waste-collection", label: "Daily Collection", emoji: "♻", icon: Leaf, onClick: () => goTo("waste-collection"), active: view === "waste-collection" }] : []),
        ...(rbac.canView("Waste Management") ? [{ key: "waste-villages", label: "Villages", emoji: "📍", icon: MapPin, onClick: () => goTo("waste-villages"), active: view === "waste-villages" }] : []),
        ...(rbac.canView("Waste Management") ? [{ key: "waste-meetings", label: "Meetings", emoji: "📅", icon: ClipboardList, onClick: () => goTo("waste-meetings"), active: view === "waste-meetings" }] : []),
        ...(rbac.canView("Waste Management") ? [{ key: "waste-awareness", label: "Awareness Campaigns", emoji: "📢", icon: AlertCircle, onClick: () => goTo("waste-awareness"), active: view === "waste-awareness" }] : []),
        ...(isSuperAdmin ? [{ key: "settings", label: "Settings", emoji: "⚙️", icon: SettingsIcon, onClick: () => goTo("settings"), active: view === "settings" }] : []),
      ],
    },
    {
      section: "SUPPORT",
      items: [
        { key: "help", label: "Help & Support", emoji: "❓", icon: AlertCircle, onClick: () => { setDrawerOpen(false); setShowHelp(true); } },
        { key: "logout", label: "Logout", emoji: "🚪", icon: LogOut, onClick: () => { setDrawerOpen(false); handleLogout(); }, danger: true },
      ],
    },
  ].filter(s => s.items.length > 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex" style={{ fontFamily: "Inter, Manrope, Arial, sans-serif" }}>
      <style>{`* { box-sizing: border-box; } @keyframes fadein { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>

      {/* Sidebar (desktop) */}
      <aside className={"bg-white border-r border-[#E5E7EB] hidden md:flex flex-col shrink-0 transition-all duration-300"} style={{ width: sidebarCollapsed ? 76 : 240 }}>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#F3F4F6]">
          <Logo size={30} />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1E3A8A] truncate" style={{ fontFamily: "Manrope,Arial,sans-serif", fontWeight: 900 }}>TAPASVI</p>
              <p className="text-[10px] text-[#999] truncate">{isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Field Worker"}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
          {MENU_SECTIONS.filter(s => s.section !== "SUPPORT").map(s => (
            <div key={s.section}>
              {!sidebarCollapsed && <p className="text-[9.5px] font-bold tracking-wider text-[#9CA3AF] px-3 mb-1">{s.section}</p>}
              <div className="space-y-0.5">
                {s.items.map(item => (
                  <button key={item.key} onClick={item.onClick} title={sidebarCollapsed ? item.label : undefined}
                    className={"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 " + (sidebarCollapsed ? "justify-center" : "")}
                    style={item.active ? { background: "#16A34A", color: "#fff" } : { color: "#374151" }}>
                    <item.icon size={16} className="shrink-0" />{!sidebarCollapsed && item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-3 space-y-0.5 border-t border-[#F3F4F6] pt-3">
          <button onClick={() => setSidebarCollapsed(c => !c)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] transition">
            <ChevronRight size={15} className={"transition-transform duration-300 " + (sidebarCollapsed ? "" : "rotate-180")} /> {!sidebarCollapsed && "Collapse"}
          </button>
          <button onClick={loadAll} className={"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] transition " + (sidebarCollapsed ? "justify-center" : "")}>
            <RefreshCw size={15} className="shrink-0" /> {!sidebarCollapsed && "Refresh Data"}
          </button>
          <button onClick={handleLogout} className={"w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#F97316] hover:bg-[#FFF7ED] transition " + (sidebarCollapsed ? "justify-center" : "")}>
            <LogOut size={15} className="shrink-0" /> {!sidebarCollapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="p-1 -ml-1 rounded-lg active:bg-[#F3F4F6] transition">
            <span className="block text-[19px] leading-none">☰</span>
          </button>
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-[13px] font-bold text-[#1E3A8A]" style={{fontFamily:"Manrope,Arial,sans-serif",fontWeight:900}}>TAPASVI</span>
          </div>
        </div>
        <button onClick={handleLogout} className="p-1.5"><LogOut size={16} className="text-[#F97316]" /></button>
      </div>

      {/* Mobile Navigation Drawer */}
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} sections={MENU_SECTIONS} currentUser={user} isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} view={view} />

      {/* Help & Support modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-[360px] w-full p-5" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[#111827] mb-2">❓ Help & Support</p>
            <p className="text-[12.5px] text-[#374151] leading-relaxed mb-1">For any issue with the TAPASVI Digital NGO Management System, please contact your organization's Admin or Super Admin — they can help with access, data corrections, or escalate technical issues.</p>
            <p className="text-[11px] text-[#9CA3AF] mt-3">TAPASVI DMS v2.0</p>
            <button onClick={() => setShowHelp(false)} className="w-full rounded-xl py-2.5 text-[13px] font-bold text-white mt-4" style={{ background: "#1E3A8A" }}>Close</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-[56px] md:pt-0 pb-6 md:pb-0">
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
          {subView === "livelihood-wizard" && (
            <LivelihoodWizard batches={batches} employment={employment}
              onRecordSaved={rec => setEmployment(es => [rec, ...es])}
              showToast={showToast} logAppAudit={logAppAudit}
              onClose={() => setSubView(null)} />
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
          {view === "training" && trainingSubView === "session" && activeBatch && (
            <TrainingSessionScreen
              batch={activeBatch}
              enrollments={enrollments}
              attendanceRecords={attendanceRecords}
              onContinueToAttendance={() => setTrainingSubView("attendance")}
              onGoToAssessment={() => setTrainingSubView("assessment-management")}
              onGoToCertificates={() => setTrainingSubView("certificate-generation")}
              onClose={() => { setTrainingSubView(null); setActiveBatch(null); }} />
          )}
          {view === "training" && trainingSubView === "attendance" && activeBatch && (
            <AttendanceScreen
              batch={activeBatch}
              batches={batches}
              onSwitchBatch={b => setActiveBatch(b)}
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
          {!subView && view === "dashboard" && isAdmin && (
            <Dashboard beneficiaries={visibleBeneficiaries} training={training} employment={employment} villages={villages} isAdmin={isAdmin} currentUser={user}
              onQuickAction={(key) => {
                setSubView(null); setEditing(null);
                if (key === "beneficiary") { setView("beneficiaries"); setSubView("beneficiary-form"); }
                else if (key === "training") { setView("training"); setTrainingSubView(null); }
                else if (key === "attendance") { setView("training"); setTrainingSubView(null); }
                else if (key === "assessment") { setView("training"); setTrainingSubView("assessment-management"); }
                else if (key === "certificate") { setView("training"); setTrainingSubView("certificate-generation"); }
                else if (key === "employment") { setView("employment"); setSubView("livelihood-wizard"); }
                else if (key === "reports") { setView("reports"); }
                else if (key === "beneficiaries-list") { goTo("beneficiaries"); }
              }}
              onViewBeneficiary={(b) => { goTo("beneficiaries"); setProfileBeneficiary(b); }} />
          )}
          {!subView && view === "dashboard" && !isAdmin && (
            <FieldWorkerDashboard beneficiaries={visibleBeneficiaries} currentUser={user}
              onQuickAction={(key) => {
                setSubView(null); setEditing(null);
                if (key === "beneficiary") { setView("beneficiaries"); setSubView("beneficiary-form"); }
                else if (key === "training") { setView("training"); setTrainingSubView(null); }
                else if (key === "attendance") { setView("training"); setTrainingSubView(null); }
                else if (key === "assessment") { setView("training"); setTrainingSubView("assessment-management"); }
                else if (key === "certificate") { setView("training"); setTrainingSubView("certificate-generation"); }
                else if (key === "beneficiaries-list") { goTo("beneficiaries"); }
              }}
              onViewBeneficiary={(b) => { goTo("beneficiaries"); setProfileBeneficiary(b); }} />
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
              currentUser={user}
              showToast={showToast}
              onClose={() => setProfileBeneficiary(null)} />
          )}
          {!subView && view === "ocr-import" && (
            <SmartBeneficiaryImportModule beneficiaries={visibleBeneficiaries} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} onImported={loadAll} />
          )}
          {!subView && view === "bulk-ai-import" && (
            <BulkAIImportModule beneficiaries={visibleBeneficiaries} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} onImported={loadAll} />
          )}
          {!subView && view === "aadhaar-match" && (
            <AadhaarMatchUpload beneficiaries={visibleBeneficiaries} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} onImported={loadAll} onBack={() => goTo("dashboard")} isAdmin={isAdmin} />
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
              onAttendance={b => { setActiveBatch(b); setTrainingSubView(b.status === "Completed" ? "attendance" : "session"); }}
              onCertificates={b => { setActiveBatch(b); setTrainingSubView("certificates"); }}
              onAttendanceReport={() => setTrainingSubView("attendance-report")}
              onAssessments={() => setTrainingSubView("assessment-management")}
              onCertificateGeneration={() => setTrainingSubView("certificate-generation")}
              onExport={exportBatches}
              onPrint={printBatches} />
          )}
          {!subView && view === "employment" && (
            <EmploymentList employment={employment} beneficiaries={beneficiaries} isAdmin={isAdmin}
              onAdd={() => { setEditing(null); setSubView("livelihood-wizard"); }}
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
          {!subView && view === "partners" && isAdmin && (
            <PartnersModule isAdmin={isAdmin} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "waste-management" && rbac.canView("Waste Management") && (
            <WasteManagementModule isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} canEdit={rbac.canCreate("Waste Management") || rbac.canEdit("Waste Management")} canDelete={rbac.canDelete("Waste Management")} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "waste-collection" && isAdmin && (
            <DailyWasteCollectionModule isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "waste-villages" && rbac.canView("Waste Management") && (
            <VillageManagementModule canEdit={rbac.canCreate("Waste Management") || rbac.canEdit("Waste Management")} canDelete={rbac.canDelete("Waste Management")} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "waste-meetings" && rbac.canView("Waste Management") && (
            <MeetingsModule canEdit={rbac.canCreate("Waste Management") || rbac.canEdit("Waste Management")} canDelete={rbac.canDelete("Waste Management")} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "waste-awareness" && rbac.canView("Waste Management") && (
            <AwarenessModule canEdit={rbac.canCreate("Waste Management") || rbac.canEdit("Waste Management")} canDelete={rbac.canDelete("Waste Management")} currentUser={user} showToast={showToast} logAppAudit={logAppAudit} />
          )}
          {!subView && view === "users" && isAdmin && (
            <UserManagement currentUser={user} showToast={showToast} />
          )}
          {view === "settings" && isSuperAdmin && (
            <SettingsHub currentUser={user} showToast={showToast} logAppAudit={logAppAudit} beneficiaries={beneficiaries} />
          )}
        </div>
      </main>

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
