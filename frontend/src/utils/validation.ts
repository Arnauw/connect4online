/**
 * Form Validation Utilities
 *
 * Centralized validation functions for user input across the application.
 * These functions ensure data consistency and provide clear error messages.
 *
 * Used in: Registration, Login, Settings, Profile pages
 */

/**
 * Validates email address format
 *
 * Rules:
 * - Must contain exactly one @ symbol
 * - Must have characters before and after @
 * - Must have a dot (.) in the domain part
 * - No whitespace allowed
 *
 * @param email - The email address to validate
 * @returns true if email is valid, false otherwise
 *
 * @example
 * validateEmail("user@example.com")  // returns true
 * validateEmail("invalid.email")     // returns false
 * validateEmail("no@domain")         // returns false
 */
export const validateEmail = (email: string): boolean => {
    // Regex breakdown:
    // ^[^\s@]+   - Start with one or more non-whitespace, non-@ characters
    // @          - Exactly one @ symbol
    // [^\s@]+    - One or more non-whitespace, non-@ characters (domain name)
    // \.         - A literal dot
    // [^\s@]+$   - One or more non-whitespace, non-@ characters until end (TLD)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates username format and length
 *
 * Rules:
 * - Minimum length: 3 characters
 * - Maximum length: 20 characters
 * - Allowed characters: letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_)
 * - No spaces or special characters
 *
 * @param username - The username to validate
 * @returns Object with validation result and optional error message
 *
 * @example
 * validateUsername("john_doe")          // { valid: true }
 * validateUsername("ab")                // { valid: false, error: "..." }
 * validateUsername("invalid username")  // { valid: false, error: "..." }
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
    // Check minimum length
    if (!username || username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }

    // Check maximum length
    if (username.length > 20) {
        return { valid: false, error: 'Username must be less than 20 characters' };
    }

    // Check allowed characters (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }

    return { valid: true };
};

/**
 * Validates password strength
 *
 * Rules:
 * - Minimum length: 8 characters
 * - Must contain at least one uppercase letter (A-Z)
 * - Must contain at least one lowercase letter (a-z)
 * - Must contain at least one number (0-9)
 *
 * Note: Special characters are allowed but not required
 *
 * @param password - The password to validate
 * @returns Object with validation result and array of error messages (empty if valid)
 *
 * @example
 * validatePassword("Strong123")     // { valid: true, errors: [] }
 * validatePassword("weak")          // { valid: false, errors: ["...", "...", "..."] }
 * validatePassword("NoNumbers!")    // { valid: false, errors: ["Password must contain..."] }
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // Return validation result
    // valid = true only if errors array is empty
    return {
        valid: errors.length === 0,
        errors
    };
};
