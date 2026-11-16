import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'));

// Usa valores de fachada quando não configurado para o app poder exibir a tela de ajuda.
export const supabase = createClient(
  isConfigured ? url! : 'https://placeholder.supabase.co',
  isConfigured ? key! : 'placeholder',
  { realtime: { params: { eventsPerSecond: 10 } } },
);
