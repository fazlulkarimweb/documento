"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileText,
  FileStack,
  LayoutDashboard,
  Scale,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isMock } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/drafts", label: "Drafts", icon: FileStack },
  { href: "/skills", label: "Skills", icon: Wrench },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">
              Pearson Specter Litt
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Legal Intelligence
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">API Mode</span>
            <Badge variant={isMock ? "secondary" : "default"}>
              {isMock ? "Mock" : "Live"}
            </Badge>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-2 h-14 px-4 border-b border-border bg-sidebar">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Pearson Specter Litt</span>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
