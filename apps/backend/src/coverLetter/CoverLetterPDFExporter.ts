/**
 * @file src/coverLetter/CoverLetterPDFExporter.ts
 * @description PDF exporter for personalized candidate cover letters under one page.
 * @architect Clean Architecture - PDF Rendering Service
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MasterResume, CoverLetter } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class CoverLetterPDFExporter {
  /**
   * Generates a single-page PDF cover letter.
   * @param master - Master candidate profile
   * @param coverLetter - Cover letter content model
   * @returns PDF document bytes and Data URL string
   */
  public static async generatePDF(
    master: MasterResume,
    coverLetter: CoverLetter
  ): Promise<{ pdfBytes: Uint8Array; dataUrl: string }> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
      const { width, height } = page.getSize();

      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 45;
      let y = height - margin;

      const primaryColor = rgb(0.1, 0.25, 0.45);
      const textColor = rgb(0.15, 0.15, 0.15);

      // Header: Candidate details
      page.drawText(master.fullName.toUpperCase(), {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: primaryColor,
      });
      y -= 20;

      const contactStr = `${master.email}  |  ${master.phone}  |  ${master.location}`;
      page.drawText(contactStr, {
        x: margin,
        y,
        size: 9,
        font: regularFont,
        color: textColor,
      });
      y -= 16;

      // Divider
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: primaryColor,
      });
      y -= 25;

      // Date & Recipient header
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      page.drawText(currentDate, { x: margin, y, size: 9.5, font: regularFont, color: textColor });
      y -= 20;

      page.drawText(`Hiring Team / Engineering Manager`, { x: margin, y, size: 9.5, font: boldFont, color: textColor });
      y -= 14;
      page.drawText(coverLetter.companyName, { x: margin, y, size: 9.5, font: regularFont, color: textColor });
      y -= 25;

      // Subject line
      page.drawText(`RE: Application for ${coverLetter.jobTitle} Position`, {
        x: margin,
        y,
        size: 10.5,
        font: boldFont,
        color: primaryColor,
      });
      y -= 22;

      // Salutation
      page.drawText(coverLetter.salutation || 'Dear Hiring Committee,', {
        x: margin,
        y,
        size: 9.5,
        font: regularFont,
        color: textColor,
      });
      y -= 20;

      // Helper for word wrapping
      const maxLineWidth = width - 2 * margin;
      const wrapText = (text: string) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const lineWidth = regularFont.widthOfTextAtSize(testLine, 9.5);
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

      // Paragraphs
      for (const paragraph of coverLetter.contentParagraphs) {
        const lines = wrapText(paragraph);
        for (const line of lines) {
          page.drawText(line, { x: margin, y, size: 9.5, font: regularFont, color: textColor });
          y -= 13;
        }
        y -= 10; // gap between paragraphs
      }

      y -= 10;
      // Closing
      page.drawText(coverLetter.closing || 'Sincerely,', { x: margin, y, size: 9.5, font: regularFont, color: textColor });
      y -= 20;

      page.drawText(master.fullName, { x: margin, y, size: 10, font: boldFont, color: primaryColor });

      const pdfBytes = await pdfDoc.save();
      const base64 = Buffer.from(pdfBytes).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;

      logger.success('RESUME_GEN', `Generated Cover Letter PDF for ${coverLetter.companyName}`, {
        sizeBytes: pdfBytes.length,
      });

      return { pdfBytes, dataUrl };
    } catch (error) {
      logger.error('RESUME_GEN', 'Failed to generate Cover Letter PDF', { error });
      throw error;
    }
  }
}
