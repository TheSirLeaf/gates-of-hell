import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Forge } from './forge/Forge';
import { useAuth } from './lib/auth';
import { isConfigured } from './lib/supabase';
import { Activity } from './pages/Activity';
import { AdminPanel } from './pages/AdminPanel';
import { Bestiary } from './pages/Bestiary';
import { CharacterSheet } from './pages/CharacterSheet';
import { Characters } from './pages/Characters';
import { Classes } from './pages/Classes';
import { Login } from './pages/Login';
import { RulesPage } from './pages/Rules';
import { SetupNeeded } from './pages/SetupNeeded';
import { PREVIEW } from './dev/preview';

export function App() {
  const { loading, session, profile, isAdmin, isMaster, masterAccess } = useAuth();

  if (!isConfigured && !PREVIEW) return <SetupNeeded />;
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
        <Route path="/forja" element={<Forge />} />
        <Route path="/regras" element={<RulesPage />} />
        {masterAccess && <Route path="/classes" element={<Classes />} />}
        {masterAccess && <Route path="/bestiario" element={<Bestiary />} />}
        {(isMaster || isAdmin) && <Route path="/atividade" element={<Activity />} />}
        {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
        <Route path="*" element={<Navigate to="/fichas" replace />} />
      </Route>
    </Routes>
  );
}
