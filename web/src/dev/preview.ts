/**
 * Modo de pré-visualização (somente `npm run dev`, com ?preview na URL):
 * usa dados de mentira para ver a interface sem um Supabase configurado.
 * Em produção `import.meta.env.DEV` é false e todo este código sai do bundle.
 */
export const PREVIEW: boolean = import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview');
export const PREVIEW_ROLE: 'player' | 'master' | 'admin' = (() => {
  const r = new URLSearchParams(window.location.search).get('role');
  return r === 'master' || r === 'admin' ? r : 'player';
})();
