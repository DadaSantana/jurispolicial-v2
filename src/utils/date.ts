type FirestoreTimestamp = {
    seconds: number;
    nanoseconds: number;
};

export function toDate(timestamp: Date | FirestoreTimestamp | null | undefined): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if ('seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    return null;
}

export function formatDate(timestamp: Date | FirestoreTimestamp | null | undefined): string {
    const date = toDate(timestamp);
    return date?.toLocaleDateString() || 'Data não disponível';
}

export function formatDateTime(timestamp: Date | FirestoreTimestamp | null | undefined): string {
    const date = toDate(timestamp);
    return date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : 'Horário não disponível';
}
