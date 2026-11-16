import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { GameProvider, useGame } from '../lib/game';
import { ChatPanel } from './ChatPanel';

export function Layout() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}

function Shell() {
  const { profile, isMaster, signOut } = useAuth();
  const { characters, error } = useGame();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className={`shell ${chatOpen ? 'shell--chat-open' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">☠</span>
          <span>Gates of Hell</span>
        </div>
        <nav className="nav">
          <NavLink to="/fichas">Fichas</NavLink>
          <NavLink to="/regras">Regras</NavLink>
          {isMaster && <NavLink to="/classes">Classes</NavLink>}
          {isMaster && <NavLink to="/bestiario">Bestiário</NavLink>}
        </nav>
        <div className="topbar__user">
          <span className="chip">{isMaster ? 'Mestre' : 'Jogador'}</span>
          <span className="topbar__name">{profile?.display_name}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </header>

      <main className="content">
        {error && <p className="alert">Erro ao carregar dados: {error}</p>}
        <Outlet />
      </main>

      <div className="chat-wrap">
        <ChatPanel characters={characters} />
      </div>

      <button className="chat-toggle btn" onClick={() => setChatOpen((v) => !v)}>
        {chatOpen ? 'Fechar chat' : 'Chat'}
      </button>
    </div>
  );
}
