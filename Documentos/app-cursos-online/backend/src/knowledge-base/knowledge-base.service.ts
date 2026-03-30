import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly openaiApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  /**
   * Generate PDF content and ingest a course into the knowledge base.
   * Called automatically when a course is approved/published.
   */
  async ingestCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: { orderBy: { order: 'asc' } },
        category: true,
        creator: { select: { full_name: true } },
      },
    });

    if (!course) throw new NotFoundException('Curso no encontrado');

    this.logger.log(`[KB] Ingesting course: ${course.title}`);

    // 1. Generate PDF-like content document
    const pdfContent = this.generateCourseDocument(course);

    // 2. Save document file
    const kbDir = join(process.cwd(), 'uploads', 'knowledge-base', course.category?.slug || 'general');
    mkdirSync(kbDir, { recursive: true });
    const filePath = join(kbDir, `${courseId}.txt`);
    writeFileSync(filePath, pdfContent);

    // 3. Chunk the content
    const chunks = this.chunkText(pdfContent, 512, 50);
    this.logger.log(`[KB] Generated ${chunks.length} chunks for course ${course.title}`);

    // 4. Generate embeddings for each chunk
    const embeddings = await this.generateEmbeddings(chunks);

    // 5. Check if document already exists
    const existing = await this.prisma.knowledgeBaseDocument.findFirst({
      where: { course_id: courseId },
    });

    if (existing) {
      // Delete old RAG documents for this KB doc
      await this.prisma.ragDocument.deleteMany({
        where: { course_id: courseId },
      });
      // Update existing
      await this.prisma.knowledgeBaseDocument.update({
        where: { id: existing.id },
        data: {
          title: course.title,
          category: course.category?.name || null,
          tags: course.modules.map((m) => m.title),
          file_path: `/uploads/knowledge-base/${course.category?.slug || 'general'}/${courseId}.txt`,
          file_size_bytes: Buffer.byteLength(pdfContent),
          chunk_count: chunks.length,
          ingested_at: new Date(),
        },
      });
    } else {
      await this.prisma.knowledgeBaseDocument.create({
        data: {
          course_id: courseId,
          title: course.title,
          category: course.category?.name || null,
          tags: course.modules.map((m) => m.title),
          file_path: `/uploads/knowledge-base/${course.category?.slug || 'general'}/${courseId}.txt`,
          file_size_bytes: Buffer.byteLength(pdfContent),
          chunk_count: chunks.length,
          source_type: 'COURSE',
          ingested_at: new Date(),
        },
      });
    }

    // 6. Store chunks with embeddings in rag_documents
    // Note: We need an agent_config_id for the current schema.
    // Find or create a global agent config for the knowledge base
    let agentConfig = await this.prisma.agentConfig.findFirst({
      where: { scope: 'GLOBAL', agent_type: 'TUTOR' },
    });

    if (!agentConfig) {
      agentConfig = await this.prisma.agentConfig.create({
        data: {
          scope: 'GLOBAL',
          agent_type: 'TUTOR',
          name: 'Knowledge Base Tutor',
          personality: 'Un tutor educativo que ayuda a responder preguntas basándose en la base de conocimiento de cursos.',
          tone: 'FRIENDLY',
          active: true,
        },
      });
    }

    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.ragDocument.create({
        data: {
          agent_config_id: agentConfig.id,
          course_id: courseId,
          title: `${course.title} - Chunk ${i + 1}`,
          content_text: chunks[i],
          embedding: embeddings[i] || null,
        },
      });
    }

    this.logger.log(`[KB] Course ${course.title} ingested with ${chunks.length} chunks`);

    return {
      courseId,
      title: course.title,
      chunks: chunks.length,
      fileSize: Buffer.byteLength(pdfContent),
    };
  }

  /**
   * Semantic search across the knowledge base.
   */
  async search(query: string, limit: number = 5) {
    if (!this.openaiApiKey) {
      // Fallback: simple text search
      return this.prisma.ragDocument.findMany({
        where: {
          content_text: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: {
          id: true,
          title: true,
          content_text: true,
          course_id: true,
          created_at: true,
        },
      });
    }

    // Generate embedding for query
    const [queryEmbedding] = await this.generateEmbeddings([query]);

    if (!queryEmbedding) {
      // Fallback to text search
      return this.prisma.ragDocument.findMany({
        where: {
          content_text: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: {
          id: true,
          title: true,
          content_text: true,
          course_id: true,
          created_at: true,
        },
      });
    }

    // For pgvector, we'd use raw SQL. Since pgvector extension might not be enabled,
    // use cosine similarity calculation or text search fallback.
    // In production, this would use: SELECT * FROM rag_documents ORDER BY embedding <=> $1 LIMIT $2
    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, title, content_text, course_id, created_at
         FROM rag_documents
         WHERE content_text ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        `%${query.split(' ').slice(0, 3).join('%')}%`,
        limit,
      );
      return results;
    } catch {
      return this.prisma.ragDocument.findMany({
        where: { content_text: { contains: query.split(' ')[0], mode: 'insensitive' } },
        take: limit,
        select: { id: true, title: true, content_text: true, course_id: true, created_at: true },
      });
    }
  }

  /**
   * List all knowledge base documents.
   */
  async listDocuments(options?: { sourceType?: string; category?: string }) {
    return this.prisma.knowledgeBaseDocument.findMany({
      where: {
        is_active: true,
        ...(options?.sourceType ? { source_type: options.sourceType as any } : {}),
        ...(options?.category ? { category: options.category } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get document detail with stats.
   */
  async getDocument(id: string) {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    const chunkCount = await this.prisma.ragDocument.count({
      where: { course_id: doc.course_id || undefined },
    });

    return { ...doc, actual_chunk_count: chunkCount };
  }

  /**
   * Get download info for a KB document.
   */
  async getDownloadInfo(id: string): Promise<{ filePath: string; fileName: string }> {
    const doc = await this.prisma.knowledgeBaseDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    const filePath = join(process.cwd(), doc.file_path);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    const safeTitle = doc.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-_]/g, '').trim().replace(/\s+/g, '_');
    const fileName = `${safeTitle}.txt`;

    return { filePath, fileName };
  }

  /**
   * Get knowledge base statistics.
   */
  async getStats() {
    const totalDocs = await this.prisma.knowledgeBaseDocument.count({ where: { is_active: true } });
    const totalChunks = await this.prisma.ragDocument.count();

    const bySource = await this.prisma.knowledgeBaseDocument.groupBy({
      by: ['source_type'],
      _count: true,
      where: { is_active: true },
    });

    const byCategory = await this.prisma.knowledgeBaseDocument.groupBy({
      by: ['category'],
      _count: true,
      where: { is_active: true },
    });

    return {
      total_documents: totalDocs,
      total_chunks: totalChunks,
      by_source: bySource,
      by_category: byCategory,
    };
  }

  /**
   * Soft delete a knowledge base document.
   */
  async deactivateDocument(id: string) {
    await this.prisma.knowledgeBaseDocument.update({
      where: { id },
      data: { is_active: false },
    });
    return { message: 'Documento desactivado' };
  }

  /**
   * Ingest content from viral processing into knowledge base.
   */
  async ingestViralContent(processingId: string) {
    const proc = await this.prisma.viralContentProcessing.findUnique({
      where: { id: processingId },
      include: { viral_video: true },
    });
    if (!proc || !proc.processed_content) {
      throw new NotFoundException('Contenido procesado no encontrado');
    }

    const content = proc.processed_content;
    const kbDir = join(process.cwd(), 'uploads', 'knowledge-base', 'viral');
    mkdirSync(kbDir, { recursive: true });
    const filePath = join(kbDir, `${processingId}.txt`);
    writeFileSync(filePath, content);

    const chunks = this.chunkText(content, 512, 50);
    const embeddings = await this.generateEmbeddings(chunks);

    const doc = await this.prisma.knowledgeBaseDocument.create({
      data: {
        course_id: proc.course_id,
        title: proc.viral_video?.title || 'Contenido viral procesado',
        category: proc.viral_video?.category || null,
        tags: (proc.topics_extracted as string[]) || [],
        file_path: `/uploads/knowledge-base/viral/${processingId}.txt`,
        file_size_bytes: Buffer.byteLength(content),
        chunk_count: chunks.length,
        source_type: 'VIRAL_CONTENT',
        viral_video_id: proc.viral_video_id,
        ingested_at: new Date(),
      },
    });

    // Store chunks
    let agentConfig = await this.prisma.agentConfig.findFirst({
      where: { scope: 'GLOBAL', agent_type: 'TUTOR' },
    });
    if (!agentConfig) {
      agentConfig = await this.prisma.agentConfig.create({
        data: {
          scope: 'GLOBAL',
          agent_type: 'TUTOR',
          name: 'Knowledge Base Tutor',
          tone: 'FRIENDLY',
          active: true,
        },
      });
    }

    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.ragDocument.create({
        data: {
          agent_config_id: agentConfig.id,
          course_id: proc.course_id,
          title: `Viral: ${proc.viral_video?.title || 'Unknown'} - Chunk ${i + 1}`,
          content_text: chunks[i],
          embedding: embeddings[i] || null,
        },
      });
    }

    this.logger.log(`[KB] Viral content ingested: ${chunks.length} chunks`);
    return doc;
  }

  // ─── Private helpers ──────────────────────────────────────────────

  private generateCourseDocument(course: any): string {
    let doc = '';

    doc += `# ${course.title}\n\n`;
    doc += `Autor: ${course.creator?.full_name || 'Desconocido'}\n`;
    doc += `Categoría: ${course.category?.name || 'General'}\n`;
    doc += `Fecha: ${new Date().toISOString().split('T')[0]}\n\n`;

    if (course.description_short) {
      doc += `## Descripción\n\n${course.description_short}\n\n`;
    }

    if (course.description_long) {
      doc += `## Descripción detallada\n\n${course.description_long}\n\n`;
    }

    doc += `## Módulos (${course.modules.length})\n\n`;

    for (const mod of course.modules) {
      doc += `### Módulo ${mod.order}: ${mod.title}\n\n`;
      if (mod.script) {
        doc += `${mod.script}\n\n`;
      }
      doc += `---\n\n`;
    }

    return doc;
  }

  private chunkText(text: string, chunkSize: number = 512, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 20) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  private async generateEmbeddings(texts: string[]): Promise<(string | null)[]> {
    if (!this.openaiApiKey || texts.length === 0) {
      return texts.map(() => null);
    }

    try {
      // Batch texts (max 20 per request to avoid limits)
      const results: (string | null)[] = [];
      const batchSize = 20;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch.map((t) => t.substring(0, 8000)),
          }),
        });

        if (!response.ok) {
          this.logger.warn(`Embedding generation failed: ${response.statusText}`);
          results.push(...batch.map(() => null));
          continue;
        }

        const data = await response.json();
        for (const item of data.data || []) {
          // Store as JSON string for now (pgvector would use vector type)
          results.push(JSON.stringify(item.embedding));
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Embedding generation error: ${error.message}`);
      return texts.map(() => null);
    }
  }
}
