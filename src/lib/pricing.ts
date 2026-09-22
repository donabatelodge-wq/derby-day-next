// Single source of truth for player-capacity pack pricing. Used both client-side
// (group/new wizard, for display) and server-side (checkout route, as the
// authoritative price — the client never gets to dictate what it's charged).
export const PLAYER_PACKS = [
  { players: 20, price: 20 },
  { players: 30, price: 30 },
  { players: 40, price: 40 },
  { players: 50, price: 50 },
] as const;

export type PlayerPack = (typeof PLAYER_PACKS)[number];

export function packForPlayers(players: number): PlayerPack {
  return PLAYER_PACKS.find((p) => p.players === players) ?? PLAYER_PACKS[0];
}

// The tier one step up from the group's current max_players, for the
// "buy more players" upgrade flow. Returns null if already at the top tier.
export function nextPackTier(currentMaxPlayers: number): PlayerPack | null {
  const idx = PLAYER_PACKS.findIndex((p) => p.players === currentMaxPlayers);
  if (idx === -1) {
    // Unknown/custom tier (e.g. legacy data) — treat the smallest pack above
    // the current cap as the next tier.
    return PLAYER_PACKS.find((p) => p.players > currentMaxPlayers) ?? null;
  }
  return PLAYER_PACKS[idx + 1] ?? null;
}
