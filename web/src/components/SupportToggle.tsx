import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Icon } from './Icon';

/** Interruptor do admin: liga/desliga o acesso ampliado. Sempre avisa o mestre. */
export function SupportToggle() {
  const { isAdmin, adminMode, setSupportMode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isAdmin) return null;

  async function apply(on: boolean) {
    setBusy(true);
    setError(null);
    const err = await setSupportMode(on);
    setBusy(false);
    setConfirming(false);
    if (err) setError(err);
  }

  return (
    <div className="support">
      <button
        className={`switch ${adminMode ? 'switch--on' : ''}`}
        role="switch"
        aria-checked={adminMode}
        disabled={busy}
        onClick={() => (adminMode ? void apply(false) : setConfirming(true))}
        title="Modo suporte: acesso a todas as fichas e ao bestiário. O mestre é avisado."
      >
        <span className="switch__knob" />
        <span className="switch__label">
          <Icon name="support" size={15} /> Modo suporte
        </span>
      </button>
      {error && <span className="text-danger small">{error}</span>}

      {confirming && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
          <div className="modal__box">
            <h2 id="support-title">Ligar o modo suporte?</h2>
            <p>
              Você passa a ver <b>todas as fichas, o bestiário e as rolagens secretas</b>, e pode editar como se fosse mestre.
            </p>
            <p className="muted">
              O mestre recebe um aviso agora e acompanha em tempo real tudo o que você abrir ou alterar. Desligue quando terminar.
            </p>
            <div className="row gap end">
              <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={() => void apply(true)} disabled={busy}>
                Ligar e avisar o mestre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
