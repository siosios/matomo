/*!
 * Matomo - free/libre analytics platform
 *
 * @link    https://matomo.org
 * @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

import {
  EntityDuplicatorAdapter,
  ValidationResult,
  AjaxHelper,
  Matomo,
  MatomoUrl,
  translate,
} from 'CoreHome';
import type { DuplicateRequestResponse } from 'CoreHome';

export class GoalDuplicatorAdapter implements EntityDuplicatorAdapter {
  validateFormFields(
    formValues: Record<string, unknown>,
  ): ValidationResult {
    const errorMessages: string[] = [];

    if (!formValues?.idSite) {
      errorMessages.push(translate('General_Required', 'idSite'));
    }

    // Check if idGoal is present
    if (!formValues?.idGoal) {
      errorMessages.push(translate('General_Required', 'idGoal'));
    }

    return {
      errorMessages,
      isValid: errorMessages.length === 0,
    };
  }

  prepareApiParams(
    formValues: Record<string, unknown>,
  ): QueryParameters {
    return {
      idSite: Matomo.idSite || MatomoUrl.parsed.value.idSite,
      idGoal: formValues.idGoal as number|string,
      idDestinationSites: [formValues.idSite as number|string],
    };
  }

  async submitRequest(params: QueryParameters): Promise<DuplicateRequestResponse> {
    return AjaxHelper.post<DuplicateRequestResponse>(
      {
        module: 'API',
        method: 'Goals.duplicateGoal',
        format: 'json',
      },
      params,
    );
  }
}
