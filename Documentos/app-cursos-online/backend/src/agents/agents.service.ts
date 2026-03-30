import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const SALES_SYSTEM_PROMPT = `Eres un agente de ventas especializado EXCLUSIVAMENTE en los servicios de nuestra empresa de tecnología.

REGLA ABSOLUTA E INQUEBRANTABLE:
- SOLO puedes hablar sobre nuestros servicios, la empresa y temas directamente relacionados con ventas.
- Si el usuario pregunta algo que NO está relacionado con nuestros servicios (código, direcciones, recetas, tareas, traducciones, chistes, etc.), DEBES rechazar amablemente y redirigir a los servicios.
- NUNCA respondas preguntas generales, de programación, culturales, de entretenimiento o cualquier tema ajeno a las ventas.
- Respuesta ante preguntas fuera de tema: "Soy el asistente de ventas de [empresa]. Mi especialidad es ayudarte a encontrar la solución tecnológica ideal para tu negocio. ¿En qué puedo ayudarte con nuestros servicios?"

SERVICIOS QUE OFRECEMOS:
- Automatización de procesos empresariales (RPA, workflows, integraciones)
- Documentación y definición de procesos (mapeo, optimización, manuales)
- Entrenamiento en herramientas de IA (ChatGPT, Claude, Copilot, automatización con IA)
- Desarrollo de páginas web (landing pages, sitios corporativos, e-commerce)
- Aplicaciones web (SaaS, dashboards, plataformas)
- Aplicaciones móviles (Android, iOS nativas)
- Aplicaciones híbridas (React Native, Flutter, Capacitor)

TU OBJETIVO:
1. Entender las necesidades del cliente o empresa
2. Recomendar SOLO los servicios que ofrecemos, usando la información de la base de conocimiento
3. Guiar la conversación hacia el cierre: agendar reunión, solicitar cotización o programar demo
4. Capturar datos del prospecto: nombre, empresa, email, teléfono, necesidad principal

REGLAS DE RESPUESTA:
- Responde ÚNICAMENTE con información de la base de conocimiento y los servicios listados arriba.
- Si no tienes información específica en la base de conocimiento, responde con lo que sabes de los servicios generales y ofrece agendar una reunión con un especialista.
- Tono: profesional, cercano y orientado a ventas.
- Siempre busca el siguiente paso: "¿Te gustaría agendar una reunión?", "¿Puedo enviarte una cotización?", "¿Quieres que un especialista te contacte?"
- Cuando el cliente dé datos de contacto, confirma y ofrece el siguiente paso.
- Responde en español a menos que el cliente escriba en otro idioma.
- Sé conciso. No divagues.`;

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
    } else if (agent.personality !== SALES_SYSTEM_PROMPT) {
      // Update personality if prompt changed
      agent = await this.prisma.agentConfig.update({
        where: { id: agent.id },
        data: { personality: SALES_SYSTEM_PROMPT },
      });
      this.logger.log('Updated SALES agent personality');
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

    // Call LLM API (Claude or OpenAI)
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
    } else if (this.openaiApiKey) {
      try {
        const openaiMessages = [
          { role: 'system' as const, content: systemPrompt + contextBlock },
          ...messages,
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 2048,
            messages: openaiMessages,
          }),
        });

        const data = await response.json();
        assistantResponse = data.choices?.[0]?.message?.content || assistantResponse;
      } catch (err) {
        this.logger.error(`OpenAI API error: ${err.message}`);
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

    const totalLeads = await this.prisma.lead.count();
    const leadsByStatus = await this.prisma.lead.groupBy({ by: ['status'], _count: true });

    return {
      totalSessions,
      totalMessages,
      totalDocuments: totalDocChunks,
      totalLeads,
      leadsByStatus: Object.fromEntries(leadsByStatus.map((l) => [l.status, l._count])),
    };
  }

  // ─── Leads (Prospectos) ─────────────────────────────────────

  async createLead(data: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    interest?: string;
    notes?: string;
  }) {
    return this.prisma.lead.create({ data: data as any });
  }

  async listLeads(status?: string) {
    return this.prisma.lead.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  async updateLead(id: string, data: {
    status?: string;
    notes?: string;
    interest?: string;
    next_followup?: string;
    last_contact_at?: string;
  }) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status as any } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.interest !== undefined ? { interest: data.interest } : {}),
        ...(data.next_followup ? { next_followup: new Date(data.next_followup) } : {}),
        ...(data.last_contact_at ? { last_contact_at: new Date(data.last_contact_at) } : {}),
      },
    });
  }

  async deleteLead(id: string) {
    return this.prisma.lead.delete({ where: { id } });
  }

  /**
   * Send email to a lead.
   */
  async sendEmail(to: string, subject: string, body: string) {
    // Use fetch to send via a simple SMTP relay or email API
    // For now, we'll use the OpenAI-compatible approach and log it
    // In production, configure SMTP_* env vars and use nodemailer
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser) {
      this.logger.warn(`Email not sent (SMTP not configured). To: ${to}, Subject: ${subject}`);
      return { sent: false, reason: 'SMTP no configurado. Configura SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno.' };
    }

    try {
      // Dynamic import nodemailer
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: smtpUser,
        to,
        subject,
        html: body,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
      return { sent: true, to, subject };
    } catch (err) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      return { sent: false, reason: err.message };
    }
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
