"use client"

import Link from "next/link"
import { FileStack, ArrowRight, Sparkles, Trash2, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useDrafts } from "@/hooks/use-api"
import { deleteDraft } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { toast } from "sonner"

function confidenceTone(conf: number) {
  if (conf >= 0.85) return "bg-emerald-100 text-emerald-900 border-emerald-200"
  if (conf >= 0.6) return "bg-amber-100 text-amber-900 border-amber-200"
  return "bg-red-100 text-red-900 border-red-200"
}

export default function DraftsPage() {
  const { drafts, isLoading, mutate } = useDrafts()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteDraft(id)
      mutate()
      toast.success("Draft deleted")
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Drafts
          </h1>
          <p className="text-muted-foreground mt-1">
            Grounded, citation-anchored generations.
          </p>
        </div>
        <Button asChild>
          <Link href="/drafts/new">
            <Sparkles className="h-4 w-4" />
            New Draft
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileStack className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No drafts yet.
            </p>
            <Button asChild className="mt-4">
              <Link href="/drafts/new">Generate your first draft</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((d) => (
            <Card key={d.draft_id} className="h-full hover:border-primary/40 transition-colors group relative">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      <Link href={`/drafts/${d.draft_id}`}>
                        <span className="absolute inset-0 z-10" aria-hidden="true" />
                        {d.draft_type}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-xs relative z-20">
                      {new Date(d.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 relative z-20">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingId === d.draft_id}
                        >
                          {deletingId === d.draft_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove the <strong>{d.draft_type}</strong> draft generated on {new Date(d.created_at).toLocaleDateString()}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(d.draft_id)}
                            className="bg-destructive text-white hover:bg-destructive/80 cursor-pointer"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 relative z-20 pointer-events-none">
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {d.preview || "No preview available."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium",
                      confidenceTone(d.grounding_score ?? 0),
                    )}
                  >
                    {((d.grounding_score ?? 0) * 100).toFixed(0)}% grounded
                  </span>

                  <Badge variant="outline">
                    {d.document_ids?.length || 0} document
                    {(d.document_ids?.length || 0) === 1 ? "" : "s"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
