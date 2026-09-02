import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, GripVertical, Settings2, Trash2 } from "lucide-react";
import type { WidgetPayload, WidgetRecord } from "@/lib/dashboards.functions";
import { renderWidget } from "@/components/widgets/registry";
import { WidgetError, WidgetSkeleton } from "@/components/widgets/widget-frame";
import { cn } from "@/lib/utils";

export type GridWidget = WidgetRecord;

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: { x: number; y: number; w: number; h: number };
};

export function GridCanvas({
  widgets,
  data,
  loading,
  cols = 12,
  rowHeight = 40,
  editable = false,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}: {
  widgets: GridWidget[];
  data: Record<string, WidgetPayload> | undefined;
  loading?: boolean | undefined;
  cols?: number | undefined;
  rowHeight?: number | undefined;
  editable?: boolean | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onChange?: ((widgets: GridWidget[]) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  onDuplicate?: ((id: string) => void) | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 1200));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cw = width / cols;
  const rows = Math.max(12, ...widgets.map((w) => w.grid_y + w.grid_h)) + (editable ? 4 : 1);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!drag) return;
      const dx = Math.round((e.clientX - drag.startX) / cw);
      const dy = Math.round((e.clientY - drag.startY) / rowHeight);
      if (drag.mode === "move") {
        setGhost({
          x: Math.max(0, Math.min(cols - drag.origin.w, drag.origin.x + dx)),
          y: Math.max(0, drag.origin.y + dy),
          w: drag.origin.w,
          h: drag.origin.h,
        });
      } else {
        setGhost({
          x: drag.origin.x,
          y: drag.origin.y,
          w: Math.max(2, Math.min(cols - drag.origin.x, drag.origin.w + dx)),
          h: Math.max(3, drag.origin.h + dy),
        });
      }
    },
    [drag, cw, rowHeight, cols],
  );

  const endDrag = useCallback(() => {
    if (drag && ghost && onChange) {
      onChange(
        widgets.map((w) =>
          w.id === drag.id ? { ...w, grid_x: ghost.x, grid_y: ghost.y, grid_w: ghost.w, grid_h: ghost.h } : w,
        ),
      );
    }
    setDrag(null);
    setGhost(null);
  }, [drag, ghost, onChange, widgets]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
    };
  }, [drag, onPointerMove, endDrag]);

  const start = (e: React.PointerEvent, w: GridWidget, mode: "move" | "resize") => {
    if (!editable) return;
    e.preventDefault();
    onSelect?.(w.id);
    setDrag({
      id: w.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { x: w.grid_x, y: w.grid_y, w: w.grid_w, h: w.grid_h },
    });
    setGhost({ x: w.grid_x, y: w.grid_y, w: w.grid_w, h: w.grid_h });
  };

  return (
    <div
      ref={ref}
      className={cn("relative w-full", editable && "grid-canvas rounded-xl")}
      style={{
        height: rows * rowHeight,
        ...(editable ? { backgroundSize: `${cw}px ${rowHeight}px` } : {}),
      }}
    >
      {widgets.map((w) => {
        const live = drag?.id === w.id && ghost ? ghost : { x: w.grid_x, y: w.grid_y, w: w.grid_w, h: w.grid_h };
        const payload = data?.[w.id];
        const selected = selectedId === w.id;
        return (
          <div
            key={w.id}
            className={cn("absolute p-1.5 transition-[left,top,width,height] duration-100", drag?.id === w.id && "z-20")}
            style={{ left: live.x * cw, top: live.y * rowHeight, width: live.w * cw, height: live.h * rowHeight }}
          >
            <div
              className={cn(
                "relative h-full",
                editable && "cursor-move rounded-xl ring-offset-2 ring-offset-background",
                selected && "ring-2 ring-brand rounded-xl",
              )}
              onPointerDown={(e) => {
                if (editable && !(e.target as HTMLElement).closest("[data-no-drag]")) start(e, w, "move");
              }}
            >
              {loading ? (
                <WidgetSkeleton title={w.title} />
              ) : payload?.status === "error" ? (
                <WidgetError title={w.title} message={payload.error ?? "Unknown error"} />
              ) : (
                renderWidget(w, payload)
              )}

              {editable ? (
                <>
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md border border-border bg-card/95 p-0.5 opacity-0 shadow-sm transition-opacity hover:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100">
                    <button
                      data-no-drag
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => onSelect?.(w.id)}
                      aria-label="Configure widget"
                    >
                      <Settings2 className="size-3.5" />
                    </button>
                    <button
                      data-no-drag
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => onDuplicate?.(w.id)}
                      aria-label="Duplicate widget"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      data-no-drag
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete?.(w.id)}
                      aria-label="Remove widget"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <span className="p-1 text-muted-foreground">
                      <GripVertical className="size-3.5" />
                    </span>
                  </div>
                  <div
                    role="presentation"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      start(e, w, "resize");
                    }}
                    className="absolute bottom-0 right-0 size-4 cursor-nwse-resize rounded-br-xl border-b-2 border-r-2 border-brand/50"
                  />
                </>
              ) : null}
            </div>
          </div>
        );
      })}

      {widgets.length === 0 ? (
        <div className="absolute inset-x-0 top-24 text-center text-sm text-muted-foreground">
          {editable ? "Add a widget from the palette to start building." : "This dashboard has no widgets yet."}
        </div>
      ) : null}
    </div>
  );
}
