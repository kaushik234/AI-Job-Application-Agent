/**
 * @file src/resume/ResumePDFGenerator.ts
 * @description PDF generation engine using PDF-LIB for constructing ATS-optimized high-impact tailored resumes.
 * @architect Clean Architecture - PDF Rendering Service
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MasterResume, TailoredResume } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class ResumePDFGenerator {
  /**
   * Renders a clean 1 or 2 page ATS-compliant PDF resume from master and tailored data.
   * @param master - Candidate master resume
   * @param tailored - AI tailored customization payload
   * @returns PDF document bytes as Uint8Array and Data URL
   */
  public static async generatePDF(
    master: MasterResume,
    tailored: TailoredResume
  ): Promise<{ pdfBytes: Uint8Array; dataUrl: string }> {
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait size
      const { width, height } = page.getSize();

      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 40;
      let y = height - margin;

      // Primary colors
      const primaryColor = rgb(0.1, 0.25, 0.45); // Deep Navy Accent
      const textColor = rgb(0.15, 0.15, 0.15); // Soft Black
      const lightGray = rgb(0.5, 0.5, 0.5);

      // Helper function for adding new page if content overflows
      const checkPageOverflow = (requiredHeight: number) => {
        if (y - requiredHeight < margin) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
      };

      // 1. CANDIDATE HEADER
      page.drawText(master.fullName.toUpperCase(), {
        x: margin,
        y: y - 10,
        size: 18,
        font: boldFont,
        color: primaryColor,
      });
      y -= 28;

      const contactLine = `${master.email}  |  ${master.phone}  |  ${master.location}`;
      page.drawText(contactLine, {
        x: margin,
        y,
        size: 9,
        font: timesRomanFont,
        color: textColor,
      });
      y -= 14;

      const linksLine = `LinkedIn: ${master.linkedIn}  |  GitHub: ${master.github}`;
      page.drawText(linksLine, {
        x: margin,
        y,
        size: 9,
        font: timesRomanFont,
        color: primaryColor,
      });
      y -= 20;

      // Divider line
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: primaryColor,
      });
      y -= 16;

      // 2. PROFESSIONAL SUMMARY
      checkPageOverflow(60);
      page.drawText('PROFESSIONAL SUMMARY', {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      y -= 14;

      const summaryText = tailored.customSummary || master.summary;
      // Simple text wrapping helper
      const maxLineWidth = width - 2 * margin;
      const wrapText = (text: string, fontSize: number, font: typeof timesRomanFont) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const lineWidth = font.widthOfTextAtSize(testLine, fontSize);
          if (lineWidth > maxLineWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      const summaryLines = wrapText(summaryText, 9.5, timesRomanFont);
      for (const line of summaryLines) {
        checkPageOverflow(12);
        page.drawText(line, { x: margin, y, size: 9.5, font: timesRomanFont, color: textColor });
        y -= 12;
      }
      y -= 10;

      // 3. KEY SKILLS (PRIORITIZED FOR ATS)
      checkPageOverflow(50);
      page.drawText('TECHNICAL SKILLS & COMPETENCIES', {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      y -= 14;

      const skillsList = tailored.prioritizedSkills && tailored.prioritizedSkills.length > 0
        ? tailored.prioritizedSkills.join(', ')
        : [
            ...master.skills.languages,
            ...master.skills.frameworks,
            ...master.skills.cloudAndDevOps,
            ...master.skills.databases,
          ].join(', ');

      const skillLines = wrapText(`Core Skills: ${skillsList}`, 9.5, timesRomanFont);
      for (const line of skillLines) {
        checkPageOverflow(12);
        page.drawText(line, { x: margin, y, size: 9.5, font: timesRomanFont, color: textColor });
        y -= 12;
      }
      y -= 10;

      // 4. WORK EXPERIENCE
      checkPageOverflow(50);
      page.drawText('PROFESSIONAL EXPERIENCE', {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      y -= 16;

      const experiencesToRender = tailored.reorganizedExperience || master.experience.map(e => ({
        company: e.company,
        role: e.role,
        period: `${e.startDate} - ${e.endDate}`,
        tailoredHighlights: e.highlights
      }));

      for (const exp of experiencesToRender) {
        checkPageOverflow(40);
        // Role & Company Header line
        page.drawText(`${exp.role} — ${exp.company}`, {
          x: margin,
          y,
          size: 10,
          font: boldFont,
          color: textColor,
        });
        const periodWidth = timesRomanFont.widthOfTextAtSize(exp.period || '', 9);
        page.drawText(exp.period || '', {
          x: width - margin - periodWidth,
          y,
          size: 9,
          font: timesRomanFont,
          color: lightGray,
        });
        y -= 14;

        // Highlights
        for (const highlight of exp.tailoredHighlights) {
          const bulletLines = wrapText(`• ${highlight}`, 9, timesRomanFont);
          for (const line of bulletLines) {
            checkPageOverflow(12);
            page.drawText(line, { x: margin + 10, y, size: 9, font: timesRomanFont, color: textColor });
            y -= 12;
          }
        }
        y -= 8;
      }

      // 5. EDUCATION
      checkPageOverflow(40);
      page.drawText('EDUCATION', {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: primaryColor,
      });
      y -= 14;

      for (const edu of master.education) {
        checkPageOverflow(14);
        page.drawText(`${edu.degree} in ${edu.fieldOfStudy}`, {
          x: margin,
          y,
          size: 9.5,
          font: boldFont,
          color: textColor,
        });
        page.drawText(`${edu.institution} (${edu.graduationYear})`, {
          x: margin + 250,
          y,
          size: 9,
          font: timesRomanFont,
          color: lightGray,
        });
        y -= 14;
      }

      const pdfBytes = await pdfDoc.save();
      const base64 = Buffer.from(pdfBytes).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;

      logger.success('RESUME_GEN', `Generated ATS PDF Resume for ${tailored.company}`, {
        sizeBytes: pdfBytes.length,
      });

      return { pdfBytes, dataUrl };
    } catch (error) {
      logger.error('RESUME_GEN', 'Failed to generate PDF Resume', { error });
      throw error;
    }
  }
}
