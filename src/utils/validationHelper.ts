/**
 * validationHelper.ts
 * Enterprise-grade validation suite for Authentication, Client Registration,
 * and Contact inquiries for Shiuli CAD Studio.
 */

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

/**
 * Validates Full Name:
 * - Must not be blank
 * - Must contain only alphabetic letters, spaces, hyphens, or apostrophes
 * - Must include at least two words (First and Last Name)
 * - Length between 3 and 50 characters
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Full name is required (e.g. Harshil Shah).' };
  }
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Name should contain only alphabetic letters.' };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { isValid: false, error: 'Please enter both first and last name.' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters.' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name cannot exceed 50 characters.' };
  }
  return { isValid: true, error: '' };
}

/**
 * Strict RFC-compliant email address validation
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@domain.com).' };
  }
  return { isValid: true, error: '' };
}

/**
 * Validates Phone Number (Domestic & International):
 * - Clean input (removes spaces, dashes, parentheses)
 * - Optional check if empty
 * - Rejects spam repetitive numbers (e.g. 969696969696969, 1111111111)
 * - If 10 digits without +, checks valid Indian telecom standard (starts with 6-9)
 * - If starting with +, allows standard E.164 international numbers (10 to 15 digits)
 */
export function validatePhoneNumber(phone: string, isRequired = false): ValidationResult {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: 'Phone number is required.' };
    }
    return { isValid: true, error: '' };
  }

  // Remove common visual formatting
  const clean = trimmed.replace(/[\s\-()]/g, '');

  // 1. Repetitive spam checks (all identical digits: 9999999999, 1111111111)
  if (/^(\d)\1+$/.test(clean)) {
    return { isValid: false, error: 'Please enter a genuine, valid phone number.' };
  }

  // 2. Repetitive 2-digit patterns (e.g. 969696969696969)
  if (/^(\d{2})\1{3,}$/.test(clean)) {
    return { isValid: false, error: 'Please enter a valid, non-repetitive phone number.' };
  }

  // 3. International with +
  if (clean.startsWith('+')) {
    if (!/^\+[1-9]\d{9,14}$/.test(clean)) {
      return { isValid: false, error: 'International number must include country code and 10–14 digits.' };
    }
    return { isValid: true, error: '' };
  }

  // 4. Pure digits check
  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'Phone number should only contain numbers and optional + country code.' };
  }

  // 5. 10-digit mobile number validation
  if (clean.length === 10) {
    if (!/^[6-9]\d{9}$/.test(clean)) {
      return { isValid: false, error: '10-digit mobile number must start with 6, 7, 8, or 9.' };
    }
    return { isValid: true, error: '' };
  }

  // 6. Extended length bounds (10 to 14 digits)
  if (clean.length < 10 || clean.length > 14) {
    return { isValid: false, error: 'Phone number must be between 10 and 14 digits.' };
  }

  return { isValid: true, error: '' };
}

/**
 * Validates Password:
 * - Minimum 6 characters
 * - Requires at least 1 letter and 1 numeric digit
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least 1 letter and 1 number.' };
  }
  return { isValid: true, error: '' };
}

/**
 * Validates Password Confirmation
 */
export function validateConfirmPassword(confirm: string, original: string): ValidationResult {
  if (!confirm) {
    return { isValid: false, error: 'Please confirm your password.' };
  }
  if (confirm !== original) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  return { isValid: true, error: '' };
}

/**
 * Calculates password security strength score (0 to 4)
 */
export function getPasswordStrength(pass: string): number {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
  return Math.min(score, 4);
}

export const STRENGTH_CONFIG = [
  { label: '', color: 'bg-transparent', text: '' },
  { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' },
  { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' },
  { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' },
  { label: 'Royal Standard', color: 'bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3]', text: 'text-[#F5E7A3]' },
];
