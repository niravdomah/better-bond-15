/**
 * User Role Definitions — MortgageMax Commission Payments POC
 *
 * This POC uses a single authenticated role (FRS NFR3).
 * All authenticated users share identical permissions.
 * The multi-role model (ADMIN / POWER_USER / STANDARD_USER / READ_ONLY) from
 * the template has been replaced — AC-11.
 */

export enum UserRole {
  /**
   * Single authenticated role for this POC.
   * All payment administrators use this role.
   */
  USER = 'user',
}

/**
 * Role hierarchy — single role, no differentiation needed.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 10,
};

/**
 * Human-readable role descriptions
 */
export const roleDescriptions: Record<UserRole, string> = {
  [UserRole.USER]: 'Payment Administrator',
};

/**
 * Default role — only one role exists in this POC.
 */
export const DEFAULT_ROLE = UserRole.USER;

/**
 * Type guard to check if a string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Get all available roles as an array
 */
export function getAllRoles(): UserRole[] {
  return Object.values(UserRole);
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}
