// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Logger estruturado com isolamento por tenant
// ═══════════════════════════════════════════════════════════════════════
import type { TenantId } from './types';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level:     LogLevel;
  tenantId:  TenantId;
  service:   string;
  message:   string;
  meta?:     Record<string, unknown>;
}

/**
 * Logger factory com escopo fechado por tenant.
 *
 * Cada chamada a `createLogger` retorna um logger que injeta
 * automaticamente o `tenantId` em todos os registros, garantindo
 * que o isolamento de dados seja preservado mesmo nos logs.
 *
 * Em produção, substitua `console.log` por um transporte
 * (CloudWatch, Datadog, etc.) sem alterar a interface.
 */
export function createLogger(tenantId: TenantId, service: string) {
  const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      tenantId,
      service,
      message,
      ...(meta ? { meta } : {}),
    };

    // Saída JSON estruturada — facilita ingestão em serviços de observabilidade
    const line = JSON.stringify(entry);

    switch (level) {
      case 'error': console.error(line); break;
      case 'warn':  console.warn(line);  break;
      default:      console.log(line);
    }
  };

  return {
    info:  (msg: string, meta?: Record<string, unknown>) => emit('info',  msg, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn',  msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
  };
}
