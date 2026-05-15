"use client"

import Link from "next/link"
import { FileStack, ArrowRight, Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function confidenceTone(conf: number) {
  if (conf >= 0.85) return "bg-emerald-100 text-emerald-900 border-emerald-200"
  if (conf >= 0.6) return "bg-amber-100 text-amber-900 border-amber-200"
  return "bg-red-100 text-red-900 border-red-200"
}

export default function DraftsPage() {
  const { drafts } = useStore()

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

      {drafts.length === 0 ? (
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
            <Link key={d.draft_id} href={`/drafts/${d.draft_id}`}>
              <Card className="h-full hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{d.draft_type}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(d.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {d.draft_content.replace(/[*#]/g, "").slice(0, 220)}…
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs font-medium",
                        confidenceTone(d.grounding_confidence),
                      )}
                    >
                      {(d.grounding_confidence * 100).toFixed(0)}% grounded
                    </span>
                    <Badge variant="outline">
                      {d.citations.length} citation
                      {d.citations.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
