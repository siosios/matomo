/*!
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

import type { DuplicateRequestResponse } from './types';

export interface ValidationResult {
  isValid: boolean;
  errorMessages: string[];
}

export interface EntityDuplicatorAdapter {
  /**
   * Validates the form fields before submission
   */
  validateFormFields(formValues: Record<string, unknown>): ValidationResult;

  /**
   * Prepares the API parameters for the duplication request
   */
  prepareApiParams(formValues: Record<string, unknown>): QueryParameters;

  /**
   * Submits the duplication request to the server
   */
  submitRequest(params: QueryParameters): Promise<DuplicateRequestResponse>;

  /**
   * Optional: Called after successful duplication
   */
  onSuccess?(response: DuplicateRequestResponse): void;

  /**
   * Optional: Called after failed duplication
   */
  onFailure?(error: DuplicateRequestResponse | Error): void;
}
