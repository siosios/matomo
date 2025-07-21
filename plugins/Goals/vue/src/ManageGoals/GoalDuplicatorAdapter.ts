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
    idSite?: number|string,
  ): ValidationResult {
    const errorMessages: string[] = [];

    if (!idSite) {
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
    idSite?: number|string,
  ): QueryParameters {
    // idSite is validated with validateFormFields
    const idDestinationSites = [idSite as number|string];

    return {
      module: 'CoreHome',
      action: 'duplicateEntity',
      idSite: Matomo.idSite || MatomoUrl.parsed.value.idSite,
      entityTypeName: 'goal',
      requestData: formValues,
      idDestinationSites,
    };
  }

  async submitRequest(params: QueryParameters): Promise<DuplicateRequestResponse> {
    const ajax = new AjaxHelper();

    // Remove the unnecessary default parameters
    ajax.removeDefaultParameter('date');
    ajax.removeDefaultParameter('period');
    ajax.removeDefaultParameter('segment');

    // Include token in POST body for security
    ajax.withTokenInUrl();
    ajax.addParams(params, 'POST');
    ajax.setFormat('json');

    return ajax.send();
  }
}
