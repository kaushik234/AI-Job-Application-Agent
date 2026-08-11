/**
 * @file src/coverLetter/CoverLetterDOCXExporter.ts
 * @description DOCX document exporter for cover letters using docx library.
 * @architect Clean Architecture - DOCX Rendering Service
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { MasterResume, CoverLetter } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class CoverLetterDOCXExporter {
  /**
   * Generates a single-page DOCX cover letter.
   * @param master Master candidate profile
   * @param coverLetter Cover letter model
   * @returns Base64 encoded DOCX string and Buffer
   */
  public static async generateDOCX(
    master: MasterResume,
    coverLetter: CoverLetter
  ): Promise<{ buffer: Buffer; base64: string }> {
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720, // 0.5 inch
                  bottom: 720,
                  left: 720,
                  right: 720,
                },
              },
            },
            children: [
              // 1. CANDIDATE HEADER
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: master.fullName.toUpperCase(),
                    bold: true,
                    size: 28, // 14pt
                    color: '1A365D',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${master.email}  |  ${master.phone}  |  ${master.location}`,
                    size: 18,
                    color: '4A5568',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 2. RECIPIENT & DATE
              new Paragraph({
                children: [
                  new TextRun({
                    text: currentDate,
                    size: 19,
                    color: '2D3748',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Hiring Manager / Recruitment Team',
                    bold: true,
                    size: 19,
                    color: '1A202C',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: coverLetter.companyName,
                    size: 19,
                    color: '2D3748',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 3. SUBJECT LINE
              new Paragraph({
                children: [
                  new TextRun({
                    text: `RE: Application for ${coverLetter.jobTitle} Position`,
                    bold: true,
                    size: 21,
                    color: '1A365D',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 4. SALUTATION
              new Paragraph({
                children: [
                  new TextRun({
                    text: coverLetter.salutation || 'Dear Hiring Committee,',
                    size: 20,
                    color: '1A202C',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 5. CONTENT PARAGRAPHS
              ...coverLetter.contentParagraphs.flatMap((para) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: para,
                      size: 20, // 10pt font
                      color: '2D3748',
                    }),
                  ],
                }),
                new Paragraph({ children: [new TextRun({ text: '' })] }),
              ]),

              // 6. CLOSING & SIGNATURE
              new Paragraph({
                children: [
                  new TextRun({
                    text: coverLetter.closing || 'Sincerely,',
                    size: 20,
                    color: '1A202C',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: master.fullName,
                    bold: true,
                    size: 21,
                    color: '1A365D',
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const base64 = buffer.toString('base64');

      logger.success('RESUME_GEN', `Generated Cover Letter DOCX for ${coverLetter.companyName}`, {
        sizeBytes: buffer.length,
      });

      return { buffer, base64 };
    } catch (error) {
      logger.error('RESUME_GEN', 'Failed to generate Cover Letter DOCX', { error });
      throw error;
    }
  }
}
