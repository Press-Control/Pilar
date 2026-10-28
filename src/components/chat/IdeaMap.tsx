"use client";

import { useEffect, useState } from "react";
import { MAP_ROOT, mapPath, type MapNode } from "./model";

/** IdeaMap (#ideaMap): dotted field, soft curved connections, nodes derived from structured state. */
export function IdeaMap({ nodes }: { nodes: MapNode[] }) {
  // Lines draw in one frame after the node exists, so the stroke animation runs (reference .map-line.connected).
  const [drawn, setDrawn] = useState<Set<string>>(new Set());
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(new Set(nodes.map((n) => n.id))));
    return () => cancelAnimationFrame(id);
  }, [nodes]);

  const intent = nodes.find((n) => n.kind === "intent");
  const next = nodes.find((n) => n.kind === "next");

  return (
    <div className="idea-map" id="ideaMap">
      <svg viewBox="0 0 360 230" role="img" aria-label="Relaciones entre los conceptos de la conversación">
        {nodes.map((n) => (
          <path
            key={`l-${n.id}`}
            className={`map-line${drawn.has(n.id) ? " connected" : ""}${n.kind === "proposed" ? " map-line--proposed" : ""}`}
            d={mapPath(n)}
          />
        ))}
        {intent && next ? (
          <path
            className={`map-line${drawn.has(intent.id) && drawn.has(next.id) ? " connected" : ""}`}
            d={`M${intent.x} ${intent.y} Q${Math.max(intent.x, next.x) + 34} ${(intent.y + next.y) / 2} ${next.x} ${next.y}`}
          />
        ) : null}
        <g className="map-node map-root">
          <circle className="node-ring" cx={MAP_ROOT.x} cy={MAP_ROOT.y} r="12" />
          <circle cx={MAP_ROOT.x} cy={MAP_ROOT.y} r="5" />
          <text x={MAP_ROOT.x} y={MAP_ROOT.y + 33}>Tu idea</text>
        </g>
        {nodes.map((n) => (
          <g key={n.id} className={`map-node map-secondary map-node--${n.kind}`}>
            <title>{n.full}</title>
            {n.kind === "decision" ? <circle className="node-ring" cx={n.x} cy={n.y} r="9" /> : null}
            <circle cx={n.x} cy={n.y} r={n.kind === "decision" ? 4.5 : 5} />
            <text x={n.x} y={n.y + 22}>{n.label}</text>
          </g>
        ))}
      </svg>
      <span className="map-caption">LAS CONEXIONES APARECEN AL CONVERSAR</span>
      <ul className="sr-only">
        {nodes.map((n) => (
          <li key={n.id}>{n.full}</li>
        ))}
      </ul>
    </div>
  );
}
