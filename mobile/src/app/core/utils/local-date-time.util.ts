/**
 * Formate une date ISO (ou Date) en heure locale sans fuseau : `YYYY-MM-DDTHH:mm:ss`.
 * C'est le format attendu par le serveur pour les dates d'opération (LocalDateTime).
 * Retourne undefined si la valeur est absente ou invalide.
 */
export function toLocalDateTimeString(raw?: string | Date | null): string | undefined {
    if (!raw) {
        return undefined;
    }
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Vrai si la date locale de la valeur est celle d'aujourd'hui. */
export function isLocalToday(raw?: string | Date | null, now: Date = new Date()): boolean {
    const formatted = toLocalDateTimeString(raw);
    const today = toLocalDateTimeString(now);
    return !!formatted && !!today && formatted.substring(0, 10) === today.substring(0, 10);
}
