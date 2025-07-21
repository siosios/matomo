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

interface Goal {
  idgoal: string|number;
  name: string;
  description?: string;
  match_attribute: string;
  pattern?: string;
  pattern_type?: string;
  case_sensitive?: boolean|string|number;
  revenue?: number|string;
  allow_multiple?: boolean|string|number;
  event_value_as_revenue?: boolean|string|number;
  deleted?: boolean|string|number;
}

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
    const idSite = params.idSite as string|number;
    const idGoal = params.idGoal as string|number;
    const idDestinationSites = params.idDestinationSites as Array<string|number>;

    try {
      const sourceGoal = await AjaxHelper.fetch<Goal>({
        method: 'Goals.getGoal',
        idSite,
        idGoal,
      });

      if (!sourceGoal || sourceGoal.deleted !== '0') {
        return {
          success: false,
          message: 'Invalid goal',
        };
      }

      const idSitesFailed: Array<string|number> = [];
      const idSiteGoals: Record<string|number, string|number> = {};

      const results = await Promise.all(
        idDestinationSites.map(async (idDestinationSite) => {
          try {
            let newName = sourceGoal.name;

            const existingGoals = await AjaxHelper.fetch<Record<string, Goal>>({
              method: 'Goals.getGoals',
              idSite: idDestinationSite,
            });

            if (existingGoals && Object.keys(existingGoals).length > 0) {
              const goalNames = Object.values(existingGoals).map((g) => g.name);

              newName = this.getUniqueNameComparedToList(newName, goalNames, 50);
            }

            const newGoalId = await AjaxHelper.fetch<number>({
              method: 'Goals.addGoal',
              idSite: idDestinationSite,
              name: newName,
              matchAttribute: sourceGoal.match_attribute,
              pattern: sourceGoal.pattern || '',
              patternType: sourceGoal.pattern_type || '',
              caseSensitive: sourceGoal.case_sensitive ? 1 : 0,
              revenue: sourceGoal.revenue || 0,
              allowMultipleConversionsPerVisit: sourceGoal.allow_multiple ? 1 : 0,
              description: sourceGoal.description || '',
              useEventValueAsRevenue: sourceGoal.event_value_as_revenue ? 1 : 0,
            });

            if (!newGoalId || newGoalId < 1) {
              return { success: false, idDestinationSite };
            }

            return { success: true, idDestinationSite, newGoalId };
          } catch (e) {
            return { success: false, idDestinationSite };
          }
        }),
      );

      results.forEach((result) => {
        if (result.success && result.newGoalId) {
          idSiteGoals[result.idDestinationSite] = result.newGoalId;
        } else {
          idSitesFailed.push(result.idDestinationSite);
        }
      });

      const response: DuplicateRequestResponse = {};

      if (idSitesFailed.length > 0) {
        response.success = false;
        response.message = `Goal duplication partially failed for: ${idSitesFailed.join(', ')}`;
      } else {
        response.success = true;
        response.message = 'Goal duplication successful';
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  private getUniqueNameComparedToList(
    name: string,
    existingNames: string[],
    maxLength: number,
  ): string {
    let newName = name;
    let counter = 1;

    while (existingNames.includes(newName)) {
      const suffix = ` (${counter})`;
      const baseNameMaxLength = maxLength - suffix.length;

      let baseName = name;
      if (baseName.length > baseNameMaxLength) {
        baseName = baseName.substring(0, baseNameMaxLength);
      }

      newName = baseName + suffix;
      counter += 1;
    }

    return newName;
  }
}
