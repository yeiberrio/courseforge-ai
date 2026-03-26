import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface SlideData {
  title: string;
  content: string[];
  slideNumber: number;
  totalSlides: number;
  courseTitle: string;
}

@Injectable()
export class SlideService {
  private readonly logger = new Logger(SlideService.name);

  /**
   * Generate slide images as SVG → PNG using simple HTML/SVG approach.
   * Each slide is a 1920x1080 image.
   */
  async generateSlides(
    slides: SlideData[],
    outputDir: string,
    style: 'minimal' | 'branded' | 'dark' = 'minimal',
  ): Promise<string[]> {
    mkdirSync(outputDir, { recursive: true });
    const paths: string[] = [];

    for (const slide of slides) {
      const svgContent = this.renderSlideSvg(slide, style);
      const outputPath = join(outputDir, `slide_${String(slide.slideNumber).padStart(3, '0')}.svg`);
      writeFileSync(outputPath, svgContent);
      paths.push(outputPath);
      this.logger.log(`Slide ${slide.slideNumber}/${slide.totalSlides} generated`);
    }

    return paths;
  }

  private renderSlideSvg(slide: SlideData, style: string): string {
    const colors = this.getColors(style);

    const contentLines = slide.content
      .map((line, i) => {
        const y = 480 + i * 65;
        return `<text x="160" y="${y}" fill="${colors.text}" font-family="Arial, sans-serif" font-size="36" font-weight="400">• ${this.escapeXml(line)}</text>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <!-- Background -->
  <rect width="1920" height="1080" fill="${colors.bg}" />

  <!-- Top accent bar -->
  <rect width="1920" height="8" fill="${colors.accent}" />

  <!-- Course title -->
  <text x="160" y="100" fill="${colors.muted}" font-family="Arial, sans-serif" font-size="24" font-weight="400">${this.escapeXml(slide.courseTitle)}</text>

  <!-- Slide number -->
  <text x="1760" y="100" fill="${colors.muted}" font-family="Arial, sans-serif" font-size="24" text-anchor="end">${slide.slideNumber} / ${slide.totalSlides}</text>

  <!-- Separator line -->
  <line x1="160" y1="130" x2="1760" y2="130" stroke="${colors.border}" stroke-width="1" />

  <!-- Title -->
  <text x="160" y="320" fill="${colors.title}" font-family="Arial, sans-serif" font-size="56" font-weight="700">${this.escapeXml(slide.title)}</text>

  <!-- Underline -->
  <rect x="160" y="345" width="200" height="6" rx="3" fill="${colors.accent}" />

  <!-- Content -->
  ${contentLines}

  <!-- Footer -->
  <text x="960" y="1040" fill="${colors.muted}" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">CourseForge AI</text>
</svg>`;
  }

  private getColors(style: string) {
    switch (style) {
      case 'dark':
        return { bg: '#1a1a2e', title: '#ffffff', text: '#e0e0e0', muted: '#888888', accent: '#6366f1', border: '#333333' };
      case 'branded':
        return { bg: '#f0f0ff', title: '#1e1b4b', text: '#374151', muted: '#6b7280', accent: '#4f46e5', border: '#c7d2fe' };
      default: // minimal
        return { bg: '#ffffff', title: '#111827', text: '#374151', muted: '#9ca3af', accent: '#6366f1', border: '#e5e7eb' };
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
