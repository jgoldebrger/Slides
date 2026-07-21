/** Canvas annotation helpers (no DOM). */

export type AnnotatorTool =
  | "pen"
  | "highlighter"
  | "rectangle"
  | "arrow"
  | "text"
  | "blur"
  | "crop";

export const ANNOTATOR_TOOLS: { id: AnnotatorTool; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "highlighter", label: "Highlight" },
  { id: "rectangle", label: "Rectangle" },
  { id: "arrow", label: "Arrow" },
  { id: "text", label: "Text" },
  { id: "blur", label: "Blur" },
  { id: "crop", label: "Crop" },
];

export const ANNOTATOR_COLORS = [
  "#e11d48",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#171717",
  "#ffffff",
] as const;

export const MAX_UNDO_SNAPSHOTS = 20;

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const headLength = Math.min(24, Math.hypot(x2 - x1, y2 - y1) * 0.3);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

export function pixelateRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize = 12
) {
  const ix = Math.round(Math.min(x, x + w));
  const iy = Math.round(Math.min(y, y + h));
  const iw = Math.round(Math.abs(w));
  const ih = Math.round(Math.abs(h));
  if (iw < 2 || ih < 2) return;

  const imageData = ctx.getImageData(ix, iy, iw, ih);
  const { data, width, height } = imageData;

  for (let row = 0; row < height; row += blockSize) {
    for (let col = 0; col < width; col += blockSize) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && row + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && col + dx < width; dx++) {
          const i = ((row + dy) * width + (col + dx)) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          a += data[i + 3];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);

      for (let dy = 0; dy < blockSize && row + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && col + dx < width; dx++) {
          const i = ((row + dy) * width + (col + dx)) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
    }
  }

  ctx.putImageData(imageData, ix, iy);
}

export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function fitImageToCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
  return {
    width: Math.round(img.naturalWidth * scale),
    height: Math.round(img.naturalHeight * scale),
  };
}
