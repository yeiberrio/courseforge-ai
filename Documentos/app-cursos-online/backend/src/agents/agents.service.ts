import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const SALES_SYSTEM_PROMPT = `Eres un agente de ventas inteligente y experto en tecnología. Tu objetivo es:

1. Entender las necesidades del cliente o empresa
2. Recomendar los servicios más adecuados según su situación
3. Responder preguntas técnicas con claridad
4. Guiar naturalmente hacia la contratación del servicio

SERVICIOS QUE OFRECEMOS:
- Automatización de procesos empresariales (RPA, workflows, integraciones)
- Documentación y definición de procesos (mapeo, optimización, manuales)
- Entrenamiento en herramientas de IA (ChatGPT, Claude, Copilot, automatización con IA)
- Desarrollo de páginas web (landing pages, sitios corporativos, e-commerce)
- Aplicaciones web (SaaS, dashboards, plataformas)
- Aplicaciones móviles (Android, iOS nativas)
- Aplicaciones híbridas (React Native, Flutter, Capacitor)

REGLAS:
- Usa el contexto de la base de conocimiento para dar respuestas precisas y específicas.
- Si no tienes información sobre algo, dilo honestamente y ofrece agendar una reunión con un especialista.
- Tono: profesional pero cercano y empático.
- Siempre orienta la conversación hacia el cierre o siguiente paso (reunión, cotización, demo).
- Responde en español a menos que el cliente escriba en otro idioma.
- Sé conciso pero completo. No repitas información innecesariamente.
- Cuando el cliente muestre interés, sugiere concretar (agenda, presupuesto, demo).`;

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly anthropicApiKey: string;
  private readonly openaiApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  /**
   * Get or create the SALES agent config.
   */
  async getOrCreateSalesAgent() {
    let agent = await this.prisma.agentConfig.findFirst({
      where: { agent_type: 'SALES', scope: 'GLOBAL' },
    });

    if (!agent) {
      agent = await this.prisma.agentConfig.create({
        data: {
          scope: 'GLOBAL',
          agent_type: 'SALES',
          name: 'Agente de Ventas',
          personality: SALES_SYSTEM_PROMPT,
          tone: 'FRIENDLY',
          languages: ['es', 'en'],
          active: true,
        },
      });
      this.logger.log('Created SALES agent config');
    }

    return agent;
  }

  /**
   * Ingest a service document into the sales agent's knowledge base.
   */
  async ingestDocument(agentId: string, title: string, content: string, tags: string[] = []) {
    const chunks = this.chunkText(content, 512, 50);
    const embeddings = await this.generateEmbeddings(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.ragDocument.create({
        data: {
          agent_config_id: agentId,
          title: `${title} - Parte ${i + 1}`,
          content_text: chunks[i],
          embedding: embeddings[i] || null,
        },
      });
    }

    this.logger.log(`Ingested "${title}" into sales agent KB (${chunks.length} chunks)`);
    return { title, chunks: chunks.length, tags };
  }

  /**
   * List documents for a specific agent.
   */
  async listDocuments(agentId: string) {
    const docs = await this.prisma.ragDocument.findMany({
      where: { agent_config_id: agentId },
      orderBy: { created_at: 'desc' },
    });

    // Group by base title (remove " - Parte N")
    const grouped: Record<string, { title: string; chunks: number; firstId: string; createdAt: Date }> = {};
    for (const doc of docs) {
      const baseTitle = doc.title.replace(/ - Parte \d+$/, '');
      if (!grouped[baseTitle]) {
        grouped[baseTitle] = { title: baseTitle, chunks: 0, firstId: doc.id, createdAt: doc.created_at };
      }
      grouped[baseTitle].chunks++;
    }

    return Object.values(grouped);
  }

  /**
   * Delete all chunks of a document by base title.
   */
  async deleteDocument(agentId: string, title: string) {
    const result = await this.prisma.ragDocument.deleteMany({
      where: {
        agent_config_id: agentId,
        title: { startsWith: title },
      },
    });
    return { deleted: result.count };
  }

  /**
   * Chat with the sales agent.
   */
  async chat(agentId: string, userId: string, message: string, sessionToken?: string) {
    const agent = await this.prisma.agentConfig.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agente no encontrado');

    // Get or create session
    let session;
    if (sessionToken) {
      session = await this.prisma.chatSession.findUnique({ where: { session_token: sessionToken } });
    }
    if (!session) {
      session = await this.prisma.chatSession.create({
        data: {
          agent_config_id: agentId,
          user_id: userId,
          session_token: sessionToken || randomUUID(),
        },
      });
    }

    // Save user message
    await this.prisma.chatMessage.create({
      data: { session_id: session.id, role: 'USER', content: message },
    });

    // Get conversation history (last 20 messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { session_id: session.id },
      orderBy: { created_at: 'asc' },
      take: 20,
    });

    // Search relevant context from agent's KB
    const context = await this.searchAgentKB(agentId, message);

    // Build Claude messages
    const systemPrompt = agent.personality || SALES_SYSTEM_PROMPT;
    const contextBlock = context.length > 0
      ? `\n\nCONTEXTO DE LA BASE DE CONOCIMIENTO:\n${context.map((c) => c.content_text).join('\n\n---\n\n')}`
      : '';

    const messages = history.map((m) => ({
      role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    // Call Claude API
    let assistantResponse = 'Lo siento, no puedo responder en este momento. Por favor intenta de nuevo.';

    if (this.anthropicApiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt + contextBlock,
            messages,
          }),
        });

        const data = await response.json();
        assistantResponse = data.content?.[0]?.text || assistantResponse;
      } catch (err) {
        this.logger.error(`Claude API error: ${err.message}`);
      }
    }

    // Save assistant message
    const saved = await this.prisma.chatMessage.create({
      data: { session_id: session.id, role: 'ASSISTANT', content: assistantResponse },
    });

    return {
      sessionToken: session.session_token,
      message: {
        id: saved.id,
        role: 'ASSISTANT',
        content: assistantResponse,
        createdAt: saved.created_at,
      },
    };
  }

  /**
   * Search the agent's knowledge base for relevant context.
   */
  private async searchAgentKB(agentId: string, query: string, limit = 5) {
    // Text search fallback (pgvector would be better but may not be enabled)
    const keywords = query.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
    if (keywords.length === 0) return [];

    const pattern = `%${keywords.join('%')}%`;
    try {
      return await this.prisma.$queryRawUnsafe<{ content_text: string }[]>(
        `SELECT content_text FROM rag_documents WHERE agent_config_id = $1 AND content_text ILIKE $2 ORDER BY created_at DESC LIMIT $3`,
        agentId,
        pattern,
        limit,
      );
    } catch {
      return [];
    }
  }

  /**
   * List chat sessions for the agent.
   */
  async getSessions(agentId: string) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { agent_config_id: agentId },
      include: {
        user: { select: { full_name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { started_at: 'desc' },
      take: 50,
    });

    return sessions.map((s) => ({
      id: s.id,
      sessionToken: s.session_token,
      userName: s.user.full_name,
      userEmail: s.user.email,
      messageCount: s._count.messages,
      startedAt: s.started_at,
    }));
  }

  /**
   * Get messages for a specific session.
   */
  async getSessionMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Get agent statistics.
   */
  async getStats(agentId: string) {
    const [totalSessions, totalMessages, totalDocChunks] = await Promise.all([
      this.prisma.chatSession.count({ where: { agent_config_id: agentId } }),
      this.prisma.chatMessage.count({
        where: { session: { agent_config_id: agentId } },
      }),
      this.prisma.ragDocument.count({ where: { agent_config_id: agentId } }),
    ]);

    return { totalSessions, totalMessages, totalDocuments: totalDocChunks };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private chunkText(text: string, chunkSize = 512, overlap = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
      if (i + chunkSize >= words.length) break;
    }
    return chunks.length > 0 ? chunks : [text];
  }

  private async generateEmbeddings(texts: string[]): Promise<(string | null)[]> {
    if (!this.openaiApiKey) return texts.map(() => null);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts.slice(0, 20),
        }),
      });

      const data = await response.json();
      return (data.data || []).map((d: any) => JSON.stringify(d.embedding));
    } catch {
      return texts.map(() => null);
    }
  }
}
