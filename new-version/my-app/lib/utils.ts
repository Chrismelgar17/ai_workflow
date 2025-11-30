import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Position } from "./types"

// Tailwind + clsx merge helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Euclidean distance between two points
export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Build a smooth cubic bezier path between start and end points.
// Ensures minimal horizontal curvature even for short distances.
export function getBezierPath(start: Position, end: Position): string {
  const dx = Math.abs(end.x - start.x)
  // Minimum handle distance to avoid flat lines
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
