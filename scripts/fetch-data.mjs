// Descarga partidos de Colo-Colo (2020 -> hoy) desde la API pública de ESPN
// y genera data/matches.json. Uso: node scripts/fetch-data.mjs
import { writeFile } from 'node:fs/promises';

const TEAM_ID = '2688';
const FIRST_YEAR = 2020;
const LAST_YEAR = new Date().getFullYear() + 1;
const LEAGUES = {
  'chi.1': 'Primera División',
  'chi.copa_chi': 'Copa Chile',
  'conmebol.libertadores': 'Copa Libertadores',
  'conmebol.sudamericana': 'Copa Sudamericana',
  'chi.super_cup': 'Supercopa',
  'chi.copa_de_la_liga': 'Copa de la Liga',
};

const get = async (url) => {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

const matches = new Map();
for (const [slug, fallbackName] of Object.entries(LEAGUES)) {
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${TEAM_ID}/schedule?season=${y}`;
    // Partidos jugados + calendario pendiente (fixture=true)
    const events = [...((await get(base))?.events ?? []), ...((await get(base + '&fixture=true'))?.events ?? [])];
    for (const e of events) {
      const c = e.competitions?.[0];
      if (!c) continue;
      const home = c.competitors.find((t) => t.homeAway === 'home');
      const away = c.competitors.find((t) => t.homeAway === 'away');
      if (!home || !away) continue;
      const state = c.status?.type?.state ?? e.status?.type?.state ?? 'pre';
      const score = (t) => (state === 'pre' ? null : Number(t.score?.value ?? t.score ?? 0));
      const side = (t) => ({ id: t.team.id, name: t.team.displayName, logo: t.team.logos?.[0]?.href ?? null, score: score(t) });
      matches.set(e.id, {
        id: e.id,
        date: e.date,
        season: e.season?.year ?? y,
        competition: fallbackName,
        stage: e.seasonType?.name ?? '',
        venue: c.venue?.fullName ?? '',
        city: c.venue?.address?.city ?? '',
        state, // pre | in | post
        statusText: c.status?.type?.shortDetail ?? '',
        home: side(home),
        away: side(away),
      });
    }
  }
  console.log(slug, '->', matches.size, 'acumulados');
}

const list = [...matches.values()].filter((m) => new Date(m.date).getFullYear() >= FIRST_YEAR)
  .sort((a, b) => new Date(a.date) - new Date(b.date));
await writeFile(new URL('../data/matches.json', import.meta.url), JSON.stringify({ updated: new Date().toISOString(), teamId: TEAM_ID, matches: list }));
console.log('Total:', list.length);
