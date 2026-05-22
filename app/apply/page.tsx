"use client";
import SiteFooter from "@/components/SiteFooter";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type UploadItem = {
  file: File | null;
  type: string;
};

export default function BusinessApplicationPage() {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [dailyRevenue, setDailyRevenue] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");

  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [businessPhotoFile, setBusinessPhotoFile] = useState<File | null>(null);
  const [locationProofFile, setLocationProofFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function uploadDocument(
    applicationId: string,
    uploadItem: UploadItem
  ) {
    if (!uploadItem.file) return;

    const safeFileName = uploadItem.file.name.replace(/\s+/g, "-");
    const filePath = `${applicationId}/${uploadItem.type}-${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("business-documents")
      .upload(filePath, uploadItem.file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: documentError } = await supabase
      .from("application_documents")
      .insert({
        application_id: applicationId,
        document_type: uploadItem.type,
        file_name: uploadItem.file.name,
        file_path: filePath,
      });

    if (documentError) {
      throw new Error(documentError.message);
    }
  }

  async function submitApplication() {
    if (
      !businessName ||
      !ownerName ||
      !phone ||
      !businessType ||
      !requestedAmount
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { data: applicationData, error } = await supabase
      .from("business_applications")
      .insert({
        business_name: businessName,
        full_name: ownerName,
        phone,
        business_type: businessType,
        requested_amount: Number(requestedAmount),
        daily_revenue_estimate: Number(dailyRevenue || 0),
        intended_use: intendedUse,
        guarantor_name: guarantorName,
        guarantor_phone: guarantorPhone,
        application_status: "submitted",
      })
      .select("id")
      .single();

    if (error || !applicationData) {
      setMessage(error?.message || "Application could not be submitted.");
      setSubmitting(false);
      return;
    }

    try {
      await Promise.all([
        uploadDocument(applicationData.id, {
          file: nationalIdFile,
          type: "national_id",
        }),
        uploadDocument(applicationData.id, {
          file: businessPhotoFile,
          type: "business_photo",
        }),
        uploadDocument(applicationData.id, {
          file: locationProofFile,
          type: "location_proof",
        }),
      ]);
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Application submitted, but document upload failed."
      );
      setSubmitting(false);
      return;
    }

    setBusinessName("");
    setOwnerName("");
    setPhone("");
    setBusinessType("");
    setRequestedAmount("");
    setDailyRevenue("");
    setIntendedUse("");
    setGuarantorName("");
    setGuarantorPhone("");
    setNationalIdFile(null);
    setBusinessPhotoFile(null);
    setLocationProofFile(null);

    setMessage("Application and documents submitted successfully.");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[var(--capd-bg)] text-slate-900">
  <section className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-widest text-[#009B5A]">
            Business Support
          </p>

          <h1 className="mt-2 text-4xl font-black text-[#0D2D6E]">
            Business Financing Application
          </h1>

          <p className="mt-4 text-slate-600">
            Apply for CAPDCOOP business support funding. Our team will review
            your business model, cash flow, supporting documents, and suitability.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Business Name *"
              />

              <input
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Owner Full Name *"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Phone Number *"
              />

              <input
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Business Type *"
              />

              <input
                value={requestedAmount}
                onChange={(event) => setRequestedAmount(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Requested Amount (FCFA) *"
              />

              <input
                value={dailyRevenue}
                onChange={(event) => setDailyRevenue(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Estimated Daily Revenue"
              />
            </div>

            <textarea
              value={intendedUse}
              onChange={(event) => setIntendedUse(event.target.value)}
              className="mt-6 min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
              placeholder="What will the financing be used for?"
            />

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <input
                value={guarantorName}
                onChange={(event) => setGuarantorName(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Guarantor Name"
              />

              <input
                value={guarantorPhone}
                onChange={(event) => setGuarantorPhone(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none"
                placeholder="Guarantor Phone"
              />
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#0D2D6E]/10 p-3 text-[#0D2D6E]">
                  <Upload size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0D2D6E]">
                    Supporting Documents
                  </h2>
                  <p className="text-sm text-slate-600">
                    Upload documents to support business verification.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <FileUploadBox
                  label="National ID"
                  file={nationalIdFile}
                  onChange={setNationalIdFile}
                />

                <FileUploadBox
                  label="Business Photo"
                  file={businessPhotoFile}
                  onChange={setBusinessPhotoFile}
                />

                <FileUploadBox
                  label="Location Proof"
                  file={locationProofFile}
                  onChange={setLocationProofFile}
                />
              </div>
            </div>

            {message && (
              <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                {message}
              </div>
            )}

            <Button
              onClick={submitApplication}
              disabled={submitting}
              className="mt-8 px-8 py-4"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
       </section>
  <SiteFooter />
    </main>
  );
}

function FileUploadBox({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center hover:bg-slate-50">
      <Upload className="mx-auto text-[#0D2D6E]" size={24} />
      <p className="mt-3 font-bold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">
        {file ? file.name : "PDF, JPG, PNG"}
      </p>

      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  );
}