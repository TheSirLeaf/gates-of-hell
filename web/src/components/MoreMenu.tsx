import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useInstall } from '../lib/install';
import { Icon, type IconName } from './Icon';
import { SupportToggle } from './SupportToggle';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

/** Folha inferior do celular: itens que não cabem na barra, modo suporte, instalar app e sair. */
export function MoreMenu({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const { profile, isAdmin, isMaster, signOut } = useAuth();
  const { installed, canPrompt, showIosHint, install } = useInstall();
  const role = isAdmin ? 'Admin' : isMaster ? 'Mestre' : 'Jogador';

  return (
    <div className="sheetmenu" role="dialog" aria-modal="true" aria-label="Menu" onClick={onClose}>
      <div className="sheetmenu__box" onClick={(e) => e.stopPropagation()}>
        <div className="sheetmenu__grab" aria-hidden />
        <div className="usercard">
          <span className="avatar">{(profile?.display_name ?? '?').charAt(0).toUpperCase()}</span>
          <div className="usercard__txt">
            <b>{profile?.display_name}</b>
            <small>{role}</small>
          </div>
        </div>

        {items.length > 0 && (
          <div className="sheetmenu__links">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} className="sheetmenu__link" onClick={onClose}>
                <Icon name={it.icon} size={20} />
                {it.label}
              </NavLink>
            ))}
          </div>
        )}

        <SupportToggle />

        {!installed && canPrompt && (
          <button className="btn btn--ghost btn--block" onClick={() => void install()}>
            <Icon name="plus" /> Instalar como app
          </button>
        )}
        {showIosHint && <p className="hint">Para instalar: toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p>}

        <button className="btn btn--danger btn--block" onClick={() => void signOut()}>
          <Icon name="logout" /> Sair
        </button>
      </div>
    </div>
  );
}
