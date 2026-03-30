import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AgentsService } from '../agents/agents.service';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private readonly botToken: string;
  private salesAgentId: string | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private agentsService: AgentsService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
  }

  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);

      // Get sales agent ID
      const agent = await this.agentsService.getOrCreateSalesAgent();
      this.salesAgentId = agent.id;

      // Handle /start command
      this.bot.start(async (ctx) => {
        const firstName = ctx.from.first_name || 'cliente';
        await ctx.reply(
          `Hola ${firstName}! 👋\n\n` +
          `Soy el asistente de ventas. Puedo ayudarte con:\n\n` +
          `• Automatizacion de procesos\n` +
          `• Documentacion de procesos\n` +
          `• Entrenamiento en herramientas de IA\n` +
          `• Desarrollo web y movil\n\n` +
          `Escribe tu consulta y te ayudo! 🚀`,
        );

        // Auto-create lead from Telegram user
        await this.ensureLead(ctx.from);
      });

      // Handle /servicios command
      this.bot.command('servicios', async (ctx) => {
        await ctx.reply(
          `📋 *Nuestros Servicios:*\n\n` +
          `1️⃣ *Automatizacion de procesos* — RPA, workflows, integraciones\n` +
          `2️⃣ *Documentacion de procesos* — Mapeo, optimizacion, manuales\n` +
          `3️⃣ *Entrenamiento en IA* — ChatGPT, Claude, Copilot\n` +
          `4️⃣ *Paginas web* — Landing pages, e-commerce, corporativas\n` +
          `5️⃣ *Aplicaciones web* — SaaS, dashboards, plataformas\n` +
          `6️⃣ *Apps moviles* — Android, iOS nativas\n` +
          `7️⃣ *Apps hibridas* — React Native, Flutter, Capacitor\n\n` +
          `Escribe el numero o el nombre del servicio que te interesa!`,
          { parse_mode: 'Markdown' },
        );
      });

      // Handle /reunion command
      this.bot.command('reunion', async (ctx) => {
        const lead = await this.ensureLead(ctx.from);
        if (lead) {
          await this.agentsService.updateLead(lead.id, {
            status: 'MEETING_SCHEDULED',
            notes: `Solicito reunion via Telegram @${ctx.from.username || 'sin-username'}`,
          });
        }
        await ctx.reply(
          `✅ Perfecto! He registrado tu solicitud de reunion.\n\n` +
          `Un especialista te contactara pronto para coordinar la fecha y hora.\n\n` +
          `Si deseas dejarnos tu email o telefono, escribe:\n` +
          `/contacto tu@email.com 3001234567`,
        );
      });

      // Handle /contacto command
      this.bot.command('contacto', async (ctx) => {
        const args = ctx.message.text.replace('/contacto', '').trim().split(/\s+/);
        const email = args.find((a) => a.includes('@')) || null;
        const phone = args.find((a) => /^\+?\d{7,}$/.test(a)) || null;

        if (!email && !phone) {
          await ctx.reply('Formato: /contacto tu@email.com 3001234567');
          return;
        }

        const lead = await this.ensureLead(ctx.from);
        if (lead) {
          const updateData: Record<string, string> = {};
          if (email) updateData.notes = `Email: ${email}`;
          if (phone) updateData.notes = (updateData.notes || '') + ` Tel: ${phone}`;
          await this.agentsService.updateLead(lead.id, updateData);

          // Update lead email/phone directly
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              ...(email ? { email } : {}),
              ...(phone ? { phone } : {}),
            },
          });
        }

        await ctx.reply(`✅ Datos guardados! ${email ? 'Email: ' + email : ''} ${phone ? 'Tel: ' + phone : ''}\n\nTe contactaremos pronto.`);
      });

      // Handle all text messages — route to sales agent
      this.bot.on('text', async (ctx) => {
        const message = ctx.message.text;
        if (message.startsWith('/')) return; // Skip other commands

        const chatId = ctx.chat.id.toString();
        const sessionToken = `telegram-${chatId}`;

        try {
          this.logger.log(`[Telegram] Message from ${ctx.from.first_name} (${chatId}): ${message.substring(0, 50)}`);

          // Ensure lead exists
          await this.ensureLead(ctx.from);
          this.logger.log(`[Telegram] Lead ensured for ${chatId}`);

          // Find or create a system user for Telegram chats
          let systemUser = await this.prisma.user.findFirst({
            where: { email: `telegram-${chatId}@bot.local` },
          });

          if (!systemUser) {
            // Use a pre-hashed password (bcrypt hash of 'telegram-bot-user')
            systemUser = await this.prisma.user.create({
              data: {
                email: `telegram-${chatId}@bot.local`,
                password_hash: '$2a$10$TelegramBotUserHashPlaceholder000000000000000000',
                full_name: `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Telegram User',
                role: 'STUDENT',
              },
            });
          }

          this.logger.log(`[Telegram] System user: ${systemUser.id}`);

          // Send typing indicator
          await ctx.sendChatAction('typing');

          // Route to sales agent
          this.logger.log(`[Telegram] Routing to agent ${this.salesAgentId}`);
          const response = await this.agentsService.chat(
            this.salesAgentId!,
            systemUser.id,
            message,
            sessionToken,
          );

          // Clean markdown for Telegram (convert **bold** to *bold*)
          const cleanMsg = response.message.content
            .replace(/\*\*(.*?)\*\*/g, '*$1*')
            .replace(/#{1,3}\s/g, '');

          await ctx.reply(cleanMsg).catch((replyErr) => {
            this.logger.warn(`Reply format error: ${replyErr.message}`);
            ctx.reply(response.message.content.replace(/[*_`#]/g, ''));
          });
        } catch (err) {
          this.logger.error(`Telegram message error: ${err.message}`, err.stack);
          await ctx.reply('Disculpa, hubo un error procesando tu mensaje. Intenta de nuevo.');
        }
      });

      // Start bot with polling
      this.bot.launch({ dropPendingUpdates: true });
      this.logger.log('Telegram bot started successfully (polling mode)');

      // Graceful stop
      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } catch (err) {
      this.logger.error(`Failed to start Telegram bot: ${err.message}`);
    }
  }

  /**
   * Ensure a lead exists for this Telegram user.
   */
  private async ensureLead(from: { id: number; first_name?: string; last_name?: string; username?: string }) {
    const telegramId = `tg-${from.id}`;

    // Check if lead exists by source identifier
    let lead = await this.prisma.lead.findFirst({
      where: { source: telegramId },
    });

    if (!lead) {
      const name = `${from.first_name || ''} ${from.last_name || ''}`.trim() || 'Telegram User';
      lead = await this.prisma.lead.create({
        data: {
          name,
          source: telegramId,
          notes: from.username ? `Telegram: @${from.username}` : 'Via Telegram',
          status: 'NEW',
        },
      });
      this.logger.log(`New lead from Telegram: ${name} (@${from.username || 'n/a'})`);
    }

    return lead;
  }

  /**
   * Send a message to a Telegram chat (for outbound messaging from leads page).
   */
  async sendMessage(chatId: string, message: string) {
    if (!this.bot) {
      return { sent: false, reason: 'Telegram bot no configurado. Configura TELEGRAM_BOT_TOKEN.' };
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(() =>
        this.bot!.telegram.sendMessage(chatId, message),
      );
      this.logger.log(`Telegram message sent to ${chatId}`);
      return { sent: true, chatId };
    } catch (err) {
      this.logger.error(`Telegram send failed: ${err.message}`);
      return { sent: false, reason: err.message };
    }
  }

  isAvailable(): boolean {
    return !!this.bot;
  }
}
