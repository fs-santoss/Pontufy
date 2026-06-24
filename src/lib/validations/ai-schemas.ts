import { z } from 'zod';

export const lessonSchema = z.object({
  title: z.string().min(3).describe('Título da aula'),
  type: z.enum(['text', 'video']).describe('Formato da aula (texto ou vídeo)'),
  points: z.number().int().positive().describe('Quantidade de pontos concedida ao concluir (recomendado 10 a 50)'),
});

export const moduleSchema = z.object({
  moduleTitle: z.string().min(3).describe('Título do módulo'),
  duration: z.string().describe('Duração estimada do módulo (ex: 2 horas)'),
  lessons: z.array(lessonSchema).min(1).describe('Aulas contidas neste módulo'),
});

export const courseGenerationSchema = z.object({
  title: z.string().min(3).describe('Título do curso completo'),
  description: z.string().min(5).describe('Descrição chamativa e direta sobre o objetivo do curso'),
  modules: z.array(moduleSchema).min(1).describe('Módulos estruturais que compõem o curso'),
});

export type CourseGeneration = z.infer<typeof courseGenerationSchema>;
