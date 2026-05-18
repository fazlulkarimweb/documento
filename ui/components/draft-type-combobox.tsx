"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Skill } from "@/lib/types"

interface DraftTypeComboboxProps {
  value: string
  onChange: (value: string) => void
  skills: Skill[]
}

export function DraftTypeCombobox({ value, onChange, skills }: DraftTypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const allSkills = React.useMemo(() => {
    const existing = skills.find(s => s.draft_type === value)
    if (value && !existing) {
      const custom: Skill = { draft_type: value, content: "", metadata: { description: "Custom draft type" } }
      return [custom, ...skills]
    }
    return skills
  }, [skills, value])

  const selectedSkill = allSkills.find(s => s.draft_type === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-mono h-auto py-2"
        >
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="truncate w-full">
              {value || "Select draft type..."}
            </span>
            {typeof selectedSkill?.metadata?.description === "string" && (
              <span className="text-[10px] text-muted-foreground font-sans font-normal truncate w-full">
                {selectedSkill.metadata.description}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search or type custom type..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-start rounded-none font-mono text-xs py-6"
                onClick={() => {
                  onChange(inputValue)
                  setOpen(false)
                }}
              >
                Create custom: "{inputValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {allSkills.map((skill) => (
                <CommandItem
                  key={skill.draft_type}
                  value={skill.draft_type}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                  className="font-mono flex flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === skill.draft_type ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-semibold">{skill.draft_type}</span>
                  </div>
                  {typeof skill.metadata?.description === "string" && (
                    <p className="pl-6 text-[11px] text-muted-foreground font-sans font-normal leading-tight mt-1">
                      {skill.metadata.description}
                    </p>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
