import { ARMORS, attrName, materialsOf, SKILLS, WEAPONS, weaponDamageLabel } from '../rules';

export function RulesPage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <div className="eyebrow">Referência</div>
          <h1 className="page-title">Regras</h1>
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">Testes</h2>
        <ul>
          <li>
            <strong>Teste de atributo</strong> = <code>Nd20kh1</code>, N = valor do atributo (mínimo 1d20): rola N d20 e fica com o maior.
          </li>
          <li>
            <strong>Perícia</strong> = teste do atributo do grupo + valor da perícia. Ex.: Luta com Físico 3 e Luta 2 rola <code>3d20kh1+2</code>.
          </li>
          <li>
            <strong>Slots de perícia</strong> = 1 por ponto em Mental + 3 da classe.
          </li>
          <li>
            <strong>Vida</strong> = rolar Físico + valor da classe · <strong>Postura</strong> = rolar Físico · <strong>Stamina</strong> = rolar Espiritual + valor da classe.
          </li>
          <li>
            <strong>Resistência</strong> = defesa da armadura escolhida.
          </li>
        </ul>
      </div>

      <div className="panel">
        <h2 className="section-title">Perícias</h2>
        <div className="skill-grid">
          {(['fisico', 'mental', 'espiritual'] as const).map((a) => (
            <div key={a}>
              <h3 className="skill-group__title">{attrName(a)}</h3>
              <ul>
                {SKILLS.filter((s) => s.attr === a).map((s) => (
                  <li key={s.key}>{s.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 className="section-title">Armaduras</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Armadura</th>
              <th>Materiais permitidos</th>
              <th>Defesa</th>
              <th>Patente</th>
            </tr>
          </thead>
          <tbody>
            {ARMORS.map((a) => (
              <tr key={a.key}>
                <td>
                  {a.name} +{a.bonus}
                </td>
                <td>{materialsOf(a).join(' / ')}</td>
                <td>{materialsOf(a).map((m) => a.defense[m]).join(' / ')}</td>
                <td>{a.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 className="section-title">Armas</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Arma</th>
              <th>Dano</th>
              <th>Requisito</th>
            </tr>
          </thead>
          <tbody>
            {WEAPONS.map((w) => (
              <tr key={w.key}>
                <td>{w.name}</td>
                <td>{weaponDamageLabel(w)}</td>
                <td>
                  {w.req} {attrName(w.attr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 className="section-title">Rolador (sintaxe Rollem)</h2>
        <table className="table">
          <tbody>
            {[
              ['4d6', 'quatro dados de seis lados'],
              ['d20+5', 'um d20 com modificador'],
              ['4d6dl1', 'descarta o menor'],
              ['4d6kh3', 'mantém os três maiores'],
              ['6#4d6kh3', 'repete a rolagem seis vezes'],
              ['10d6 << 3', 'conta dados com resultado 3 ou menos'],
              ['d20 >= 15', 'teste com sucesso/falha'],
              ['[d20+5 ataque] [2d6+3 dano]', 'várias rolagens nomeadas'],
              ['4d6--2', 'subtrai 2 de cada dado'],
              ['dF', 'dado Fate'],
              ['/s d20', 'rolagem secreta (só você e o mestre)'],
            ].map(([c, d]) => (
              <tr key={c}>
                <td>
                  <code>{c}</code>
                </td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Limites: 100 dados, 1.000 lados, 20 repetições e 50 resultados por envio.</p>
      </div>
    </section>
  );
}
