-- =====================================================================
-- Gates of Hell — classes iniciais (de remake-resources/CLASSES.md)
-- Rode depois de 001_schema.sql. Se a classe já existe, só atualiza.
-- =====================================================================
insert into public.classes
  (name, summary, bonus_fisico, bonus_mental, bonus_espiritual, vida, stamina, skills, benefits, abilities)
values
(
  'Guerreiro',
  'Classe focada em combate corpo a corpo e técnicas de arma.',
  1, 1, 1, 10, 10,
  array['luta', 'iniciativa', 'atletismo'],
  'Os Guerreiros são treinados em armas cortantes, contundentes e perfurantes.',
  $j$[
    {"name": "Arma preferida", "cost": 5, "description": "Você treinou muito com uma arma até atingir a perfeição. Quando atacar usando a arma escolhida na criação da ficha, pode fazer um ataque especial com efeito diferente para cada arma.\n\nArmas cortantes: sangramento que causa 1d6 de dano por turno até o alvo se tratar; 2d6 se o ataque quebrar a postura.\nArmas contundentes: causa 1d6 de dano extra na postura do alvo e o estuna se a postura quebrar no ataque.\nArmas perfurantes: causa 1d6 de dano direto à vida ignorando a Resistência; 2d6 se a postura quebrar com o ataque."},
    {"name": "Ataque duplo", "cost": 5, "description": "Você treinou sua velocidade e movimentação até conseguir atacar extremamente rápido. Se acertar um ataque no alvo, pode realizar um segundo ataque imediatamente com acerto garantido (só faz o segundo ataque se o primeiro acertar)."}
  ]$j$::jsonb
),
(
  'Atirador',
  'Classe focada em combate à distância e rastreio.',
  1, 2, 0, 10, 10,
  array['pontaria', 'percepcao', 'esquiva'],
  'Os Atiradores são treinados em armas de alcance e perfurantes.',
  $j$[
    {"name": "Disparo pesado", "cost": 5, "description": "Você treinou para ser o mais letal possível em seus ataques. Quando acertar um alvo, ele é lançado para trás, deslocando 5m. Se o alvo colidir contra uma estrutura ou outra criatura, fica stunado por uma rodada."},
    {"name": "Disparo de precisão", "cost": 5, "description": "Você treinou sua mira para acertar alvos com facilidade. Ao atacar um alvo que não esteja adjacente a você, soma +5 de dano e +2 em acerto."}
  ]$j$::jsonb
),
(
  'Lutador',
  'Classe focada em combate corpo a corpo e técnicas de combate.',
  1, 0, 2, 10, 10,
  array['esquiva', 'vontade', 'intimidacao'],
  'Os Lutadores são treinados em armas contundentes.',
  $j$[
    {"name": "Golpe pesado", "cost": 5, "description": "Você treinou muito para ficar forte. Quando atacar uma criatura, seu próximo ataque que acertar o alvo o stuna."},
    {"name": "Derrubar", "cost": 5, "description": "Você aprendeu que a melhor arma é o seu corpo. Quando atacar um alvo e acertar, pode derrubá-lo no chão: a criatura tem que gastar sua ação de movimento para levantar e todo ataque contra ela enquanto estiver caída tem vantagem."}
  ]$j$::jsonb
),
(
  'Assassino',
  'Classe focada em combate furtivo e emboscadas.',
  0, 1, 2, 10, 10,
  array['furtividade', 'percepcao', 'esquiva'],
  'Os Assassinos são treinados em armas cortantes e de alcance.',
  $j$[
    {"name": "Golpe fatal", "cost": 5, "description": "Você treinou muito para matar essas criaturas: aprendeu pontos fracos e anatomia. Ao atacar uma criatura que não tenha percebido sua presença, seu ataque ignora a Resistência do alvo."},
    {"name": "Furtividade", "cost": 5, "description": "Você treinou para ser o mais furtivo possível durante o combate. Ao rolar Furtividade, soma +1 dado no teste. Ao atacar um alvo que não tenha percebido você, seu ataque é considerado crítico (dano máximo). Ao atacar, sai da furtividade."}
  ]$j$::jsonb
),
(
  'Escudeiro',
  'Classe focada em combate defensivo e defesa dos aliados.',
  2, 0, 1, 10, 10,
  array['fortitude', 'vontade', 'percepcao'],
  'Os Escudeiros são treinados em armas cortantes, contundentes e escudos.',
  $j$[
    {"name": "Defesa absoluta", "cost": 5, "description": "Quando estiver equipado com um escudo, pode consumir sua ação para ficar completamente parado diante de um ataque inimigo e reduzir o dano pela metade para você e qualquer aliado adjacente. Durante o uso você concede aos seus aliados qualquer efeito que um cover concederia."},
    {"name": "Parry", "cost": 5, "description": "Quando um ataque vem em sua direção, pode aparar o ataque se tiver sucesso em um teste de Fortitude: além de bloquear o dano completamente, você devolve metade para o atacante. Se falhar no teste, reduz o dano pela metade."}
  ]$j$::jsonb
)
on conflict (name) do update set
  summary = excluded.summary,
  bonus_fisico = excluded.bonus_fisico,
  bonus_mental = excluded.bonus_mental,
  bonus_espiritual = excluded.bonus_espiritual,
  vida = excluded.vida,
  stamina = excluded.stamina,
  skills = excluded.skills,
  benefits = excluded.benefits,
  abilities = excluded.abilities;
