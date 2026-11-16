export function SetupNeeded() {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="eyebrow">Gates of Hell</div>
        <h1>Falta conectar o Supabase</h1>
        <p>
          O site não encontrou <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <ul>
          <li>
            Rodando local: copie <code>web/.env.example</code> para <code>web/.env.local</code> e preencha.
          </li>
          <li>Na Cloudflare: adicione as duas variáveis em Settings → Variables and Secrets e faça um novo deploy.</li>
        </ul>
        <p className="muted">
          Passo a passo completo em <code>docs/SETUP.md</code>.
        </p>
      </div>
    </div>
  );
}
