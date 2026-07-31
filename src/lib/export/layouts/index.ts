import { stripHex } from "./types";
import type { PptxLayoutMapper } from "./types";
import { normalizeChartData } from "@/lib/slides/metrics-to-chart";
import { richTextToPlainText } from "@/lib/slides/rich-text";
import { PPTX_SLIDE_WIDTH_IN } from "@/lib/slides/layout-spec";

export const mapTitleLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  composition,
}) => {
  if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x: composition.paddingIn,
      y: composition.contentYIn,
      w: PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2,
      h: composition.contentHeightIn,
      fontSize: composition.typography.bodyPt,
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
  composition,
}) => {
  const bullets = slide.content.bullets ?? [];
  const hasImage = Boolean(slide.content.imageUrl);
  const slideWidth = PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2;
  const textW = hasImage ? composition.imageTextWidthIn : slideWidth;
  const textOpts = {
    fontSize: composition.typography.bulletPt,
    fontFace: font,
    color: stripHex(colors.muted),
  };
  const x = composition.paddingIn;
  const y = composition.contentYIn;
  const h = composition.contentHeightIn;

  if (bullets.length) {
    pptxSlide.addText(
      bullets.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
      {
        x,
        y,
        w: textW,
        h,
        ...textOpts,
      }
    );
  } else if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x,
      y,
      w: textW,
      h,
      fontSize: composition.typography.bodyPt,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }

  if (hasImage && slide.content.imageUrl) {
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: composition.paddingIn + composition.imageTextWidthIn + 0.2,
      y,
      w: composition.imageWidthIn,
      h: Math.min(h, 3.8),
    });
  }
};

export const mapMetricsGridLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  composition,
}) => {
  const metrics = slide.content.metrics ?? [];
  const cols = composition.metricsCols;
  const usableW = PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2;
  const colW = usableW / cols - 0.15;
  const rowH = composition.contentGapIn + 1.0;

  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pptxSlide.addText(`${m.value}\n${m.label}`, {
      x: composition.paddingIn + col * (colW + 0.15),
      y: composition.contentYIn + row * rowH,
      w: colW,
      h: rowH,
      fontSize: composition.typography.metricValuePt,
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
  composition,
}) => {
  const gap = composition.timelineGapIn;
  (slide.content.bullets ?? []).forEach((item, i) => {
    pptxSlide.addShape("ellipse", {
      x: composition.paddingIn + 0.05,
      y: composition.contentYIn + 0.15 + i * gap,
      w: 0.12,
      h: 0.12,
      fill: { color: stripHex(colors.primary) },
      line: { color: stripHex(colors.primary), width: 0 },
    });
    pptxSlide.addText(richTextToPlainText(item), {
      x: composition.paddingIn + 0.35,
      y: composition.contentYIn + i * gap,
      w: PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2 - 0.35,
      h: gap,
      fontSize: composition.typography.bulletPt,
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
  composition,
}) => {
  const bullets = slide.content.bullets ?? [];
  const mid = Math.ceil(bullets.length / 2);
  const left = bullets.slice(0, mid);
  const right = bullets.slice(mid);
  const colW = (PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2 - 0.2) / 2;
  const x = composition.paddingIn;
  const y = composition.contentYIn;
  const h = composition.contentHeightIn;
  const textOpts = {
    fontSize: composition.typography.bulletPt,
    fontFace: font,
    color: stripHex(colors.muted),
  };

  if (slide.content.imageUrl) {
    const leftBullets = left.length ? left : bullets;
    if (leftBullets.length) {
      pptxSlide.addText(
        leftBullets.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
        {
          x,
          y,
          w: colW,
          h,
          ...textOpts,
        }
      );
    }
    if (slide.content.body) {
      pptxSlide.addText(richTextToPlainText(slide.content.body), {
        x,
        y: y + h * 0.55,
        w: colW,
        h: h * 0.4,
        fontSize: composition.typography.bodyPt,
        fontFace: font,
        color: stripHex(colors.muted),
      });
    }
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: composition.paddingIn + colW + 0.2,
      y,
      w: composition.imageWidthIn,
      h: Math.min(h, 3.8),
    });
    if (right.length) {
      pptxSlide.addText(
        right.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
        {
          x: composition.paddingIn + colW + 0.2,
          y: y + 3.9,
          w: composition.imageWidthIn,
          h: 1.2,
          fontSize: composition.typography.bulletPt,
          fontFace: font,
          color: stripHex(colors.muted),
        }
      );
    }
    return;
  }

  if (left.length) {
    pptxSlide.addText(
      left.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
      { x, y, w: colW, h, ...textOpts }
    );
  }
  if (right.length) {
    pptxSlide.addText(
      right.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
      {
        x: composition.paddingIn + colW + 0.2,
        y,
        w: colW,
        h,
        ...textOpts,
      }
    );
  }
  if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x: composition.paddingIn + colW + 0.2,
      y: y + h * 0.55,
      w: colW,
      h: h * 0.4,
      fontSize: composition.typography.bodyPt,
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
  composition,
}) => {
  const bullets = slide.content.bullets ?? [];
  const x = composition.paddingIn;
  const y = composition.contentYIn;
  const textH = Math.min(composition.contentHeightIn, 3.8);

  if (bullets.length) {
    pptxSlide.addText(
      bullets.map((b) => ({ text: richTextToPlainText(b), options: { bullet: true } })),
      {
        x,
        y,
        w: composition.imageTextWidthIn,
        h: textH,
        fontSize: composition.typography.bulletPt,
        fontFace: font,
        color: stripHex(colors.muted),
      }
    );
  } else if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x,
      y,
      w: composition.imageTextWidthIn,
      h: textH,
      fontSize: composition.typography.bodyPt,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }

  if (slide.content.imageUrl) {
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: composition.paddingIn + composition.imageTextWidthIn + 0.2,
      y,
      w: composition.imageWidthIn,
      h: textH,
    });
  }
};

export const mapChartLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  composition,
}) => {
  const data = normalizeChartData(slide.content.chartData);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = Math.min(composition.contentHeightIn * 0.55, 2.8);
  const baseY = composition.contentYIn + chartHeight;

  data.forEach((point, i) => {
    const barHeight = Math.max(0.2, (point.value / maxValue) * chartHeight);
    const label = point.name;
    const x = composition.paddingIn + 0.5 + i * 1.1;

    pptxSlide.addShape("rect", {
      x,
      y: baseY - barHeight,
      w: 0.7,
      h: barHeight,
      fill: { color: stripHex(colors.primary) },
      line: { color: stripHex(colors.primary), width: 0 },
    });
    pptxSlide.addText(label, {
      x: x - 0.1,
      y: baseY + 0.05,
      w: 0.9,
      h: 0.3,
      fontSize: composition.typography.captionPt,
      align: "center",
      fontFace: font,
      color: stripHex(colors.muted),
    });
  });

  if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x: composition.paddingIn,
      y: baseY + 0.45,
      w: PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2,
      h: 0.5,
      fontSize: composition.typography.bodyPt,
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
  composition,
}) => {
  const x = composition.paddingIn + 0.5;
  const w = PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2 - 1;
  if (slide.content.quote) {
    pptxSlide.addText(`"${richTextToPlainText(slide.content.quote)}"`, {
      x,
      y: composition.contentYIn,
      w,
      h: composition.contentHeightIn * 0.6,
      fontSize: composition.typography.titlePt,
      italic: true,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
  if (slide.content.attribution) {
    pptxSlide.addText(`— ${slide.content.attribution}`, {
      x,
      y: composition.contentYIn + composition.contentHeightIn * 0.65,
      w,
      h: 0.5,
      fontSize: composition.typography.captionPt,
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
  composition,
}) => {
  pptxSlide.addShape("rect", {
    x: composition.paddingIn,
    y: composition.contentYIn,
    w: 0.08,
    h: Math.min(composition.contentHeightIn, 2.5),
    fill: { color: stripHex(colors.primary) },
    line: { color: stripHex(colors.primary), width: 0 },
  });
  if (slide.content.body) {
    pptxSlide.addText(richTextToPlainText(slide.content.body), {
      x: composition.paddingIn + 0.35,
      y: composition.contentYIn + 0.5,
      w: PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2 - 0.35,
      h: 1.5,
      fontSize: composition.typography.bodyPt,
      fontFace: font,
      color: stripHex(colors.muted),
    });
  }
};
