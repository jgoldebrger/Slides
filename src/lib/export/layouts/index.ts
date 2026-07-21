import { stripHex } from "./types";
import type { PptxLayoutMapper } from "./types";
import { normalizeChartData } from "@/lib/slides/metrics-to-chart";

export const mapTitleLayout: PptxLayoutMapper = ({ pptxSlide, slide, font, colors }) => {
  if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 0.8,
      fontSize: 16,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};

export const mapBulletsLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  const bullets = slide.content.bullets ?? [];
  const hasImage = Boolean(slide.content.imageUrl);
  const textW = hasImage ? 4.3 : 9;
  const textOpts = {
    fontSize: 16,
    fontFace: font,
    color: stripHex(colors.muted),
  };

  if (bullets.length) {
    pptxSlide.addText(
      bullets.map((b) => ({ text: b, options: { bullet: true } })),
      {
        x: 0.5,
        y: contentY,
        w: textW,
        h: 4,
        ...textOpts,
      }
    );
  } else if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 0.5,
      y: contentY,
      w: textW,
      h: 4,
      ...textOpts,
    });
  }

  if (hasImage && slide.content.imageUrl) {
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: 5.1,
      y: contentY,
      w: 4.4,
      h: 3.8,
    });
  }
};

export const mapMetricsGridLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  slide.content.metrics?.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    pptxSlide.addText(`${m.value}\n${m.label}`, {
      x: 0.5 + col * 3.1,
      y: contentY + 0.3 + row * 1.5,
      w: 2.8,
      h: 1.2,
      fontSize: 18,
      color: stripHex(colors.accent),
      fontFace: font,
    });
  });
};

export const mapTimelineLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  (slide.content.bullets ?? []).forEach((item, i) => {
    pptxSlide.addShape("ellipse", {
      x: 0.55,
      y: contentY + 0.15 + i * 0.55,
      w: 0.12,
      h: 0.12,
      fill: { color: stripHex(colors.primary) },
      line: { color: stripHex(colors.primary), width: 0 },
    });
    pptxSlide.addText(item, {
      x: 0.85,
      y: contentY + i * 0.55,
      w: 8.5,
      h: 0.45,
      fontSize: 14,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  });
};

export const mapTwoColumnLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  const bullets = slide.content.bullets ?? [];
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);

  if (slide.content.imageUrl) {
    const leftBullets = left.length ? left : bullets;
    if (leftBullets.length) {
      pptxSlide.addText(
        leftBullets.map((b) => ({ text: b, options: { bullet: true } })),
        {
          x: 0.5,
          y: contentY,
          w: 4.2,
          h: 4,
          fontSize: 14,
          fontFace: font,
          color: stripHex(colors.muted),
        }
      );
    }
    if (slide.content.body) {
      pptxSlide.addText(slide.content.body, {
        x: 0.5,
        y: contentY + 2.2,
        w: 4.2,
        h: 1.5,
        fontSize: 13,
        fontFace: font,
        color: stripHex(colors.muted),
      });
    }
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: 5.1,
      y: contentY,
      w: 4.4,
      h: 3.8,
    });
    if (right.length) {
      pptxSlide.addText(
        right.map((b) => ({ text: b, options: { bullet: true } })),
        {
          x: 5.1,
          y: contentY + 3.9,
          w: 4.4,
          h: 1.2,
          fontSize: 12,
          fontFace: font,
          color: stripHex(colors.muted),
        }
      );
    }
    return;
  }

  if (left.length) {
    pptxSlide.addText(
      left.map((b) => ({ text: b, options: { bullet: true } })),
      {
        x: 0.5,
        y: contentY,
        w: 4.2,
        h: 4,
        fontSize: 14,
        fontFace: font,
        color: stripHex(colors.muted),
      }
    );
  }
  if (right.length) {
    pptxSlide.addText(
      right.map((b) => ({ text: b, options: { bullet: true } })),
      {
        x: 5.2,
        y: contentY,
        w: 4.2,
        h: 4,
        fontSize: 14,
        fontFace: font,
        color: stripHex(colors.muted),
      }
    );
  }
  if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 5.2,
      y: contentY + 2.2,
      w: 4.2,
      h: 1.5,
      fontSize: 13,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};

export const mapImageCaptionLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  const bullets = slide.content.bullets ?? [];

  if (bullets.length) {
    pptxSlide.addText(
      bullets.map((b) => ({ text: b, options: { bullet: true } })),
      {
        x: 0.5,
        y: contentY,
        w: 4.3,
        h: 3.8,
        fontSize: 14,
        fontFace: font,
        color: stripHex(colors.muted),
      }
    );
  } else if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 0.5,
      y: contentY,
      w: 4.3,
      h: 3.8,
      fontSize: 14,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }

  if (slide.content.imageUrl) {
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: 5.1,
      y: contentY,
      w: 4.4,
      h: 3.8,
    });
  }
};

export const mapChartLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  const data = normalizeChartData(slide.content.chartData);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  data.forEach((point, i) => {
    const barHeight = Math.max(0.2, (point.value / maxValue) * 2.5);
    const label = point.name;
    const x = 1 + i * 1.1;

    pptxSlide.addShape("rect", {
      x,
      y: contentY + 2.8 - barHeight,
      w: 0.7,
      h: barHeight,
      fill: { color: stripHex(colors.primary) },
      line: { color: stripHex(colors.primary), width: 0 },
    });
    pptxSlide.addText(label, {
      x: x - 0.1,
      y: contentY + 2.95,
      w: 0.9,
      h: 0.3,
      fontSize: 10,
      align: "center",
      fontFace: font,
      color: stripHex(colors.muted),
    });
  });

  if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 0.5,
      y: contentY + 3.4,
      w: 9,
      h: 0.5,
      fontSize: 12,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};

export const mapQuoteLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
}) => {
  if (slide.content.quote) {
    pptxSlide.addText(`"${slide.content.quote}"`, {
      x: 1,
      y: 2,
      w: 8,
      h: 2,
      fontSize: 22,
      italic: true,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
  if (slide.content.attribution) {
    pptxSlide.addText(`— ${slide.content.attribution}`, {
      x: 1,
      y: 4.2,
      w: 8,
      h: 0.5,
      fontSize: 14,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};

export const mapSectionBreakLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  contentY,
}) => {
  pptxSlide.addShape("rect", {
    x: 0.5,
    y: contentY,
    w: 0.08,
    h: 2.5,
    fill: { color: stripHex(colors.primary) },
    line: { color: stripHex(colors.primary), width: 0 },
  });
  if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 0.85,
      y: contentY + 0.5,
      w: 8.5,
      h: 1.5,
      fontSize: 16,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};
