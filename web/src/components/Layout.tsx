import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { GameProvider, useGame } from '../lib/game';
import { AdminWatch } from './AdminWatch';
import { ChatPanel } from './ChatPanel';
import { Icon } from './Icon';
import { MoreMenu, type NavItem } from './MoreMenu';
import { SupportToggle } from './SupportToggle';

export function Layout() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { profile, isMaster, isAdmin, adminMode, masterAccess, signOut, setSupportMode } = useAuth();
  const { characters, error } = useGame();
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth >= 1100);
  const [moreOpen, setMoreOpen] = useState(false);

  const items: NavItem[] = [
    { to: '/fichas', label: 'Fichas', icon: 'sheet' },
    { to: '/forja', label: 'Forja', icon: 'anvil' },
    { to: '/regras', label: 'Regras', icon: 'book' },
  ];
  if (masterAccess) {
    items.push({ to: '/classes', label: 'Classes', icon: 'swords' }, { to: '/bestiario', label: 'Bestiário', icon: 'skull' });
  }
  if (isMaster) items.push({ to: '/atividade', label: 'Atividade', icon: 'activity' });
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', icon: 'users' });

  // No celular: 4 itens na barra (os mais usados) e o resto vai para "Mais".
  const priority = ['/fichas', '/forja', '/bestiario', '/regras'];
  const primary = priority.map((to) => items.find((i) => i.to === to)).filter((i): i is NavItem => Boolean(i));
  const overflow = items.filter((i) => !primary.includes(i));

  const role = isAdmin ? 'Admin' : isMaster ? 'Mestre' : 'Jogador';
  const initial = (profile?.display_name ?? '?').charAt(0).toUpperCase();

  return (
    <div className={`app ${chatOpen ? 'app--chat' : ''}`}>
      <aside className="side">
        <div className="brand">
          <span className="brand__mark" aria-hidden>
            <svg viewBox="0 0 32 32" width="30" height="30">
              <path d="M16 3c1 5-5 7-5 13a5 5 0 0 0 10 0c0-2-.8-3.6-1.7-5 5 3 8 7 8 11a11.300 11.300 0 0 1-22.600 0C4.700 15 10 11 11 6c1.500 1.500 3 1.500 5-3z" fill="url(#bm)" />
              <defs>
                <linearGradient id="bm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffb25a" />
                  <stop offset="1" stopColor="#d6361f" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="brand__name">
            Gates <i>of</i> Hell
          </span>
        </div>

        <nav className="nav" aria-label="Principal">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`}>
              <Icon name={it.icon} />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side__foot">
          <SupportToggle />
          <div className="usercard">
            <span className="avatar">{initial}</span>
            <div className="usercard__txt">
              <b>{profile?.display_name}</b>
              <small>{role}</small>
            </div>
            <button className="icon-btn" onClick={() => void signOut()} aria-label="Sair" title="Sair">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <header className="mobilebar">
        <div className="brand">
          <span className="brand__name">
            Gates <i>of</i> Hell
          </span>
        </div>
        {adminMode && <span className="chip chip--gold">suporte</span>}
        <button className="icon-btn" onClick={() => setChatOpen((v) => !v)} aria-label="Abrir chat">
          <Icon name="chat" size={20} />
        </button>
      </header>

      <div className="main">
        {adminMode && (
          <div className="support-banner" role="status">
            <Icon name="support" />
            <span>
              <b>Modo suporte ligado</b> — o mestre está sendo avisado do que você abre ou altera.
            </span>
            <button className="btn btn--sm btn--ghost" onClick={() => void setSupportMode(false)}>
              Desligar
            </button>
          </div>
        )}
        <AdminWatch />
        <main className="content">
          {error && <p className="alert">Erro ao carregar dados: {error}</p>}
          <Outlet />
        </main>
      </div>

      <div className="dock">
        <ChatPanel characters={characters} onClose={() => setChatOpen(false)} />
      </div>

      <button className="fab" onClick={() => setChatOpen((v) => !v)} aria-label={chatOpen ? 'Fechar chat' : 'Abrir chat'}>
        <Icon name={chatOpen ? 'close' : 'chat'} size={22} />
      </button>

      <nav className="tabbar" aria-label="Navegação">
        {primary.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => `tab ${isActive ? 'is-active' : ''}`}>
            <Icon name={it.icon} size={22} />
            <span>{it.label}</span>
          </NavLink>
        ))}
        <button className={`tab ${moreOpen ? 'is-active' : ''}`} onClick={() => setMoreOpen(true)}>
          <Icon name="menu" size={22} />
          <span>Mais</span>
        </button>
      </nav>
      {moreOpen && <MoreMenu items={overflow} onClose={() => setMoreOpen(false)} />}
    </div>
  );
}
