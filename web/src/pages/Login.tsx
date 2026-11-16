import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'up' && !name.trim()) {
      setError('Informe o seu nome (aparece no chat).');
      return;
    }
    setBusy(true);
    const err = mode === 'in' ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="auth">
      <form className="auth__card card" onSubmit={submit}>
        <div className="eyebrow">Gates of Hell</div>
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

        {error && <p className="text-danger">{error}</p>}

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
