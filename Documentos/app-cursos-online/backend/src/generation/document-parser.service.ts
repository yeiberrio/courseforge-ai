import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { extname } from 'path';
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  /**
   * Extract plain text from a document file (PDF, DOCX, TXT, MD).
   */
  async extractText(filePath: string): Promise<string> {
    const ext = extname(filePath).toLowerCase();

    switch (ext) {
      case '.docx':
      case '.doc':
        return this.extractFromDocx(filePath);
      case '.pdf':
        return this.extractFromPdf(filePath);
      case '.txt':
      case '.md':
        return readFileSync(filePath, 'utf-8');
      default:
        this.logger.warn(`Unsupported file type: ${ext}, trying as plain text`);
        return readFileSync(filePath, 'utf-8');
    }
  }

  private async extractFromDocx(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.messages.length > 0) {
      this.logger.warn(`Mammoth warnings: ${JSON.stringify(result.messages)}`);
    }
    return result.value;
  }

  private async extractFromPdf(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const buffer = readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
}
