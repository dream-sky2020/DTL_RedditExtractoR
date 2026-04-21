import { AuthorProfile } from '../types';

const ADJECTIVES = [
  'Calm', 'Bright', 'Swift', 'Quiet', 'Clever', 'Kind', 'Brave', 'Sharp',
  'Lucky', 'Gentle', 'Rapid', 'Solid', 'Silver', 'Golden', 'Crystal', 'Nova',
  'Orbit', 'Pixel', 'Echo', 'Aurora', 'Maple', 'River', 'Cedar', 'Frost',
];

const NOUNS = [
  'Fox', 'Owl', 'Whale', 'Panda', 'Eagle', 'Otter', 'Falcon', 'Dolphin',
  'Wolf', 'Tiger', 'Raven', 'Turtle', 'Comet', 'Meteor', 'Leaf', 'Pebble',
  'Cloud', 'Harbor', 'Summit', 'Lantern', 'Signal', 'Compass', 'Anchor', 'Spark',
];

const randomInt = (maxExclusive: number) =>
  Math.floor(Math.random() * Math.max(1, maxExclusive));

const nextUniqueAlias = (used: Set<string>) => {
  let attempts = 0;
  while (attempts < 2000) {
    const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
    const noun = NOUNS[randomInt(NOUNS.length)];
    const num = String(randomInt(1000)).padStart(3, '0');
    const alias = `${adj}-${noun}-${num}`;
    if (!used.has(alias.toLowerCase())) {
      used.add(alias.toLowerCase());
      return alias;
    }
    attempts += 1;
  }
  const fallback = `User-${Date.now()}-${randomInt(10000)}`;
  used.add(fallback.toLowerCase());
  return fallback;
};

export function generateRandomAliasProfiles(
  authors: string[],
  previousProfiles: Record<string, AuthorProfile>,
): Record<string, AuthorProfile> {
  const nextProfiles: Record<string, AuthorProfile> = { ...previousProfiles };
  const usedAliases = new Set<string>();

  authors.forEach((author) => {
    const existingAlias = nextProfiles[author]?.alias?.trim();
    if (existingAlias) usedAliases.add(existingAlias.toLowerCase());
  });

  authors.forEach((author) => {
    const profile = nextProfiles[author] || {};
    nextProfiles[author] = {
      ...profile,
      alias: nextUniqueAlias(usedAliases),
    };
  });

  return nextProfiles;
}
