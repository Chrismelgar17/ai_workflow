"use client"

import React, { memo } from "react"
import { Connection, Position } from "@/lib/types"
import { getBezierPath } from "@/lib/utils"

interface ConnectionProps {
  connection: Connection
  // now accept already-computed anchor points (start/end)
  sourcePoint: Position
  targetPoint: Position
  isSelected?: boolean
  isHighlight?: boolean
}

const ConnectionComponent = ({ 
  connection, 
  sourcePoint, 
  targetPoint,
  isSelected,
  isHighlight
}: ConnectionProps) => {
  // sourcePoint and targetPoint are exact anchor coordinates (already computed)
  const start = sourcePoint
  const end = targetPoint

  const path = getBezierPath(start, end)

  return (
    <g className="group">
      {/* Invisible wide path for easier hovering/clicking */}
            <path
              d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />
      
      {/* Visible path */}
            <path
              d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={`
          text-border transition-colors duration-300
          ${isSelected ? "text-primary stroke-[3px]" : ""}
          ${isHighlight ? "text-blue-400 stroke-[3px]" : ""}
          group-hover:text-primary/50
        `}
      />

      {/* Animated flow particle (optional) */}
      {(isSelected || isHighlight) && (
        <circle r="3" fill="currentColor" className="text-primary">
          <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
        </circle>
      )}

      {/* Arrow head at the end */}
      <defs>
        <marker
          id={`arrow-${connection.id}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className={isSelected ? "text-primary" : "text-border"} />
        </marker>
      </defs>
    </g>
  )
}

export default memo(ConnectionComponent)
