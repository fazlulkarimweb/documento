"use client"

import useSWR from "swr"
import { useState } from "react"
import {
  Wrench,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { listSkills, updateSkill, deleteSkill } from "@/lib/api"
import { toast } from "sonner"

export default function SkillsPage() {
  const { data, error, isLoading, mutate } = useSWR("skills", () =>
    listSkills(),
  )

  const [editingType, setEditingType] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const startEdit = (draft_type: string) => {
    setEditingType(draft_type)
    setEditValue("")
  }

  const cancelEdit = () => {
    setEditingType(null)
    setEditValue("")
  }

  const saveEdit = async (draft_type: string) => {
    if (!editValue.trim()) {
      toast.error("Write an instruction to add")
      return
    }
    setBusy(draft_type)
    try {
      await updateSkill(draft_type, editValue.trim())
      toast.success("Skill updated")
      cancelEdit()
      mutate()
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setBusy(null)
    }
  }

  const remove = async (draft_type: string) => {
    setBusy(draft_type)
    try {
      await deleteSkill(draft_type)
      toast.success(`Deleted ${draft_type}`)
      mutate()
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setBusy(null)
    }
  }

  const skills = data?.skills ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Skills
          </h1>
          <p className="text-muted-foreground mt-1">
            Reusable instructions learned from feedback. Applied automatically
            when drafting the matching type.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-600">
            Failed to load skills:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && skills.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No skills yet. Submit feedback on a draft to teach the system.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {skills.map((s) => {
          const isEditing = editingType === s.draft_type
          const isBusy = busy === s.draft_type
          return (
            <Card key={s.draft_type}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base font-mono">
                        {s.draft_type}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">skill</Badge>
                      </div>
                      {s.metadata?.description && (
                        <p className="text-xs text-foreground font-sans mt-1">
                          {s.metadata.description as string}
                        </p>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(s.draft_type)}
                        disabled={isBusy}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete skill {s.draft_type}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the skill and its directory on the
                            backend. New drafts of this type won&apos;t apply
                            these instructions anymore.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove(s.draft_type)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {s.content}
                </pre>

                {isEditing && (
                  <div className="space-y-2 rounded-md border border-border p-3 bg-card">
                    <p className="text-xs font-medium">
                      Add or refine instruction
                    </p>
                    <Textarea
                      rows={4}
                      placeholder='e.g. "Add signed by Rocky too"'
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isBusy}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(s.draft_type)}
                        disabled={isBusy || !editValue.trim()}
                      >
                        {isBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
