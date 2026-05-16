"use client"

import { useState, useEffect, Suspense } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Sparkles, FileText, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { DraftTypeCombobox } from "@/components/draft-type-combobox"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useDocuments, useDrafts } from "@/hooks/use-api"
import { generateDraft, listSkills } from "@/lib/api"
import { toast } from "sonner"

const PRESET_DRAFT_TYPES = [
  "legal-memo",
  "case-summary",
  "demand-letter",
  "client-brief",
  "contract-review",
  "settlement-agreement",
  "cease-and-desist",
  "discovery-request",
  "motion-to-dismiss",
  "affidavit",
  "power-of-attorney",
  "nda",
  "engagement-letter",
  "opinion-letter",
  "litigation-strategy",
  "complaint-civil",
  "answer-to-complaint",
  "subpoena-duces-tecum",
  "deposition-notice",
  "summary-judgment-motion",
  "pretrial-statement",
  "jury-instructions",
  "appeal-brief",
  "amicus-curiae-brief",
  "writ-of-certiorari",
]

function NewDraftInner() {
  const router = useRouter()
  const params = useSearchParams()
  const preselected = params.get("document")
  const { documents } = useDocuments()
  const { mutate: mutateDrafts } = useDrafts()
  const { data: skillsData } = useSWR("skills", () => listSkills())

  const skillTypes = skillsData?.skills.map((s) => s.draft_type) ?? []
  const suggestions = Array.from(
    new Set([...skillTypes, ...PRESET_DRAFT_TYPES]),
  )

  const [draftType, setDraftType] = useState("legal-memo")
  const [instructions, setInstructions] = useState("")
  const [selected, setSelected] = useState<string[]>(
    preselected ? [preselected] : [],
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (preselected && !selected.includes(preselected)) {
      setSelected([preselected])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected])

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )

  const submit = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one source document")
      return
    }
    const trimmedType = draftType.trim()
    if (!trimmedType) {
      toast.error("Enter a draft type")
      return
    }
    setSubmitting(true)
    try {
      const res = await generateDraft({
        document_ids: selected,
        draft_type: trimmedType,
        instructions: instructions || undefined,
      })
      mutateDrafts()
      toast.success("Draft generated", {
        description: `${(res.grounding_score * 100).toFixed(0)}% grounded`,
      })
      router.push(`/drafts/${res.draft_id}`)
    } catch (err) {
      toast.error("Generation failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/drafts">
          <ArrowLeft className="h-4 w-4" />
          All drafts
        </Link>
      </Button>

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">
        Generate Draft
      </h1>
      <p className="text-muted-foreground mb-6">
        Pick a draft type, write your instructions, and select sources.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft Type</CardTitle>
            <CardDescription>
              Type a custom name or pick from existing skills and presets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="draft-type">Type</Label>
              <DraftTypeCombobox
                value={draftType}
                onChange={setDraftType}
                options={suggestions}
              />
              {skillTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">
                    Skills
                  </span>
                  {skillTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDraftType(t)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs hover:bg-accent transition-colors"
                    >
                      <Wrench className="h-3 w-3" />
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions / Prompt</Label>
              <Textarea
                id="instructions"
                rows={6}
                placeholder={`Describe what you want. For example:\n\n"Draft a memorandum summarizing the arrears, breach clauses, and the May 15 vacation deadline. Use active voice in the background section and sign off as Harvey."`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Be specific — these instructions guide tone, structure, and what
                to emphasize.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Documents</CardTitle>
            <CardDescription>
              Drafts will be grounded in the chunks of these documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No documents ingested yet.{" "}
                <Link
                  href="/documents"
                  className="underline underline-offset-2 text-foreground"
                >
                  Ingest one first
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const checked = selected.includes(doc.document_id)
                  return (
                    <label
                      key={doc.document_id}
                      className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(doc.document_id)}
                      />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.metadata.filename}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {doc.document_id}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {doc.chunk_count ?? (doc.chunks ? Object.keys(doc.chunks).length : 0)} chunks
                      </Badge>
                    </label>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Draft
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NewDraftPage() {
  return (
    <Suspense fallback={null}>
      <NewDraftInner />
    </Suspense>
  )
}
