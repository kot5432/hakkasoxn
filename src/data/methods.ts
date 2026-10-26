import type { StudyMethod } from '../domain/types';

export const studyMethods: StudyMethod[] = [
  {
    id: 'write',
    name: '書いて覚える',
    shortName: '書く',
    emoji: '✍️',
    description: '英単語と日本語訳を紙に書いて覚えます。',
    instructions: ['英単語と日本語訳を見比べます', '紙に単語と意味を数回書きます', '書いたあと、意味を声に出して確認します'],
  },
  {
    id: 'speak',
    name: '声に出して覚える',
    shortName: '声に出す',
    emoji: '🔊',
    description: '英単語と日本語訳を声に出して読みます。',
    instructions: ['英単語を声に出して読みます', '日本語訳を続けて読みます', '発音と意味をセットでくり返します'],
  },
  {
    id: 'recall',
    name: '思い出して覚える',
    shortName: '思い出す',
    emoji: '🧠',
    description: '日本語訳を隠し、意味を思い出してから確認します。',
    instructions: ['日本語訳を手や紙で隠します', '英単語を見て意味を思い出します', '思い出してから日本語訳を確認します'],
  },
];

export const methodName = (id: StudyMethod['id']): string =>
  studyMethods.find((method) => method.id === id)?.name ?? id;
