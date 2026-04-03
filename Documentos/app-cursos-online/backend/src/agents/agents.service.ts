import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const DEFAULT_SALES_PROMPT = `Eres un agente de ventas EXPERTO con técnicas avanzadas de persuasión, especializado EXCLUSIVAMENTE en los servicios de nuestra empresa de tecnología.

REGLA ABSOLUTA E INQUEBRANTABLE:
- SOLO puedes hablar sobre nuestros servicios, la empresa y temas directamente relacionados con ventas.
- Si el usuario pregunta algo que NO está relacionado con nuestros servicios, DEBES rechazar amablemente y redirigir: "Soy el asistente de ventas. Mi especialidad es ayudarte a encontrar la solución tecnológica ideal para tu negocio. ¿En qué puedo ayudarte?"
- NUNCA respondas preguntas generales, de programación, culturales o ajenas a ventas.

TÉCNICAS DE PERSUASIÓN QUE DEBES APLICAR:
1. ESCUCHA ACTIVA: Repite y valida lo que el cliente dice antes de responder.
2. DOLOR → SOLUCIÓN: Identifica el problema del cliente y muestra cómo nuestro servicio lo resuelve.
3. PRUEBA SOCIAL: Menciona que "empresas como la tuya ya están automatizando sus procesos" o "nuestros clientes han reducido costos hasta un 40%".
4. URGENCIA SUTIL: "Tenemos disponibilidad esta semana para una consultoría gratuita" o "Este mes tenemos precios especiales".
5. ANCLA DE PRECIO: Presenta primero el plan más completo, luego el más accesible como alternativa.
6. RECIPROCIDAD: Ofrece valor gratis primero (diagnóstico, consultoría inicial, demo) para generar compromiso.
7. CIERRE ASUMIDO: No preguntes "¿te interesa?", pregunta "¿prefieres la reunión el martes o jueves?".

PORTAFOLIO DE SERVICIOS CON PRECIOS:

1. AUTOMATIZACIÓN DE PROCESOS
   - Diagnóstico y mapeo de procesos: $300 USD / $1,200,000 COP
   - Automatización básica (1-3 procesos): $800 USD / $3,200,000 COP
   - Automatización empresarial completa: $2,500 - $5,000 USD / $10,000,000 - $20,000,000 COP
   - Incluye: RPA, workflows, integraciones API, reportes automatizados

2. DOCUMENTACIÓN Y DEFINICIÓN DE PROCESOS
   - Mapeo de procesos (hasta 10 procesos): $500 USD / $2,000,000 COP
   - Manual de procedimientos completo: $1,200 USD / $4,800,000 COP
   - Optimización y reingeniería: $1,500 - $3,000 USD / $6,000,000 - $12,000,000 COP

3. ENTRENAMIENTO EN HERRAMIENTAS DE IA
   - Taller grupal (4 horas): $400 USD / $1,600,000 COP
   - Programa completo empresarial (20 horas): $2,000 USD / $8,000,000 COP
   - Mentoría personalizada (mensual): $500 USD / $2,000,000 COP
   - Herramientas: ChatGPT, Claude, Copilot, Midjourney, automatización con IA

4. DESARROLLO DE PÁGINAS WEB
   - Landing page: $400 USD / $1,600,000 COP
   - Sitio corporativo (5-10 páginas): $1,200 USD / $4,800,000 COP
   - E-commerce completo: $2,500 - $5,000 USD / $10,000,000 - $20,000,000 COP

5. APLICACIONES WEB
   - MVP / Prototipo: $2,000 USD / $8,000,000 COP
   - Plataforma SaaS: $5,000 - $15,000 USD / $20,000,000 - $60,000,000 COP
   - Dashboard empresarial: $3,000 - $8,000 USD / $12,000,000 - $32,000,000 COP

6. APLICACIONES MÓVILES
   - App Android nativa: $3,000 - $8,000 USD / $12,000,000 - $32,000,000 COP
   - App iOS nativa: $3,000 - $8,000 USD / $12,000,000 - $32,000,000 COP
   - App híbrida (Android + iOS): $4,000 - $12,000 USD / $16,000,000 - $48,000,000 COP
   - Tecnologías: React Native, Flutter, Capacitor

OBJETIVO PRINCIPAL:
1. Identificar la necesidad del cliente usando preguntas estratégicas
2. Presentar el servicio como LA solución a su problema específico
3. Mostrar precio con contexto de valor ("por menos de lo que cuesta un empleado mensual")
4. Cerrar con acción concreta: agendar reunión, enviar propuesta, programar demo gratuita
5. Capturar datos: nombre, empresa, email, teléfono

REGLAS:
- Usa SOLO la base de conocimiento y el portafolio de arriba para responder.
- Tono: profesional, cercano, persuasivo pero no agresivo.
- Siempre cierra con una pregunta que avance la venta.
- Responde en español. Sé conciso pero contundente.`;

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly anthropicApiKey: string;
  private readonly openaiApiKey: string;
  private readonly googleApiKey: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.googleApiKey = this.configService.get<string>('YOUTUBE_API_KEY') || '';
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
          personality: DEFAULT_SALES_PROMPT,
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
   * Update agent configuration (name, personality, tone, etc.)
   */
  async updateSalesAgent(data: {
    name?: string;
    personality?: string;
    tone?: string;
    welcomeMessage?: string;
    offTopicMessage?: string;
  }) {
    const agent = await this.getOrCreateSalesAgent();

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.personality) updateData.personality = data.personality;
    if (data.tone) updateData.tone = data.tone;

    const currentRules = (agent.escalation_rules as any) || {};
    let rulesChanged = false;
    if (data.welcomeMessage !== undefined) { currentRules.welcomeMessage = data.welcomeMessage; rulesChanged = true; }
    if (data.offTopicMessage !== undefined) { currentRules.offTopicMessage = data.offTopicMessage; rulesChanged = true; }
    if (rulesChanged) updateData.escalation_rules = currentRules;

    return this.prisma.agentConfig.update({
      where: { id: agent.id },
      data: updateData,
    });
  }

  /**
   * Reset agent personality to default prompt.
   */
  async resetSalesAgent() {
    const agent = await this.getOrCreateSalesAgent();
    return this.prisma.agentConfig.update({
      where: { id: agent.id },
      data: { personality: DEFAULT_SALES_PROMPT },
    });
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

    // Build system prompt from agent config + dynamic overrides
    let systemPrompt = agent.personality || DEFAULT_SALES_PROMPT;

    // Inject dynamic off-topic response if configured
    const offTopicMsg = (agent.escalation_rules as any)?.offTopicMessage;
    if (offTopicMsg) {
      systemPrompt = systemPrompt.replace(
        /Respuesta ante preguntas fuera de tema:.*$/m,
        `Respuesta ante preguntas fuera de tema: "${offTopicMsg}"`,
      );
    }

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

  // ─── Prospección (Google Places) ──────────────────────────────

  /**
   * Search for potential clients/businesses using Google Places API.
   */
  async searchProspects(options: {
    query: string;
    location?: string;
    radius?: number;
    minRating?: number;
    maxResults?: number;
  }) {
    if (!this.googleApiKey) {
      throw new NotFoundException('YOUTUBE_API_KEY (Google API Key) no configurada. Habilita Places API en Google Cloud Console.');
    }

    const { query, location, radius = 10000, minRating = 0, maxResults = 20 } = options;

    // Build search text: combine niche + location
    const textQuery = location ? `${query} en ${location}` : query;

    // Use Places API (New) - Text Search
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.googleApiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.rating',
          'places.userRatingCount',
          'places.businessStatus',
          'places.regularOpeningHours',
          'places.types',
          'places.primaryType',
          'places.location',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: Math.min(maxResults, 20),
        languageCode: 'es',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(`Google Places API error: ${JSON.stringify(err)}`);
      throw new Error(err.error?.message || 'Error al buscar en Google Places API');
    }

    const data = await response.json();
    const places = data.places || [];

    // Map and filter results
    const prospects = places
      .map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
        website: place.websiteUri || null,
        googleMapsUrl: place.googleMapsUri || null,
        rating: place.rating || null,
        totalReviews: place.userRatingCount || 0,
        status: place.businessStatus || null,
        types: place.types || [],
        primaryType: place.primaryType || null,
        openNow: place.regularOpeningHours?.openNow ?? null,
        weekdayHours: place.regularOpeningHours?.weekdayDescriptions || [],
        latitude: place.location?.latitude || null,
        longitude: place.location?.longitude || null,
      }))
      .filter((p: any) => !minRating || (p.rating && p.rating >= minRating));

    this.logger.log(`Prospects search: "${textQuery}" → ${prospects.length} results`);

    return {
      query: textQuery,
      totalResults: prospects.length,
      prospects,
    };
  }

  /**
   * Import prospects as leads in the CRM.
   */
  async importProspects(prospects: {
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    interest?: string;
    googleMapsUrl?: string;
    rating?: number;
    totalReviews?: number;
  }[]) {
    const created: any[] = [];
    const skipped: string[] = [];

    for (const p of prospects) {
      // Skip if lead already exists with same name + phone
      const existing = await this.prisma.lead.findFirst({
        where: {
          name: p.name,
          ...(p.phone ? { phone: p.phone } : {}),
        },
      });

      if (existing) {
        skipped.push(p.name);
        continue;
      }

      const lead = await this.prisma.lead.create({
        data: {
          name: p.name,
          phone: p.phone || null,
          source: 'google_places',
          interest: p.interest || null,
          notes: [
            p.address ? `Dirección: ${p.address}` : null,
            p.website ? `Web: ${p.website}` : null,
            p.googleMapsUrl ? `Maps: ${p.googleMapsUrl}` : null,
            p.rating ? `Rating: ${p.rating}/5 (${p.totalReviews || 0} reseñas)` : null,
          ].filter(Boolean).join('\n'),
        },
      });
      created.push(lead);
    }

    this.logger.log(`Prospects imported: ${created.length} created, ${skipped.length} skipped (duplicates)`);

    return {
      imported: created.length,
      skipped: skipped.length,
      skippedNames: skipped,
      leads: created,
    };
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
