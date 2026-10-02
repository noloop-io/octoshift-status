// The status page's checker (→ D-73). Node 20+, no dependencies.
//
// Requests every URL in components.json and records, per component, the latest answer
// and the good and total checks per Athens day, in the file named as the argument
// (checks.json on the `checks` branch). A component is up when its /up answers 2xx
// within the timeout; anything else — an error page, a timeout, a refused connection —
// is down, because that is what a manager opening the app would see.
//
//   node check.mjs data/checks.json

import { readFile, writeFile } from 'node:fs/promises';

const TIMEOUT_MS = 10_000;
const KEEP_DAYS = 100;
const target = process.argv[2] ?? 'checks.json';

const components = JSON.parse(
    await readFile(new URL('./components.json', import.meta.url), 'utf8'),
);

let previous = { components: {}, days: {} };
try {
    previous = JSON.parse(await readFile(target, 'utf8'));
} catch {
    // The first run: nothing to carry over.
}

const athensDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});
const now = new Date();
const today = athensDay.format(now);

async function check(url) {
    const started = performance.now();

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
                'user-agent': 'status-checker',
                'cache-control': 'no-cache',
            },
            redirect: 'manual',
        });

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            ms: Math.round(performance.now() - started),
        };
    } catch {
        return {
            ok: false,
            status: 0,
            ms: Math.round(performance.now() - started),
        };
    }
}

const results = await Promise.all(
    Object.entries(components).map(async ([key, url]) => [
        key,
        await check(url),
    ]),
);

const output = { generated_at: now.toISOString(), components: {}, days: {} };
const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000);

for (const [key, result] of results) {
    const before = previous.components?.[key];
    const since =
        before && before.ok === result.ok && before.since
            ? before.since
            : now.toISOString();

    output.components[key] = { ...result, since };

    const days = { ...(previous.days?.[key] ?? {}) };
    const [good, total] = days[today] ?? [0, 0];
    days[today] = [good + (result.ok ? 1 : 0), total + 1];

    for (const day of Object.keys(days)) {
        if (new Date(`${day}T00:00:00Z`) < cutoff) {
            delete days[day];
        }
    }

    output.days[key] = days;
}

await writeFile(target, JSON.stringify(output) + '\n');

for (const [key, result] of results) {
    console.log(
        `${result.ok ? 'up  ' : 'DOWN'} ${key} ${result.status} ${result.ms}ms`,
    );
}
