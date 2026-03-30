import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ModuleScript {
  moduleTitle: string;
  moduleOrder: number;
  script: string;
  slides: { title: string; content: string[] }[];
  estimatedDurationMin: number;
}

export interface CourseStructure {
  title: string;
  description: string;
  modules: { title: string; objectives: string[] }[];
  targetAudience: string;
}

@Injectable()
export class ScriptGeneratorService {
  private readonly logger = new Logger(ScriptGeneratorService.name);
  private readonly apiKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
  }

  /**
   * Analyze a document and extract course structure.
   * If ANTHROPIC_API_KEY is set, uses Claude. Otherwise, uses intelligent local parsing.
   */
  async analyzeCourseDocument(text: string, language = 'es'): Promise<CourseStructure> {
    if (this.apiKey) {
      return this.analyzeWithClaude(text, language);
    }
    return this.analyzeLocally(text);
  }

  /**
   * Generate a narration script for a module.
   * If ANTHROPIC_API_KEY is set, uses Claude. Otherwise, uses local generation.
   */
  async generateModuleScript(
    moduleTitle: string,
    moduleContent: string,
    targetDurationMin: number,
    language = 'es',
  ): Promise<ModuleScript> {
    if (this.apiKey) {
      return this.generateWithClaude(moduleTitle, moduleContent, targetDurationMin, language);
    }
    return this.generateLocally(moduleTitle, moduleContent, targetDurationMin);
  }

  /**
   * Generate a single viral video script from the full document.
   * Optimized for YouTube: hook, development, CTA, no module splitting.
   */
  async generateViralScript(
    title: string,
    fullText: string,
    targetDurationMin: number,
    language = 'es',
  ): Promise<ModuleScript> {
    if (this.apiKey) {
      return this.generateViralWithClaude(title, fullText, targetDurationMin, language);
    }
    return this.generateLocally(title, fullText, targetDurationMin);
  }

  private async generateViralWithClaude(
    title: string,
    fullText: string,
    targetDurationMin: number,
    language: string,
  ): Promise<ModuleScript> {
    const wordsNeeded = targetDurationMin * 150;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `Genera un guión de NARRACIÓN HABLADA para UN SOLO VIDEO VIRAL de YouTube.

TÍTULO: ${title}
CONTENIDO BASE:
${fullText.substring(0, 12000)}

REGLAS CRÍTICAS:
- Este es UN SOLO VIDEO COMPLETO, NO un curso dividido en módulos.
- El "script" debe contener EXACTAMENTE lo que el narrador dice en voz alta.
- NO incluyas descripciones visuales, acotaciones ni corchetes.
- Optimizado para YouTube: debe enganchar en los primeros 10 segundos.

ESTRUCTURA DEL VIDEO VIRAL:
1. HOOK (primeros 10-15 segundos): Pregunta impactante o dato sorprendente que enganche al espectador
2. INTRODUCCIÓN (30 segundos): Presenta el tema y por qué importa
3. DESARROLLO (cuerpo principal): Explica el contenido con ejemplos, datos, historias
4. MOMENTO CLAVE: El punto más valioso o revelación principal
5. CIERRE + CTA (últimos 30 segundos): Resumen potente + llamada a la acción (suscribirse, comentar, compartir)

REQUISITOS:
- Duración objetivo: ${targetDurationMin} minutos (~${wordsNeeded} palabras en el script)
- Tono: dinámico, directo, conversacional. Como un creador de contenido exitoso.
- Usa "tú" directamente al espectador.
- Genera slides de apoyo visual (6-12 slides para todo el video)
- Idioma: ${language === 'es' ? 'español' : language}

Responde SOLO con JSON válido:
{
  "script": "texto completo del video viral...",
  "slides": [
    { "title": "título del slide", "content": ["punto 1", "punto 2", "punto 3"] }
  ],
  "estimatedDurationMin": ${targetDurationMin}
}`,
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          moduleTitle: title,
          moduleOrder: 1,
          script: parsed.script,
          slides: parsed.slides,
          estimatedDurationMin: parsed.estimatedDurationMin || targetDurationMin,
        };
      }
    } catch (e) {
      this.logger.warn('Failed to parse Claude viral script response, falling back to local');
    }

    return this.generateLocally(title, fullText, targetDurationMin);
  }

  // ─── Claude-powered generation ──────────────────────────────────────────

  private async analyzeWithClaude(text: string, language: string): Promise<CourseStructure> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Analiza el siguiente documento y extrae una estructura de curso online.
Responde SOLO con JSON válido, sin explicaciones adicionales.

Formato requerido:
{
  "title": "título del curso",
  "description": "descripción breve del curso (1-2 oraciones)",
  "targetAudience": "público objetivo",
  "modules": [
    {
      "title": "título del módulo",
      "objectives": ["objetivo 1", "objetivo 2"]
    }
  ]
}

Si el documento tiene secciones claras, usa cada sección como módulo.
Si no tiene estructura clara, divide el contenido en 3-7 módulos temáticos.
Idioma de la respuesta: ${language === 'es' ? 'español' : language}.

DOCUMENTO:
${text.substring(0, 15000)}`,
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse Claude response, falling back to local');
    }

    return this.analyzeLocally(text);
  }

  private async generateWithClaude(
    moduleTitle: string,
    moduleContent: string,
    targetDurationMin: number,
    language: string,
  ): Promise<ModuleScript> {
    const wordsNeeded = targetDurationMin * 150;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: `Genera un guión de NARRACIÓN HABLADA para un video educativo tipo clase.

MÓDULO: ${moduleTitle}
CONTENIDO BASE:
${moduleContent.substring(0, 8000)}

REGLAS CRÍTICAS PARA EL GUIÓN:
- El "script" debe contener EXACTAMENTE lo que el narrador dice en voz alta, palabra por palabra.
- NO incluyas descripciones visuales ni de escena (NO escribas cosas como "aparece una persona", "se muestra una pizarra", "el profesor señala").
- NO incluyas acotaciones entre corchetes ni paréntesis (NO escribas [pausa], (señalando la pantalla), etc.).
- Escribe como si fueras un profesor hablando directamente al estudiante. Usa "tú", "nosotros", "vamos a ver".
- Tono: educativo, conversacional y natural, como una clase presencial.

ESTRUCTURA DEL GUIÓN:
1. Apertura con gancho (captar atención)
2. Desarrollo con explicaciones claras y ejemplos concretos
3. Cierre con resumen de puntos clave

REQUISITOS:
- Duración objetivo: ${targetDurationMin} minutos (~${wordsNeeded} palabras en el script)
- Divide el contenido en slides (4-8 slides por módulo)
- Los slides son las diapositivas de apoyo visual con puntos clave resumidos
- Idioma: ${language === 'es' ? 'español' : language}

Responde SOLO con JSON válido:
{
  "script": "texto completo de lo que el narrador dice en voz alta, sin acotaciones ni descripciones visuales...",
  "slides": [
    { "title": "título del slide", "content": ["punto clave 1", "punto clave 2", "punto clave 3"] }
  ],
  "estimatedDurationMin": ${targetDurationMin}
}`,
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          moduleTitle,
          moduleOrder: 1,
          script: parsed.script,
          slides: parsed.slides,
          estimatedDurationMin: parsed.estimatedDurationMin || targetDurationMin,
        };
      }
    } catch (e) {
      this.logger.warn('Failed to parse Claude response, falling back to local');
    }

    return this.generateLocally(moduleTitle, moduleContent, targetDurationMin);
  }

  // ─── Local fallback (no API key needed) ─────────────────────────────────

  private analyzeLocally(text: string): CourseStructure {
    const lines = text.split('\n').filter((l) => l.trim());

    // Try to extract title from first non-empty line
    const title = lines[0]?.trim() || 'Curso generado automáticamente';

    // Extract sections by headers (lines that are shorter and followed by longer lines)
    const modules: { title: string; objectives: string[] }[] = [];
    let currentModule: { title: string; content: string[] } | null = null;

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      // Detect headers: short lines, possibly with # prefix, numbered, or all caps
      const isHeader =
        trimmed.startsWith('#') ||
        /^\d+[\.\)\-]/.test(trimmed) ||
        (trimmed.length < 80 && trimmed.length > 3 && trimmed === trimmed.toUpperCase()) ||
        (trimmed.length < 100 && !trimmed.endsWith('.') && lines.indexOf(line) > 0);

      if (isHeader && trimmed.length < 120) {
        if (currentModule) {
          modules.push({
            title: currentModule.title.replace(/^[#\d\.\)\-\s]+/, ''),
            objectives: currentModule.content.slice(0, 3).map((c) =>
              c.length > 100 ? c.substring(0, 97) + '...' : c,
            ),
          });
        }
        currentModule = { title: trimmed, content: [] };
      } else if (currentModule && trimmed.length > 10) {
        currentModule.content.push(trimmed);
      }
    }

    if (currentModule) {
      modules.push({
        title: currentModule.title.replace(/^[#\d\.\)\-\s]+/, ''),
        objectives: currentModule.content.slice(0, 3).map((c) =>
          c.length > 100 ? c.substring(0, 97) + '...' : c,
        ),
      });
    }

    // If no modules detected, create 3 generic ones
    if (modules.length === 0) {
      const chunks = this.chunkText(lines.slice(1).join('\n'), 3);
      chunks.forEach((chunk, i) => {
        modules.push({
          title: `Módulo ${i + 1}: Sección ${i + 1}`,
          objectives: chunk.split('\n').filter((l) => l.trim()).slice(0, 3),
        });
      });
    }

    return {
      title,
      description: lines.slice(1, 3).join(' ').substring(0, 200),
      targetAudience: 'Público general interesado en el tema',
      modules: modules.slice(0, 10), // Max 10 modules
    };
  }

  private generateLocally(
    moduleTitle: string,
    moduleContent: string,
    targetDurationMin: number,
  ): ModuleScript {
    const sentences = moduleContent
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // Build a spoken narration script from the content
    const intro = `Hola, bienvenidos. En este módulo vamos a hablar sobre ${moduleTitle}. Vamos a cubrir los puntos más importantes para que puedas entender y aplicar estos conceptos.`;

    // Group sentences into paragraphs with natural transitions
    const transitions = [
      'Empecemos con lo fundamental.',
      'Ahora bien, hay algo importante que debes saber.',
      'Veamos esto con más detalle.',
      'Otro punto clave es el siguiente.',
      'Continuemos con el siguiente concepto.',
    ];

    const bodyParts: string[] = [];
    const usableSentences = sentences.slice(0, 20);
    const groupSize = Math.max(1, Math.ceil(usableSentences.length / transitions.length));

    for (let i = 0; i < usableSentences.length; i += groupSize) {
      const group = usableSentences.slice(i, i + groupSize).join('. ') + '.';
      const transIdx = Math.min(Math.floor(i / groupSize), transitions.length - 1);
      bodyParts.push(`${transitions[transIdx]} ${group}`);
    }

    const body = bodyParts.join('\n\n');
    const outro = `Bien, con esto terminamos este módulo sobre ${moduleTitle}. Recuerda repasar los conceptos clave que vimos y, si es necesario, vuelve a ver esta lección. Nos vemos en el siguiente módulo.`;
    const script = `${intro}\n\n${body}\n\n${outro}`;

    // Generate slides from content
    const slides: { title: string; content: string[] }[] = [];
    const slideCount = Math.min(Math.max(3, Math.floor(targetDurationMin * 1.5)), 8);
    const sentencesPerSlide = Math.max(1, Math.floor(sentences.length / slideCount));

    slides.push({
      title: moduleTitle,
      content: ['Objetivos del módulo', 'Conceptos clave', 'Ejercicios prácticos'],
    });

    for (let i = 0; i < slideCount - 2; i++) {
      const start = i * sentencesPerSlide;
      const slideContent = sentences
        .slice(start, start + sentencesPerSlide)
        .map((s) => (s.length > 80 ? s.substring(0, 77) + '...' : s));

      if (slideContent.length > 0) {
        slides.push({
          title: `${moduleTitle} - Parte ${i + 1}`,
          content: slideContent.slice(0, 4),
        });
      }
    }

    slides.push({
      title: 'Resumen',
      content: ['Repaso de conceptos clave', 'Próximos pasos', 'Práctica recomendada'],
    });

    return {
      moduleTitle,
      moduleOrder: 1,
      script,
      slides,
      estimatedDurationMin: targetDurationMin,
    };
  }

  private chunkText(text: string, chunks: number): string[] {
    const lines = text.split('\n');
    const chunkSize = Math.ceil(lines.length / chunks);
    const result: string[] = [];
    for (let i = 0; i < chunks; i++) {
      result.push(lines.slice(i * chunkSize, (i + 1) * chunkSize).join('\n'));
    }
    return result;
  }
}
