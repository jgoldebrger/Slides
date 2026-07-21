"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  type AnnotatorTool,
  drawArrow,
  fitImageToCanvas,
  loadImageElement,
  MAX_UNDO_SNAPSHOTS,
  normalizeRect,
  pixelateRegion,
} from "@/lib/slides/image-annotator";
import { cn } from "@/lib/utils";

export type ImageAnnotatorCanvasHandle = {
  undo: () => void;
  clearAnnotations: () => void;
  applyCrop: () => void;
  toBlob: () => Promise<Blob | null>;
};

type ImageAnnotatorCanvasProps = {
  imageUrl: string;
  tool: AnnotatorTool;
  color: string;
  strokeWidth: number;
  className?: string;
};

type Point = { x: number; y: number };

function getCanvas2d(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d", { willReadFrequently: true });
}

export const ImageAnnotatorCanvas = forwardRef<
  ImageAnnotatorCanvasHandle,
  ImageAnnotatorCanvasProps
>(function ImageAnnotatorCanvas(
  { imageUrl, tool, color, strokeWidth, className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const startRef = useRef<Point | null>(null);
  const penPointsRef = useRef<Point[]>([]);
  const [ready, setReady] = useState(false);
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const pushSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvas2d(canvas);
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [
      ...historyRef.current.slice(-(MAX_UNDO_SNAPSHOTS - 1)),
      snapshot,
    ];
  }, []);

  const redrawBase = useCallback(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;
    const ctx = getCanvas2d(canvas);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const restoreSnapshot = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const snapshot = historyRef.current[index];
      if (!canvas || !snapshot) return;
      const ctx = getCanvas2d(canvas);
      if (!ctx) return;
      ctx.putImageData(snapshot, 0, 0);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    historyRef.current = [];
    setCropRect(null);

    void (async () => {
      try {
        const img = await loadImageElement(imageUrl);
        if (cancelled) return;
        baseImageRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { width, height } = fitImageToCanvas(img, 960, 540);
        canvas.width = width;
        canvas.height = height;
        redrawBase();
        pushSnapshot();
        setReady(true);
      } catch {
        if (!cancelled) setReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, pushSnapshot, redrawBase]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const configureStroke = (ctx: CanvasRenderingContext2D) => {
    if (tool === "highlighter") {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
      ctx.fillStyle = "rgba(250, 204, 21, 0.45)";
      ctx.lineWidth = Math.max(strokeWidth * 3, 12);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "multiply";
    } else {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const drawPreview = useCallback(
    (current: Point) => {
      const canvas = canvasRef.current;
      const start = startRef.current;
      if (!canvas || !start) return;
      const ctx = getCanvas2d(canvas);
      if (!ctx) return;

      restoreSnapshot(historyRef.current.length - 1);
      configureStroke(ctx);

      if (tool === "pen" || tool === "highlighter") {
        const points = penPointsRef.current;
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        return;
      }

      if (tool === "rectangle" || tool === "crop") {
        const { x, y, w, h } = normalizeRect(start.x, start.y, current.x, current.y);
        ctx.setLineDash(tool === "crop" ? [8, 6] : []);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        if (tool === "crop") setCropRect({ x, y, w, h });
        return;
      }

      if (tool === "arrow") {
        drawArrow(ctx, start.x, start.y, current.x, current.y);
        return;
      }

      if (tool === "blur") {
        const { x, y, w, h } = normalizeRect(start.x, start.y, current.x, current.y);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#64748b";
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    },
    [color, restoreSnapshot, strokeWidth, tool]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);

    if (tool === "text") {
      const label = window.prompt("Label text");
      if (!label?.trim()) return;
      pushSnapshot();
      const canvas = canvasRef.current;
      const ctx = canvas ? getCanvas2d(canvas) : null;
      if (!ctx || !canvas) return;
      configureStroke(ctx);
      ctx.font = `${Math.max(14, strokeWidth * 4)}px sans-serif`;
      const padding = 6;
      const metrics = ctx.measureText(label);
      const boxW = metrics.width + padding * 2;
      const boxH = Math.max(14, strokeWidth * 4) + padding * 2;
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(point.x, point.y, boxW, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, point.x + padding, point.y + boxH - padding - 2);
      pushSnapshot();
      return;
    }

    drawingRef.current = true;
    startRef.current = point;
    penPointsRef.current = [point];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !startRef.current) return;
    const point = getPoint(e);
    penPointsRef.current.push(point);
    drawPreview(point);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !startRef.current) return;
    const end = getPoint(e);
    drawingRef.current = false;

    if (tool === "pen" || tool === "highlighter") {
      pushSnapshot();
    } else if (tool === "rectangle" || tool === "arrow") {
      const canvas = canvasRef.current;
      const ctx = canvas ? getCanvas2d(canvas) : null;
      if (!ctx || !startRef.current) return;
      restoreSnapshot(historyRef.current.length - 1);
      configureStroke(ctx);
      if (tool === "rectangle") {
        const { x, y, w, h } = normalizeRect(
          startRef.current.x,
          startRef.current.y,
          end.x,
          end.y
        );
        ctx.strokeRect(x, y, w, h);
      } else {
        drawArrow(ctx, startRef.current.x, startRef.current.y, end.x, end.y);
      }
      pushSnapshot();
    } else if (tool === "blur") {
      const canvas = canvasRef.current;
      const ctx = canvas ? getCanvas2d(canvas) : null;
      if (!ctx || !startRef.current) return;
      restoreSnapshot(historyRef.current.length - 1);
      const { x, y, w, h } = normalizeRect(
        startRef.current.x,
        startRef.current.y,
        end.x,
        end.y
      );
      pixelateRegion(ctx, x, y, w, h);
      pushSnapshot();
    } else if (tool === "crop") {
      const { x, y, w, h } = normalizeRect(
        startRef.current.x,
        startRef.current.y,
        end.x,
        end.y
      );
      setCropRect({ x, y, w, h });
    }

    startRef.current = null;
    penPointsRef.current = [];
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyRef.current.length <= 1) return;
      historyRef.current.pop();
      restoreSnapshot(historyRef.current.length - 1);
      setCropRect(null);
    },
    clearAnnotations: () => {
      redrawBase();
      historyRef.current = [];
      pushSnapshot();
      setCropRect(null);
    },
    applyCrop: () => {
      const canvas = canvasRef.current;
      if (!canvas || !cropRect || cropRect.w < 4 || cropRect.h < 4) return;
      const ctx = getCanvas2d(canvas);
      if (!ctx) return;
      const { x, y, w, h } = cropRect;
      const cropped = ctx.getImageData(x, y, w, h);
      canvas.width = w;
      canvas.height = h;
      ctx.putImageData(cropped, 0, 0);
      const img = new Image();
      img.src = canvas.toDataURL("image/png");
      img.onload = () => {
        baseImageRef.current = img;
        historyRef.current = [];
        pushSnapshot();
        setCropRect(null);
      };
    },
    toBlob: async () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
      });
    },
  }));

  return (
    <div className={cn("relative overflow-auto rounded-md border border-border bg-muted/30", className)}>
      {!ready && (
        <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
          Loading image…
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          "mx-auto block max-h-[min(60vh,540px)] w-full cursor-crosshair touch-none",
          !ready && "hidden"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
});
