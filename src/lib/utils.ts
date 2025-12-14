import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Euclidean distance between two points
export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}


// Build a smooth cubic bezier path between start and end points.
// Ensures minimal horizontal curvature even for short distances.
export function getBezierPath(start: Position, end: Position): string {
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)

  // If the vertical distance is greater than horizontal, orient handles vertically
  if (dy > dx) {
    const handle = Math.max(dy * 0.5, 60)
    const c1x = start.x
    const c1y = start.y + handle
    const c2x = end.x
    const c2y = end.y - handle
    return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`
  }

  // Horizontal-oriented curve (default)
  const handle = Math.max(dx * 0.5, 60)
  const c1x = start.x + handle
  const c1y = start.y
  const c2x = end.x - handle
  const c2y = end.y
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`
}

// Determine if point P is within threshold distance of line segment AB.
export function isPointNearLine(p: Position, a: Position, b: Position, threshold = 20): boolean {
  const l2 = distance(a, b) ** 2
  if (l2 === 0) return distance(p, a) <= threshold
  // Projection factor t of point p onto line ab
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2
  t = Math.max(0, Math.min(1, t))
  const proj: Position = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
  return distance(p, proj) <= threshold
}

