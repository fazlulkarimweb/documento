"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Sparkles, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"
import { generateDraft } from "@/lib/api"
import { toast } from "sonner"
import type { DraftType } from "@/lib/types"

const DRAFT_TYPES: { value: DraftType; label: string; hint: string }[] = [
  { value: "legal-memo", label: "Legal Memo", hint: "Structured internal memorandum" },
  { value: "case-summary", label: "Case Summary", hint: "Concise factual summary of a matter" },
  { value: "demand-letter", label: "Demand Letter", hint: "Formal demand to a counterparty" },
  { value: "client-brief", label: "Client Brief", hint: "Plain-language briefing for clients" },
]

function NewDraftInner() {
  const router = useRouter()
  const params = useSearchParams()
  const preselected = params.get("document")
  const { documents, addDraft } = useStore()

  const [draftType, setDraftType] = useState<DraftType>("legal-memo")
  const [focusQuery, setFocusQuery] = useState("")
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
    setSubmitting(true)
    try {
      const res = await generateDraft({
        document_ids: selected,
        draft_type: draftType,
        focus_query: focusQuery || undefined,
      })
      addDraft({
        ...res,
        draft_type: draftType,
        focus_query: focusQuery,
        document_ids: selected,
        created_at: new Date().toISOString(),
      })
      toast.success("Draft generated", {
        description: `${(res.grounding_confidence * 100).toFixed(0)}% grounded`,
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
        Select sources, pick a draft type, and optionally focus the output.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft Type</CardTitle>
            <CardDescription>
              Choose the kind of document to generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={draftType}
              onValueChange={(v) => setDraftType(v as DraftType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRAFT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.hint}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label htmlFor="focus">Focus query (optional)</Label>
              <Input
                id="focus"
                placeholder="e.g. Summarize arrears, deadlines, and breach clauses"
                value={focusQuery}
                onChange={(e) => setFocusQuery(e.target.value)}
              />
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
                        {Object.keys(doc.chunks).length} chunks
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
