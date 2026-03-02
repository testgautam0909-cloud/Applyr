const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a date string from YYYY-MM-DD to DD MMM YYYY.
 * Returns '—' for empty or invalid dates.
 */
export function formatDateForDisplay(dateStr: string): string {
    if (!dateStr) {
        return '—';
    }

    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        return '—';
    }

    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(monthIndex) || isNaN(day) || monthIndex < 0 || monthIndex > 11) {
        return '—';
    }

    return `${day.toString().padStart(2, '0')} ${MONTHS[monthIndex]} ${year}`;
}

/**
 * Formats a date string for input fields (YYYY-MM-DD format)
 */
export function formatDateForInput(dateStr: string): string {
    if (!dateStr) {
        return '';
    }
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return '';
    }
    
    return date.toISOString().split('T')[0];
}

/**
 * Formats a date for consistent display across the application
 */
export function formatDateConsistent(dateStr: string): string {
    if (!dateStr) {
        return '—';
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return '—';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
}

/**
 * Generates a unique ID string.
 */
export function generateId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}