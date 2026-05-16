"use client"

import { use, useEffect, useState } from "react"
import { mutate } from "swr"
import Link from "next/link"
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Quote,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDraft } from "@/hooks/use-api"
import { submitFeedback, updateDraft as apiUpdateDraft } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function confidenceTone(conf: number) {
  if (conf >= 0.85) return "bg-emerald-100 text-emerald-900 border-emerald-200"
  if (conf >= 0.6) return "bg-amber-100 text-amber-900 border-amber-200"
  return "bg-red-100 text-red-900 border-red-200"
}

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([0-9a-f-]{6,})\]/g, '<span class="citation">[$1]</span>')
    return (
      <p
        key={i}
        className="leading-relaxed [&_.citation]:text-xs [&_.citation]:font-mono [&_.citation]:px-1 [&_.citation]:py-0.5 [&_.citation]:rounded [&_.citation]:bg-accent [&_.citation]:text-accent-foreground [&_.citation]:ml-1"
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
      />
    )
  })
}

export default function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { draft, isLoading, mutate: mutateDraft } = useDraft(id)

  const [edited, setEdited] = useState("")
  const [feedback, setFeedback] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingFeedback, setSavingFeedback] = useState(false)

  useEffect(() => {
    if (draft) {
      setEdited(draft.edited_content ?? draft.draft_content)
    }
  }, [draft])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12 animate-pulse">
        <div className="h-8 w-24 bg-muted rounded mb-4" />
        <div className="h-12 w-3/4 bg-muted rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-96 bg-muted rounded" />
          <div className="lg:col-span-2 h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/drafts">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Draft not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const changed = edited !== (draft.edited_content ?? draft.draft_content)

  const sendEditFeedback = async () => {
    setSavingEdit(true)
    try {
      await submitFeedback({
        draft_type: draft.draft_type || "unknown",
        original_content: draft.draft_content,
        edited_content: edited,
      })
      await apiUpdateDraft(draft.draft_id, { edited_content: edited })
      mutateDraft()
      mutate("skills")
      toast.success("Edits saved and sent as feedback")
    } catch (err) {
      toast.error("Failed to save edits", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSavingEdit(false)
    }
  }

  const sendNoteFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Write some feedback first")
      return
    }
    setSavingFeedback(true)
    try {
      const noteAsEdit = `${edited}\n\n---\nPARTNER FEEDBACK:\n${feedback}`
      await submitFeedback({
        draft_type: draft.draft_type || "unknown",
        original_content: draft.draft_content,
        edited_content: noteAsEdit,
      })
      mutate("skills")
      toast.success("Feedback submitted")
      setFeedback("")
    } catch (err) {
      toast.error("Feedback failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSavingFeedback(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/drafts">
          <ArrowLeft className="h-4 w-4" />
          All drafts
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{draft.draft_type}</Badge>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium",
                confidenceTone(draft.grounding_confidence),
              )}
            >
              {(draft.grounding_confidence * 100).toFixed(0)}% grounded
            </span>
            <Badge variant="secondary">
              {draft.citations.length} citation
              {draft.citations.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {draft.instructions || "Draft"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {draft.draft_id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Tabs defaultValue="view">
            <TabsList>
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="edit">
                Edit{changed ? " •" : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="view">
              <Card>
                <CardContent className="prose-sm py-6 px-6 space-y-1">
                  {renderMarkdown(draft.draft_content)}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="edit">
              <Card>
                <CardContent className="py-6 space-y-4">
                  <Textarea
                    value={edited}
                    onChange={(e) => setEdited(e.target.value)}
                    rows={24}
                    className="font-mono text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {changed
                        ? "Your edits will be sent as feedback to refine the skill."
                        : "Make changes to enable feedback."}
                    </p>
                    <Button
                      onClick={sendEditFeedback}
                      disabled={!changed || savingEdit}
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Submit Edits
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </CardTitle>
              <CardDescription>
                Tell the system what to change. Your notes refine the{" "}
                <span className="font-mono">{draft.draft_type}</span> skill.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={5}
                placeholder='e.g. "Headers must explicitly state MEMORANDUM BY HARVEY. Sign off with JHON and ROCKY only."'
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="resize-y"
              />
              <div className="flex justify-end">
                <Button
                  onClick={sendNoteFeedback}
                  disabled={savingFeedback || !feedback.trim()}
                >
                  {savingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Quote className="h-4 w-4" />
                Citations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {draft.citations.length === 0 && (
                <p className="text-sm text-muted-foreground">No citations.</p>
              )}
              {draft.citations.map((c, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border p-3 bg-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <p className="text-xs font-medium truncate">
                      {c.source_file_name}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                    &ldquo;{c.text_segment}&rdquo;
                  </p>
                  <Link
                    href={`/documents/${c.source_document_id}`}
                    className="text-xs underline underline-offset-2 mt-2 inline-block"
                  >
                    Open source
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Chunks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(draft.source_chunks).map(([cid, text]) => (
                <div
                  key={cid}
                  className="rounded-md border border-border p-3 bg-card"
                >
                  <code className="text-[10px] text-muted-foreground block truncate mb-1">
                    {cid}
                  </code>
                  <p className="text-xs leading-relaxed line-clamp-5">{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
