import { RESERVED_EXTENSION_IDS } from 'src/extension/constants';
import {
  checkIdentity,
  checkShapes,
} from 'src/extension/validation/identityRules';
import checkLaziness from 'src/extension/validation/lazinessRules';
import {
  checkDetect,
  checkSubstrates,
  checkUniqueness,
} from 'src/extension/validation/contributionRules';
import { isObject } from 'src/extension/validation/validationUtils';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface ValidateOptions {
  /** Ids the host already uses; defaults to the DTaaS core routes. */
  readonly reservedIds?: readonly string[];
}

/**
 * Checks one extension against the contract. Never throws, so the host can
 * disable a broken extension instead of failing to start. Rules that span
 * several extensions (duplicate ids across kits) belong to the host.
 */
const validateExtension = (
  ext: unknown,
  options: ValidateOptions = {},
): ValidationResult => {
  if (!isObject(ext)) {
    return { valid: false, errors: ['extension must be an object'] };
  }
  const errors = [
    ...checkIdentity(ext, options.reservedIds ?? RESERVED_EXTENSION_IDS),
    ...checkShapes(ext),
    ...checkLaziness(ext),
    ...checkUniqueness(ext),
    ...checkSubstrates(ext),
    ...checkDetect(ext),
  ];
  return { valid: errors.length === 0, errors };
};

export default validateExtension;
