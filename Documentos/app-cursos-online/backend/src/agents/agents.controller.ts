import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CurrentUser, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(private agentsService: AgentsService) {}

  @Get('sales')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener o crear agente de ventas' })
  async getSalesAgent() {
    return this.agentsService.getOrCreateSalesAgent();
  }

  @Get('sales/stats')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Estadisticas del agente de ventas' })
  async getStats() {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.getStats(agent.id);
  }

  @Post('sales/documents')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ingestar documento en la KB del agente de ventas' })
  async ingestDocument(
    @Body() body: { title: string; content: string; tags?: string[] },
  ) {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.ingestDocument(agent.id, body.title, body.content, body.tags);
  }

  @Get('sales/documents')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar documentos del agente de ventas' })
  async listDocuments() {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.listDocuments(agent.id);
  }

  @Delete('sales/documents/:title')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar documento del agente de ventas' })
  async deleteDocument(@Param('title') title: string) {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.deleteDocument(agent.id, decodeURIComponent(title));
  }

  @Post('sales/chat')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Chatear con el agente de ventas' })
  async chat(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; sessionToken?: string },
  ) {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.chat(agent.id, userId, body.message, body.sessionToken);
  }

  @Get('sales/sessions')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar sesiones de chat del agente de ventas' })
  async getSessions() {
    const agent = await this.agentsService.getOrCreateSalesAgent();
    return this.agentsService.getSessions(agent.id);
  }

  @Get('sales/sessions/:id/messages')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener mensajes de una sesion de chat' })
  async getSessionMessages(@Param('id') sessionId: string) {
    return this.agentsService.getSessionMessages(sessionId);
  }

  // ─── Leads (Prospectos) ─────────────────────────────────────

  @Post('leads')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear lead/prospecto' })
  async createLead(
    @Body() body: {
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      source?: string;
      interest?: string;
      notes?: string;
    },
  ) {
    return this.agentsService.createLead(body);
  }

  @Get('leads')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar leads/prospectos' })
  async listLeads(@Query('status') status?: string) {
    return this.agentsService.listLeads(status);
  }

  @Post('leads/:id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar lead/prospecto' })
  async updateLead(
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      notes?: string;
      interest?: string;
      next_followup?: string;
    },
  ) {
    return this.agentsService.updateLead(id, { ...body, last_contact_at: new Date().toISOString() });
  }

  @Delete('leads/:id')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar lead' })
  async deleteLead(@Param('id') id: string) {
    return this.agentsService.deleteLead(id);
  }

  @Post('leads/:id/email')
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enviar email a un lead' })
  async sendEmailToLead(
    @Param('id') id: string,
    @Body() body: { subject: string; body: string },
  ) {
    const leads = await this.agentsService.listLeads();
    const lead = leads.find((l) => l.id === id);
    if (!lead?.email) return { sent: false, reason: 'Lead sin email' };
    const result = await this.agentsService.sendEmail(lead.email, body.subject, body.body);
    if (result.sent) {
      await this.agentsService.updateLead(id, { status: 'CONTACTED', last_contact_at: new Date().toISOString() });
    }
    return result;
  }
}
