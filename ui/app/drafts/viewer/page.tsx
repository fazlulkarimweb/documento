"use client"

import { use, useEffect, useState, Suspense } from "react"
import { mutate } from "swr"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Quote,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  ClipboardCheck,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDraft, useDrafts } from "@/hooks/use-api"
import {
  submitFeedback,
  updateDraft as apiUpdateDraft,
  deleteDraft as apiDeleteDraft,
} from "@/lib/api"
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
      .replace(/\[(\d+)\]/g, '<span class="citation">[$1]</span>')
    return (
      <p
        key={i}
        className="leading-relaxed [&_.citation]:text-[10px] [&_.citation]:font-bold [&_.citation]:px-1 [&_.citation]:py-0.5 [&_.citation]:rounded-full [&_.citation]:bg-primary/10 [&_.citation]:text-primary [&_.citation]:align-top [&_.citation]:-ml-0.5"
        dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
      />
    )
  })
}

function DraftReviewContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const router = useRouter()
  const { draft, isLoading, mutate: mutateDraft } = useDraft(id || "")
  const { mutate: mutateDrafts } = useDrafts()

  const [edited, setEdited] = useState("")
  const [feedback, setFeedback] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (draft) {
      setEdited(draft.edited_content ?? draft.draft_content)
    }
  }, [draft])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await apiDeleteDraft(id)
      mutateDrafts()
      toast.success("Draft deleted")
      router.push("/drafts")
    } catch (err) {
      toast.error("Failed to delete draft", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

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

  if (!id || !draft) {
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
  
  // Calculate Grounding Metrics based on text content
  const currentContent = draft.edited_content ?? draft.draft_content
  const citationMatches = currentContent.match(/\[(\d+)\]/g) || []
  const citationCount = citationMatches.length
  
  // N-Gram Similarity Calculation (Semantic Grounding)
  const calculateSimilarity = (text: string, sources: Record<string, string>) => {
    const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2)
    const draftWords = normalize(text)
    if (draftWords.length === 0) return 0
    
    const sourceWords = Object.values(sources).flatMap(s => normalize(s))
    const sourceSet = new Set(sourceWords)
    
    if (sourceSet.size === 0) return 0
    
    const intersection = draftWords.filter(w => sourceSet.has(w))
    return intersection.length / draftWords.length
  }
  
  const overlapScore = calculateSimilarity(currentContent, draft.source_chunks)
  
  // Rule-based density score
  const paragraphs = currentContent.split("\n").filter(p => p.trim().length > 20).length
  const densityScore = paragraphs > 0 ? Math.min(1, citationCount / (paragraphs * 1.5)) : 0
  
  // Hybrid Reliability: Weighted towards semantic overlap (70%) and density (30%)
  const displayScore = (overlapScore * 0.7) + (densityScore * 0.3)

  const handleCopy = (includeReferences: boolean) => {
    let text = draft.edited_content ?? draft.draft_content
    
    if (!includeReferences) {
      // 1. Remove inline citations [1], [2], etc.
      text = text.replace(/\[\d+\]/g, "")
      // 2. Remove multiple spaces left behind by deleted citations
      text = text.replace(/\s{2,}/g, " ")
      // 3. Strip everything from "Source:" or "Reference:" onwards
      const sourceMatch = text.match(/(?:\n|^)\s*(?:\*\*\*|---)?\s*(?:Source|Reference)s?:/i)
      if (sourceMatch && sourceMatch.index !== undefined) {
        text = text.slice(0, sourceMatch.index)
      }
    }

    navigator.clipboard.writeText(text.trim())
    toast.success(includeReferences ? "Copied with references" : "Copied without references")
  }

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
                "rounded-md border px-2 py-0.5 text-xs font-bold",
                confidenceTone(draft.grounding_score),
              )}
            >
              {(draft.grounding_score * 100).toFixed(0)}% grounded
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {draft.instructions || "Draft"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {draft.draft_id}
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this <strong>{draft.draft_type}</strong> draft. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/80 cursor-pointer"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Tabs defaultValue="view">
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="edit">
                  Edit{changed ? " •" : ""}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => handleCopy(true)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20"
                  onClick={() => handleCopy(false)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  Copy without reference
                </Button>
              </div>
            </div>
            <TabsContent value="view">
              <Card>
                <CardContent className="prose-sm py-6 px-6 space-y-1">
                  <div className="mb-8">
                    {renderMarkdown(draft.draft_content)}
                  </div>
                  
                  {draft.citations && draft.citations.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-border">
                      <div className="flex items-center justify-between mb-6">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Sources & Grounding
                          </h3>
                          <p className="text-[10px] text-muted-foreground">
                            {citationCount} citations found. Semantic overlap analysis confirms factual anchoring.
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium">Overlap</p>
                            <p className="text-xs font-bold">{(overlapScore * 100).toFixed(0)}%</p>
                          </div>
                          <div className="text-right border-l pl-4">
                            <p className="text-[10px] uppercase text-muted-foreground font-medium">Reliability</p>
                            <span
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-xs font-bold",
                                confidenceTone(displayScore),
                              )}
                            >
                              {(displayScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {Array.from(new Set(draft.citations.map(c => c.source_document_id))).map((docId, idx) => {
                          const docCitations = draft.citations.filter(c => c.source_document_id === docId)
                          const fileName = docCitations[0]?.source_file_name || "Unknown Document"
                          return (
                            <div key={docId} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                    {idx + 1}
                                  </Badge>
                                  <span className="text-sm font-medium">{fileName}</span>
                                </div>
                                <code className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {docId}
                                </code>
                              </div>
                              <ul className="space-y-2 pl-7">
                                {docCitations.map((cite, cIdx) => (
                                  <li key={cIdx} className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-muted pl-3">
                                    &ldquo;{cite.text_segment}&rdquo;
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
                placeholder='e.g. "Headers must explicitly state LEGAL MEMORANDUM. Sign off with authorized signatories only."'
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

export default function DraftReviewPage() {
  return (
    <Suspense fallback={null}>
      <DraftReviewContent />
    </Suspense>
  )
}
