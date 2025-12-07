// Dynamic import of sharp to avoid TS1259 issues when esModuleInterop isn't honored by certain tooling
import * as path from 'node:path';
import { CapturedPuzzle, Rect } from './types';
import { ensureDir } from './config';

interface AnnotationOptions {
  tag: string;
  gap?: Rect;
  piece?: Rect;
  text?: string;
  extraLines?: string[];
  arrow?: { from: { x: number; y: number } | number; to: { x: number; y: number } | number };
  confidences?: { gap?: number; piece?: number };
}

const font = "font-family: 'Inter', Arial, sans-serif; font-size: 14px; fill: #fff;";
const smallFont = "font-family: 'Inter', Arial, sans-serif; font-size: 12px; fill: #fff;";

export async function annotatePuzzle(
  puzzle: CapturedPuzzle,
  opts: AnnotationOptions,
  debugDir: string
): Promise<string | null> {
  const sharpMod = await import('sharp');
  const sharp: typeof import('sharp') = (sharpMod as any).default ?? (sharpMod as any);
  if (!puzzle.debugPath) {
    return null;
  }
  try {
    ensureDir(debugDir);
    const baseBuffer = await sharp(puzzle.debugPath).png().toBuffer();
    const meta = await sharp(baseBuffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    const rects: string[] = [];
    if (opts.gap) {
      rects.push(
        `<rect x="${opts.gap.x.toFixed(1)}" y="${opts.gap.y.toFixed(1)}" width="${opts.gap.width.toFixed(1)}" height="${opts.gap.height.toFixed(1)}" fill="rgba(76,217,100,0.18)" stroke="#4caf50" stroke-width="2" />`
      );
      if (typeof opts.confidences?.gap === 'number') {
        rects.push(
          `<text x="${(opts.gap.x + 4).toFixed(1)}" y="${(opts.gap.y + 18).toFixed(1)}" style="${smallFont}">tc-piece ${(opts.confidences.gap * 100).toFixed(1)}%</text>`
        );
      }
    }
    if (opts.piece) {
      rects.push(
        `<rect x="${opts.piece.x.toFixed(1)}" y="${opts.piece.y.toFixed(1)}" width="${opts.piece.width.toFixed(1)}" height="${opts.piece.height.toFixed(1)}" fill="rgba(255,61,87,0.18)" stroke="#ff4d4f" stroke-width="2" />`
      );
      if (typeof opts.confidences?.piece === 'number') {
        rects.push(
          `<text x="${(opts.piece.x + 4).toFixed(1)}" y="${(opts.piece.y + 18).toFixed(1)}" style="${smallFont}">tc-drag ${(opts.confidences.piece * 100).toFixed(1)}%</text>`
        );
      }
    }
    if (opts.arrow) {
      const fromX = typeof opts.arrow.from === 'number' ? opts.arrow.from : opts.arrow.from.x;
      const fromY = typeof opts.arrow.from === 'number' ? Math.round(height * 0.62) : opts.arrow.from.y;
      const toX = typeof opts.arrow.to === 'number' ? opts.arrow.to : opts.arrow.to.x;
      const toY = typeof opts.arrow.to === 'number' ? Math.round(height * 0.62) : opts.arrow.to.y;
      rects.push(
        `<line x1="${fromX.toFixed(1)}" y1="${fromY.toFixed(1)}" x2="${toX.toFixed(1)}" y2="${toY.toFixed(1)}" stroke="#ffcc00" stroke-width="3" marker-end="url(#arrowhead)" />`
      );
    }

    const headerLines = [opts.text ?? opts.tag, ...(opts.extraLines ?? [])].filter(Boolean);
    const headerHeight = 26 + Math.max(0, headerLines.length - 1) * 18;
    const labelWidth = Math.min(width - 16, 460);
    const svg = `<?xml version="1.0"?>
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
            <path d="M0,0 L0,8 L12,4 z" fill="#ffcc00" />
          </marker>
        </defs>
        ${rects.join('\n')}
        <rect x="8" y="6" width="${labelWidth}" height="${headerHeight}" fill="rgba(0,0,0,0.55)" rx="6" />
        ${headerLines
          .map((line, idx) => `<text x="16" y="${24 + idx * 18}" style="${font}">${line}</text>`)
          .join('\n')}
      </svg>`;

    const outputPath = path.resolve(debugDir, `${opts.tag}.png`);
    await sharp(baseBuffer)
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .png()
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.log('[Captcha Debug] Annotation failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}
