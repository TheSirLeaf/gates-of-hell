import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { signIn, signUp, resendConfirmation } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Link de confirmação vencido/usado: o Supabase volta para o site com o erro na URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('error_code');
    if (code) {
      setError(code === 'otp_expired' ? 'O link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha para pedir outro.' : (params.get('error_description') ?? 'Não foi possível confirmar o e-mail.').replace(/\+/g, ' '));
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsConfirm(false);
    if (mode === 'up' && !name.trim()) {
      setError('Informe o seu nome (aparece no chat).');
      return;
    }
    setBusy(true);
    const res = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (res.error) setError(res.error);
    setNeedsConfirm(Boolean(res.needsConfirmation));
    if (!res.error && res.needsConfirmation) {
      setNotice(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail (olhe também o spam) e depois entre.`);
      setMode('in');
      setPassword('');
    }
  }

  async function resend() {
    setBusy(true);
    const err = await resendConfirmation(email.trim());
    setBusy(false);
    if (err) setError(err);
    else {
      setError(null);
      setNotice('Novo e-mail enviado. Pode levar alguns minutos.');
    }
  }

  return (
    <div className="auth">
      <div className="auth__art" aria-hidden>
        <div className="auth__sigil">☠</div>
        <div className="auth__title">
          Gates <i>of</i> Hell
        </div>
        <p>Fichas, forja e dados da sua mesa — num só lugar.</p>
      </div>
      <form className="auth__card" onSubmit={submit}>
        <div className="eyebrow">Bem-vindo</div>
        <h1>{mode === 'in' ? 'Entrar na mesa' : 'Criar conta'}</h1>

        {mode === 'up' && (
          <label className="field">
            <span>Seu nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="nickname" />
          </label>
        )}
        <label className="field">
          <span>E-mail</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <p className="text-danger" role="alert">{error}</p>}
        {notice && <p className="callout" role="status">{notice}</p>}
        {needsConfirm && email.trim() && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void resend()} disabled={busy}>
            Reenviar e-mail de confirmação
          </button>
        )}

        <button className="btn btn--block" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Não tenho conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  );
}
