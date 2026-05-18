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
  Plus,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { listSkills, updateSkill, deleteSkill, addSkill } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    // Simple MD-like rendering
    let html = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^### (.+)$/g, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/g, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/g, '<h1 class="text-lg font-bold mt-6 mb-3">$1</h1>')
      .replace(/^- (.+)$/g, '<li class="ml-4 list-disc">$1</li>')

    if (!line.startsWith("- ")) {
      return (
        <p
          key={i}
          className="leading-relaxed min-h-[1.5em]"
          dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
        />
      )
    }
    return (
      <div
        key={i}
        dangerouslySetInnerHTML={{ __html: html }}
        className="leading-relaxed"
      />
    )
  })
}

export default function SkillsPage() {
  const { data, error, isLoading, mutate } = useSWR("skills", () =>
    listSkills(),
  )

  const [editingType, setEditingType] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (draft_type: string) => {
    setExpanded((prev) => ({ ...prev, [draft_type]: !prev[draft_type] }))
  }

  // Add Skill State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newDraftType, setNewDraftType] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newContent, setNewContent] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newDraftType.trim()) {
      toast.error("Enter a draft type")
      return
    }
    if (!newContent.trim()) {
      toast.error("Enter skill content")
      return
    }
    setIsAdding(true)
    try {
      await addSkill(newDraftType.trim(), newContent.trim(), {
        description: newDescription.trim() || undefined,
      })
      toast.success("Skill added")
      setIsAddDialogOpen(false)
      setNewDraftType("")
      setNewDescription("")
      setNewContent("")
      mutate()
    } catch (err) {
      toast.error("Failed to add skill", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setIsAdding(false)
    }
  }

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
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Skill</DialogTitle>
                <DialogDescription>
                  Define a new draft type and its default instructions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="draft-type">Draft Type</Label>
                  <Input
                    id="draft-type"
                    placeholder='e.g. "rental-agreement"'
                    value={newDraftType}
                    onChange={(e) => setNewDraftType(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder='e.g. "Instructions for residential rental agreements"'
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Initial Instructions</Label>
                  <Textarea
                    id="content"
                    placeholder='e.g. "Ensure the termination clause is clearly highlighted..."'
                    rows={6}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Skill
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
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
                      {typeof s.metadata?.description === "string" && (
                        <p className="text-xs text-foreground font-sans mt-1">
                          {s.metadata.description}
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
                <div className="rounded-md border border-border bg-muted/20 p-4 text-xs leading-relaxed font-sans overflow-hidden relative">
                  <div className={cn(!expanded[s.draft_type] && "max-h-[15rem] overflow-hidden")}>
                    {renderMarkdown(s.content)}
                  </div>
                  
                  {!expanded[s.draft_type] && s.content.split("\n").length > 10 && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted/40 to-transparent flex items-end justify-center pb-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] h-7 bg-background/80 backdrop-blur-sm border shadow-sm"
                        onClick={() => toggleExpand(s.draft_type)}
                      >
                        See more
                      </Button>
                    </div>
                  )}

                  {expanded[s.draft_type] && (
                    <div className="mt-4 flex justify-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] h-7 bg-background/80 backdrop-blur-sm border shadow-sm"
                        onClick={() => toggleExpand(s.draft_type)}
                      >
                        Show less
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-2 rounded-md border border-border p-3 bg-card">
                    <p className="text-xs font-medium">
                      Add or refine instruction
                    </p>
                    <Textarea
                      rows={4}
                      placeholder='e.g. "Add dual signatory requirement"'
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
