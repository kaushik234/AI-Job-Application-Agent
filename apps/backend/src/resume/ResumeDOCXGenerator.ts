/**
 * @file src/resume/ResumeDOCXGenerator.ts
 * @description DOCX document generation engine using docx library for ATS-compliant Word resumes.
 * @architect Clean Architecture - DOCX Rendering Service
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { MasterResume, TailoredResume } from '@sentinel/types';
import { logger } from '@sentinel/shared';

export class ResumeDOCXGenerator {
  /**
   * Generates a clean, ATS-compliant Microsoft Word (.docx) document.
   * @param master Master candidate resume
   * @param tailored Tailored resume customization or undefined
   * @returns Base64 encoded DOCX string and Buffer
   */
  public static async generateDOCX(
    master: MasterResume,
    tailored?: TailoredResume
  ): Promise<{ buffer: Buffer; base64: string }> {
    try {
      const summaryText = tailored?.customSummary || master.summary;

      const skillsList =
        tailored?.prioritizedSkills && tailored.prioritizedSkills.length > 0
          ? tailored.prioritizedSkills.join(', ')
          : [
              ...master.skills.languages,
              ...master.skills.frameworks,
              ...master.skills.cloudAndDevOps,
              ...master.skills.databases,
            ].join(', ');

      const experiencesToRender =
        tailored?.reorganizedExperience ||
        master.experience.map((e) => ({
          company: e.company,
          role: e.role,
          period: `${e.startDate} - ${e.endDate}`,
          tailoredHighlights: e.highlights,
        }));

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
                    size: 28, // 14pt font
                    color: '1A365D', // Dark Navy
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${master.email}  |  ${master.phone}  |  ${master.location}`,
                    size: 18, // 9pt
                    color: '4A5568',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `LinkedIn: ${master.linkedIn}  |  GitHub: ${master.github}`,
                    size: 18,
                    color: '2B6CB0',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: '', size: 12 }),
                ],
              }),

              // 2. PROFESSIONAL SUMMARY SECTION
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [
                  new TextRun({
                    text: 'PROFESSIONAL SUMMARY',
                    bold: true,
                    size: 22, // 11pt
                    color: '1A365D',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: summaryText,
                    size: 20, // 10pt
                    color: '2D3748',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 3. KEY SKILLS SECTION
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [
                  new TextRun({
                    text: 'TECHNICAL SKILLS & COMPETENCIES',
                    bold: true,
                    size: 22,
                    color: '1A365D',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Core Skills: ',
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: skillsList,
                    size: 20,
                    color: '2D3748',
                  }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: '' })] }),

              // 4. PROFESSIONAL EXPERIENCE
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [
                  new TextRun({
                    text: 'PROFESSIONAL EXPERIENCE',
                    bold: true,
                    size: 22,
                    color: '1A365D',
                  }),
                ],
              }),
              ...experiencesToRender.flatMap((exp) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${exp.role} — ${exp.company}`,
                      bold: true,
                      size: 20,
                      color: '1A202C',
                    }),
                    new TextRun({
                      text: `   (${exp.period})`,
                      italics: true,
                      size: 18,
                      color: '718096',
                    }),
                  ],
                }),
                ...exp.tailoredHighlights.map(
                  (hl) =>
                    new Paragraph({
                      bullet: { level: 0 },
                      children: [
                        new TextRun({
                          text: hl,
                          size: 19,
                          color: '2D3748',
                        }),
                      ],
                    })
                ),
                new Paragraph({ children: [new TextRun({ text: '' })] }),
              ]),

              // 5. EDUCATION
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [
                  new TextRun({
                    text: 'EDUCATION',
                    bold: true,
                    size: 22,
                    color: '1A365D',
                  }),
                ],
              }),
              ...master.education.map(
                (edu) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${edu.degree} in ${edu.fieldOfStudy}`,
                        bold: true,
                        size: 20,
                        color: '1A202C',
                      }),
                      new TextRun({
                        text: ` — ${edu.institution} (${edu.graduationYear})`,
                        size: 19,
                        color: '718096',
                      }),
                    ],
                  })
              ),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const base64 = buffer.toString('base64');

      logger.success('RESUME_GEN', 'Generated ATS DOCX Resume', {
        sizeBytes: buffer.length,
      });

      return { buffer, base64 };
    } catch (error) {
      logger.error('RESUME_GEN', 'Failed to generate DOCX Resume', { error });
      throw error;
    }
  }
}
