"use client"

import { Sparkles } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"

export default function PatternsPage() {
  const { patterns } = useStore()

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Learned Patterns
        </h1>
        <p className="text-muted-foreground mt-1">
          Patterns extracted from operator feedback. These shape future drafts.
        </p>
      </div>

      {patterns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No patterns learned yet. Edit a draft and submit feedback to teach
              the system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {patterns.map((p, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {p.pattern_type.replace(/_/g, " ")}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Applies to <Badge variant="outline">{p.draft_type}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {p.description}
                </p>
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Suggested Instruction
                  </p>
                  <p className="text-sm font-medium leading-relaxed">
                    {p.suggested_instruction}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
