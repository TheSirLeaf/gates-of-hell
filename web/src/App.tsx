import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import { isConfigured } from './lib/supabase';
import { Bestiary } from './pages/Bestiary';
import { CharacterSheet } from './pages/CharacterSheet';
import { Characters } from './pages/Characters';
import { Classes } from './pages/Classes';
import { Login } from './pages/Login';
import { RulesPage } from './pages/Rules';
import { SetupNeeded } from './pages/SetupNeeded';

export function App() {
  const { loading, session, profile, isMaster } = useAuth();

  if (!isConfigured) return <SetupNeeded />;
  if (loading) return <div className="splash">Carregando…</div>;
  if (!session) return <Login />;
  if (!profile) {
    return (
      <div className="splash">
        <p>Não encontrei seu perfil. Confira se o schema do banco foi aplicado (guia de setup, passo 3).</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/fichas" replace />} />
        <Route path="/fichas" element={<Characters />} />
        <Route path="/fichas/:id" element={<CharacterSheet />} />
        <Route path="/regras" element={<RulesPage />} />
        {isMaster && <Route path="/classes" element={<Classes />} />}
        {isMaster && <Route path="/bestiario" element={<Bestiary />} />}
        <Route path="*" element={<Navigate to="/fichas" replace />} />
      </Route>
    </Routes>
  );
}
