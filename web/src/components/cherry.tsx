"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { MessageCircle, Maximize2 } from "lucide-react";
import Chat from "./chat";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// ---- Types & constants ----------------------------------------------------

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const MARGIN = 8; // viewport margin when dragging
const SIZE = {
  normal: { w: "min(92vw,420px)", h: "60vh" },
  max: { w: "min(96vw,600px)", h: "calc(100vh - 2rem)" },
} as const;

const NAV_MS = 150; // ms for smoother, longer pre-nav zoom

const STICKY = 48; // px: magnetize when the cursor is within this distance to edges

// Utility: figure out which corner is closest to the given point
function closestCorner(x: number, y: number, w: number, h: number): Position {
  const corners = {
    "top-left": { x: 0, y: 0 },
    "top-right": { x: w, y: 0 },
    "bottom-left": { x: 0, y: h },
    "bottom-right": { x: w, y: h },
  } as const;

  let best: Position = "bottom-right";
  let min = Infinity;
  (Object.keys(corners) as Position[]).forEach((key) => {
    const dx = x - corners[key].x;
    const dy = y - corners[key].y;
    const d2 = dx * dx + dy * dy;
    if (d2 < min) {
      min = d2;
      best = key;
    }
  });
  return best;
}

// ---- Helpers --------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isLeft = (p: Position) => p.endsWith("left");
const isTop = (p: Position) => p.startsWith("top");

function computeTransformOrigin(pos: Position, maximized: boolean): React.CSSProperties["transformOrigin"] {
  if (maximized) return `${isLeft(pos) ? "left" : "right"} center` as const;
  return `${isLeft(pos) ? "left" : "right"} ${isTop(pos) ? "top" : "bottom"}` as const;
}

function computeDockLeft(pos: Position, panelWidth: number, vw: number, maximized: boolean, margin = 16) {
  if (isLeft(pos)) return margin;
  const w = panelWidth || (maximized ? 600 : 420);
  return clamp(vw - w - margin, margin, vw - w - margin);
}

function stickyAdjust(
  x: number,
  y: number,
  cursorX: number,
  cursorY: number,
  viewportW: number,
  viewportH: number,
  panelW: number,
  panelH: number,
  enabled: boolean,
  sticky = STICKY,
) {
  if (!enabled) return { x, y };
  let nx = x;
  let ny = y;
  if (cursorX < sticky) nx = MARGIN; // left
  if (cursorX > viewportW - sticky) nx = viewportW - panelW - MARGIN; // right
  if (cursorY < sticky) ny = MARGIN; // top
  if (cursorY > viewportH - sticky) ny = viewportH - panelH - MARGIN; // bottom
  return { x: nx, y: ny };
}

function snapFromPanelCenter(rect: DOMRect, viewportW: number, viewportH: number): Position {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const vertical: "top" | "bottom" = cy < viewportH / 2 ? "top" : "bottom";
  const horizontal: "left" | "right" = cx < viewportW / 2 ? "left" : "right";
  return `${vertical}-${horizontal}` as Position;
}

/**
 * Cherry: a tiny toggle that shows/hides the Chat UI.
 * Floating button opens a movable, snappable, and dockable chat panel.
 */
export default function Cherry() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [navAnimating, setNavAnimating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(uuidv4());

  // Drag state
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const panelSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const navTimerRef = useRef<number | null>(null);

  // Measured sizes for smooth docking (always animate `left` instead of toggling left/right classes)
  const [vw, setVw] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 0);
  const [panelWH, setPanelWH] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Close with ESC when panel is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Prefetch dashboard for faster handoff
  useEffect(() => {
    try {
      (router as any)?.prefetch?.("/dashboard");
    } catch {}
  }, [router]);

  // Track viewport width
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure panel width/height whenever open/maximized toggles or after layout
  useLayoutEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setPanelWH({ w: rect.width, h: rect.height });
    };

    measure();

    const ro = (window as any).ResizeObserver
      ? new (window as any).ResizeObserver((entries: any) => {
          if (!entries || !entries.length) return;
          const rect = entries[0].target.getBoundingClientRect();
          setPanelWH({ w: rect.width, h: rect.height });
        })
      : null;
    if (ro) ro.observe(el);

    return () => {
      if (ro) ro.disconnect();
    };
  }, [open, maximized]);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    panelSizeRef.current = { w: rect.width, h: rect.height };
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  // Global drag listeners (attached only while dragging)
  useEffect(() => {
    if (!isDragging || !dragOffset) return;

    const onMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const { w, h } = panelSizeRef.current;

      let nx = e.clientX - dragOffset.x;
      let ny = e.clientY - dragOffset.y;

      nx = clamp(nx, MARGIN, innerWidth - w - MARGIN);
      ny = clamp(ny, MARGIN, innerHeight - h - MARGIN);

      const stuck = stickyAdjust(nx, ny, e.clientX, e.clientY, innerWidth, innerHeight, w, h, !maximized);
      nx = stuck.x;
      ny = stuck.y;

      pendingPosRef.current = { x: nx, y: ny };
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingPosRef.current) setDragPos(pendingPosRef.current);
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      setDragPos(null);

      const { innerWidth, innerHeight } = window;

      if (maximized) {
        // Dock to left or right while preserving vertical hint from previous position
        const isLeftSide = e.clientX < innerWidth / 2;
        setPosition((prev) => {
          const vertical = prev.includes("top") ? "top" : prev.includes("bottom") ? "bottom" : "top";
          return (isLeftSide ? `${vertical}-left` : `${vertical}-right`) as Position;
        });
        return;
      }

      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        setPosition(snapFromPanelCenter(rect, innerWidth, innerHeight));
      } else {
        setPosition(closestCorner(e.clientX, e.clientY, innerWidth, innerHeight));
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingPosRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, dragOffset, maximized]);

  // Computed layout classes
  const positionClasses = useMemo<Record<Position, string>>(
    () => ({
      "top-left": "top-4",
      "top-right": "top-4",
      "bottom-left": "bottom-20",
      "bottom-right": "bottom-20",
    }),
    []
  );

  const maximizedSideClass = useMemo(
    () => (position === "top-left" || position === "bottom-left" ? "top-4 bottom-4" : "top-4 bottom-4"),
    [position]
  );

  const dockLeft = useMemo(() => computeDockLeft(position, panelWH.w, vw, maximized), [position, panelWH.w, vw, maximized]);

  const transformOrigin = useMemo<React.CSSProperties["transformOrigin"]>(() => computeTransformOrigin(position, maximized), [position, maximized]);

  const panelClass = useMemo(() => {
    const base = [
      "fixed z-50 overflow-hidden rounded-2xl border border-black/10 bg-white flex flex-col",
      dragPos ? "shadow-md transition-none" : "shadow-2xl transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
    ];

    if (dragPos) return base.concat("top-0 left-0").join(" ");

    if (maximized) return base.concat(`${maximizedSideClass} h-[calc(100vh-2rem)] w-[min(96vw,600px)]`).join(" ");

    return base.concat(`${positionClasses[position]} h-[60vh] w-[min(92vw,420px)]`).join(" ");
  }, [dragPos, maximized, maximizedSideClass, position, positionClasses]);

  const panelStyle = useMemo<React.CSSProperties | undefined>(() => {
    const size = maximized ? SIZE.max : SIZE.normal;
    if (dragPos) {
      return {
        top: dragPos.y,
        left: dragPos.x,
        right: "auto",
        bottom: "auto",
        width: size.w,
        height: size.h,
        willChange: "left, top, transform, opacity",
        transformOrigin,
        transform: navAnimating ? (maximized ? "scaleX(1.08)" : "scale(1.08)") : undefined,
      } as React.CSSProperties;
    }
    if (!open) return undefined;
    // Non-dragging: provide numeric `left` to allow smooth transition when docking left<->right
    return {
      left: dockLeft,
      right: "auto",
      width: size.w,
      height: size.h,
      transformOrigin,
      transform: navAnimating ? (maximized ? "scaleX(1.08)" : "scale(1.08)") : undefined,
      willChange: "left, top, transform, opacity",
    } as React.CSSProperties;
  }, [dragPos, maximized, dockLeft, open, navAnimating, transformOrigin]);

  useEffect(() => () => {
    if (navTimerRef.current != null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-rose-400 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90 active:scale-95 cursor-pointer"
        aria-expanded={open}
        aria-controls="cherry-chat"
        type="button"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {open ? "Close" : "Ask Cherry"}
        </span>
      </button>

      {open && (
        <div ref={panelRef} id="cherry-chat" className={panelClass} style={panelStyle} role="dialog" aria-label="Cherry chat">
          <div
            className="flex items-center justify-start px-2 py-1 border-b border-gray-100 bg-white gap-2 cursor-move select-none"
            onMouseDown={onHeaderMouseDown}
            onDoubleClick={() => {
              if (navTimerRef.current != null) return;
              setNavAnimating(true);
              navTimerRef.current = window.setTimeout(() => {
                navTimerRef.current = null;
                router.push(`/chat/${conversationId}`);
              }, NAV_MS);
            }}
          >
            <button
              onClick={() => setMaximized((v) => !v)}
              aria-label={maximized ? "Restore" : "Maximize"}
              className="cursor-pointer relative w-3 h-3 rounded-full bg-green-500 flex items-center justify-center group"
              type="button"
            >
              <Maximize2 className="w-2 h-2 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Chat messages={[]} conversationId={conversationId} isNew={true} />
          </div>
        </div>
      )}
    </>
  );
}