"use client"

import * as React from "react"

const MenuContext = React.createContext<{
  open: boolean
  setOpen: (v: boolean) => void
} | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>
}

export function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(MenuContext)!
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    ctx.setOpen(!ctx.open)
  }
  if (asChild) {
    return React.cloneElement(children, { onClick: onClick })
  }
  return <button onClick={onClick}>{children}</button>
}

export function DropdownMenuContent({ align = "end", children }: { align?: "start" | "end"; children: React.ReactNode }) {
  const ctx = React.useContext(MenuContext)!
  if (!ctx.open) return null
  return (
    <div
      className="z-50 mt-1 min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ position: "absolute" }}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ onClick, children, className }: { onClick?: () => void; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(MenuContext)!
  const handle = () => {
    onClick?.()
    ctx.setOpen(false)
  }
  return (
    <button
      type="button"
      className={`w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${className ?? ""}`}
      onClick={handle}
    >
      {children}
    </button>
  )
}
