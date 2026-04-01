"use client";

import { Link2, UploadCloud, X } from "lucide-react";
import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";
import { CreateResourceInput } from "@/types";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateResourceInput) => Promise<void>;
}

export function UploadModal({ open, onClose, onSubmit }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const fileLabel = useMemo(() => {
    if (file) {
      return file.name;
    }

    return "Drop any file or add a link";
  }, [file]);

  useEffect(() => {
    if (!open) {
      setError("");
      setSuccess("");
      setIsDragging(false);
    }
  }, [open]);

  useEffect(() => {
    const source = `${title} ${file?.name ?? ""}`.toLowerCase();

    if (!subject) {
      const matchedSubject = SUBJECT_OPTIONS.find((option) => source.includes(option.toLowerCase()));
      if (matchedSubject) {
        setSubject(matchedSubject);
      }
    }

    if (!grade) {
      const matchedGrade = GRADE_OPTIONS.find((option) => source.includes(option.toLowerCase()));
      if (matchedGrade) {
        setGrade(matchedGrade);
      }
    }
  }, [file, grade, subject, title]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(form);
    const payload: CreateResourceInput = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      grade: String(formData.get("grade") ?? ""),
      externalUrl: String(formData.get("externalUrl") ?? ""),
      file,
    };

    try {
      await onSubmit(payload);
      setSuccess("Resource uploaded successfully.");
      form.reset();
      setFile(null);
      setTitle("");
      setDescription("");
      setSubject("");
      setGrade("");
      setExternalUrl("");
      window.setTimeout(() => onClose(), 600);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save this resource. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) {
      setFile(nextFile);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-scale-in w-full max-w-2xl rounded-[28px] border border-border bg-background p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-normal text-muted-foreground">Upload</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Add a new resource</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="title" placeholder="Resource title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <Input
              name="externalUrl"
              placeholder="External link (optional)"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
            />
          </div>

          <Textarea
            name="description"
            placeholder="Short description"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select name="subject" options={SUBJECT_OPTIONS} placeholder="Select subject" required value={subject} onChange={(event) => setSubject(event.target.value)} />
            <Select name="grade" options={GRADE_OPTIONS} placeholder="Select grade" required value={grade} onChange={(event) => setGrade(event.target.value)} />
          </div>

          <div className="rounded-2xl border border-border bg-muted/60 p-4">
            <p className="text-sm font-medium text-foreground">Discovery tip</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Clear titles and descriptions help other teachers discover your resource faster.
            </p>
          </div>

          <label
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
              isDragging ? "border-foreground bg-muted" : "border-border bg-card hover:bg-muted/60"
            }`}
          >
            <input
              type="file"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <UploadCloud className="mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{fileLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag and drop here or browse from your computer. PDF, PPT, DOCX, CSV, images, and more.
            </p>
          </label>

          {subject || grade ? (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border bg-card px-3 py-1">
                Suggested subject: {subject || "None yet"}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1">
                Suggested grade: {grade || "None yet"}
              </span>
            </div>
          ) : null}

          {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
          {error ? <p className="text-sm text-foreground/80">{error}</p> : null}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Uploading..."
            >
              <Link2 className="h-4 w-4" />
              Save resource
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
