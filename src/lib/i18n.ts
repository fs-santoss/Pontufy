export type Locale = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'en', 'es'];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

type TranslationKey = keyof typeof translations['pt-BR'];

const translations = {
  'pt-BR': {
    'nav.dashboard': 'Dashboard',
    'nav.courses': 'Meus Cursos',
    'nav.store': 'Clube de Benefícios',
    'nav.wallet': 'Carteira',
    'nav.logout': 'Sair',
    'points.label': 'pontos',
    'points.balance': 'Saldo',
    'points.earned': 'Pontos ganhos',
    'points.redeemed': 'Pontos resgatados',
    'course.complete': 'Concluir Aula',
    'course.completed': 'Aula Concluída',
    'course.earn_points': 'Concluir Aula e Ganhar {points} Pontos',
    'course.certificate': 'Baixar Certificado',
    'course.quiz': 'Quiz',
    'store.redeem': 'Resgatar',
    'store.insufficient': 'Saldo insuficiente',
    'auth.login': 'Entrar na Plataforma',
    'auth.email': 'E-mail Profissional',
    'auth.password': 'Senha',
    'auth.forgot': 'Esqueceu a senha?',
    'auth.remember': 'Lembrar de mim',
    'admin.import': 'Importar Usuários',
    'admin.reports': 'Relatórios',
    'admin.analytics': 'Análise de Engajamento',
    'admin.branding': 'Personalização',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.confirm': 'Confirmar',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.courses': 'My Courses',
    'nav.store': 'Benefits Club',
    'nav.wallet': 'Wallet',
    'nav.logout': 'Sign Out',
    'points.label': 'points',
    'points.balance': 'Balance',
    'points.earned': 'Points earned',
    'points.redeemed': 'Points redeemed',
    'course.complete': 'Complete Lesson',
    'course.completed': 'Lesson Completed',
    'course.earn_points': 'Complete Lesson and Earn {points} Points',
    'course.certificate': 'Download Certificate',
    'course.quiz': 'Quiz',
    'store.redeem': 'Redeem',
    'store.insufficient': 'Insufficient balance',
    'auth.login': 'Sign In',
    'auth.email': 'Work Email',
    'auth.password': 'Password',
    'auth.forgot': 'Forgot password?',
    'auth.remember': 'Remember me',
    'admin.import': 'Import Users',
    'admin.reports': 'Reports',
    'admin.analytics': 'Engagement Analytics',
    'admin.branding': 'Customization',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.confirm': 'Confirm',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.courses': 'Mis Cursos',
    'nav.store': 'Club de Beneficios',
    'nav.wallet': 'Billetera',
    'nav.logout': 'Cerrar Sesión',
    'points.label': 'puntos',
    'points.balance': 'Saldo',
    'points.earned': 'Puntos ganados',
    'points.redeemed': 'Puntos canjeados',
    'course.complete': 'Completar Lección',
    'course.completed': 'Lección Completada',
    'course.earn_points': 'Completar Lección y Ganar {points} Puntos',
    'course.certificate': 'Descargar Certificado',
    'course.quiz': 'Quiz',
    'store.redeem': 'Canjear',
    'store.insufficient': 'Saldo insuficiente',
    'auth.login': 'Iniciar Sesión',
    'auth.email': 'Correo Profesional',
    'auth.password': 'Contraseña',
    'auth.forgot': '¿Olvidó su contraseña?',
    'auth.remember': 'Recordarme',
    'admin.import': 'Importar Usuarios',
    'admin.reports': 'Informes',
    'admin.analytics': 'Análisis de Participación',
    'admin.branding': 'Personalización',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.confirm': 'Confirmar',
  },
} as const;

export function t(key: TranslationKey, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>): string {
  const dict = translations[locale] || translations[DEFAULT_LOCALE];
  let value = (dict as any)[key] || (translations[DEFAULT_LOCALE] as any)[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }

  return value;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferred = acceptLanguage.split(',').map((l) => l.split(';')[0].trim().toLowerCase());

  for (const lang of preferred) {
    if (lang.startsWith('pt')) return 'pt-BR';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('es')) return 'es';
  }

  return DEFAULT_LOCALE;
}

export function formatPoints(points: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US').format(points);
}

export function formatCurrency(value: number, locale: Locale = DEFAULT_LOCALE): string {
  const config: Record<Locale, { locale: string; currency: string }> = {
    'pt-BR': { locale: 'pt-BR', currency: 'BRL' },
    en: { locale: 'en-US', currency: 'USD' },
    es: { locale: 'es-ES', currency: 'EUR' },
  };
  const c = config[locale];
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.currency }).format(value);
}
