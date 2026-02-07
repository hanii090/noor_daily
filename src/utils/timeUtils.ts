/**
 * Utility functions for time formatting
 */

/**
 * Convert a timestamp to a human-readable "time ago" string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "2h ago", "3 days ago", etc.
 */
export const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
        return 'Added just now';
    } else if (minutes < 60) {
        return `Added ${minutes}m ago`;
    } else if (hours < 24) {
        return `Added ${hours}h ago`;
    } else if (days === 1) {
        return 'Added yesterday';
    } else if (days < 7) {
        return `Added ${days} days ago`;
    } else if (weeks === 1) {
        return 'Added 1 week ago';
    } else if (weeks < 4) {
        return `Added ${weeks} weeks ago`;
    } else if (months === 1) {
        return 'Added 1 month ago';
    } else if (months < 12) {
        return `Added ${months} months ago`;
    } else if (years === 1) {
        return 'Added 1 year ago';
    } else {
        return `Added ${years} years ago`;
    }
};
