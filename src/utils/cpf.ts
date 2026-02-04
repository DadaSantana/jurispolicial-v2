export function validateCPF(cpf: string): boolean {
    // Remove non-numeric characters
    cpf = cpf.replace(/[^\d]/g, '');

    // Check if length is 11 and if it's not a sequence of repeated numbers
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    // Calculate first digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) {
        return false;
    }

    // Calculate second digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) {
        return false;
    }

    return true;
}

export function formatCPF(cpf: string): string {
    // Remove non-numeric characters and limit to 11 digits
    const cleaned = cpf.replace(/[^\d]/g, '').slice(0, 11);
    
    // Format as XXX.XXX.XXX-XX
    if (cleaned.length >= 9) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}${cleaned.length > 9 ? '-' + cleaned.slice(9) : ''}`;
    } else if (cleaned.length >= 6) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    }
    return cleaned;
}
