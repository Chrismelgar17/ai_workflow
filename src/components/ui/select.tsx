import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

function collectItems(node: any, items: Array<{ value: string; label: React.ReactNode }>) {
  if (!node) return
  if (Array.isArray(node)) {
    node.forEach((n) => collectItems(n, items))
    return
  }
  if (node?.type?.displayName === "SelectItem") {
    items.push({ value: node.props.value, label: node.props.children })
    return
  }
  if (node?.props?.children) collectItems(node.props.children, items)
}

function extractPlaceholder(node: any): string | undefined {
  let result: string | undefined
  const visit = (n: any) => {
    if (!n) return
    if (Array.isArray(n)) return n.forEach(visit)
    if (n?.type?.displayName === "SelectValue" && n?.props?.placeholder) {
      result = n.props.placeholder
    }
    if (n?.props?.children) visit(n.props.children)
  }
  visit(node)
  return result
}

export function Select({ value, onValueChange, className, children }: SelectProps) {
  const items: Array<{ value: string; label: React.ReactNode }> = []
  let placeholder: string | undefined = extractPlaceholder(children)

  React.Children.forEach(children as any, (child: any) => {
    if (child?.type?.displayName === "SelectContent") {
      collectItems(child.props.children, items)
    }
  })

  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {items.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function SelectTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
SelectTrigger.displayName = "SelectTrigger"

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <>{null}</>
}
SelectValue.displayName = "SelectValue"

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
SelectContent.displayName = "SelectContent"

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <>{children}</>
}
SelectItem.displayName = "SelectItem"
