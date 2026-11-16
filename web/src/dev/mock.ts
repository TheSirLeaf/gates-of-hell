import type { Character, GameClass, Message, Profile } from '../lib/types';

export const MOCK_CLASSES: GameClass[] = [
  {
    id: 'c1', name: 'Guerreiro', summary: 'Classe focada em combate corpo a corpo e técnicas de arma.',
    bonus_fisico: 1, bonus_mental: 1, bonus_espiritual: 1, vida: 10, stamina: 10,
    skills: ['luta', 'iniciativa', 'atletismo'],
    benefits: 'Os Guerreiros são treinados em armas cortantes, contundentes e perfurantes.',
    abilities: [
      { name: 'Arma preferida', cost: 5, description: 'Você treinou muito com uma arma até atingir a perfeição.' },
      { name: 'Ataque duplo', cost: 5, description: 'Se acertar um ataque, pode realizar um segundo com acerto garantido.' },
    ],
  },
  {
    id: 'c2', name: 'Assassino', summary: 'Classe focada em combate furtivo e emboscadas.',
    bonus_fisico: 0, bonus_mental: 1, bonus_espiritual: 2, vida: 10, stamina: 10,
    skills: ['furtividade', 'percepcao', 'esquiva'], benefits: '', abilities: [],
  },
];

export const MOCK_CHARACTERS: Character[] = [
  {
    id: 'ch1', owner_id: 'me', name: 'Kael Voss', race: 'Humano', class_id: 'c1',
    fisico: 3, mental: 2, espiritual: 1, vida: 17, vida_max: 22, postura: 9, postura_max: 12, stamina: 14, stamina_max: 16,
    armor_kind: 'composta', armor_material: 'Estige', skills: { luta: 2, esquiva: 1, atletismo: 1, percepcao: 1 },
    chosen_ability: 'Arma preferida', notes: '', avatar_url: null, updated_at: new Date().toISOString(),
  },
  {
    id: 'ch2', owner_id: 'other', name: 'Sira Noxe', race: 'Elfa', class_id: 'c2',
    fisico: 1, mental: 3, espiritual: 3, vida: 12, vida_max: 12, postura: 4, postura_max: 6, stamina: 5, stamina_max: 14,
    armor_kind: 'simples', armor_material: 'Couro', skills: { furtividade: 3 }, chosen_ability: '', notes: '',
    avatar_url: null, updated_at: new Date().toISOString(),
  },
];

export const MOCK_PROFILE = (role: 'player' | 'master' | 'admin'): Profile => ({
  id: 'me', display_name: role === 'admin' ? 'Patrick' : role === 'master' ? 'Mestre Ravn' : 'Jogadora Lia', role, admin_mode: false,
});

const t = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const MOCK_MESSAGES: Message[] = [
  { id: 1, author_id: 'other', author_name: 'Mestre Ravn', character_id: null, kind: 'chat', body: 'A porta range e cede. Do outro lado, um corredor de pedra molhada.', rolls: null, payload: null, secret: false, created_at: t(9) },
  {
    id: 2, author_id: 'me', author_name: 'Jogadora Lia', character_id: 'ch1', kind: 'roll', body: '3d20kh1+2 Luta',
    rolls: [{ label: 'Luta', expression: '3d20kh1 + 2', total: 19, success: null, dice: [{ value: 4, dropped: true, crit: false, fate: false }, { value: 11, dropped: true, crit: false, fate: false }, { value: 17, dropped: false, crit: false, fate: false }] }],
    payload: null, secret: false, created_at: t(5),
  },
  {
    id: 3, author_id: 'me', author_name: 'Jogadora Lia', character_id: 'ch1', kind: 'forge', body: 'Forjou espada longa rara de aço', rolls: null, secret: false, created_at: t(2),
    payload: { weapon: 'Espada longa', rarity: 'Rara', metal: 'Aço', tests: 7, perfects: 3, betters: 2, goods: 1, misses: 0, criticals: 1, damageBonus: 3, durability: 10, divineOk: null, timeline: ['Perfeito', 'Melhor', 'Perfeito', 'Bom', 'Falha crítica', 'Melhor', 'Perfeito'] },
  },
];
