<!--
  Matomo - free/libre analytics platform

  @link    https://matomo.org
  @license https://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
-->
<template>
  <div
    :class="{
      'modal': true,
      'entity-duplicator-modal': true,
      'slot-configured': true,
    }"
    ref="root">
    <div class="main-duplicator-modal-content" v-show="isModalVisible">
      <div class="modal-header">
        <span class="btn-close modal-close"><i class="icon-close"></i></span>
        <h2>
          {{ getModalTitle }}
        </h2>
      </div>

      <template v-if="isLoading">
        <div class="modal-sub-header">
          <MatomoLoader />
          <span class="loading-message">{{ translate('General_Loading') }}</span>
        </div>
      </template>

      <template v-else>
        <div class="modal-sub-header">
          <p>
            {{ getDuplicateDescription }}
            <span v-if="descriptionLearnMoreLink" v-html="$sanitize(getLearnMoreLink)"></span>
          </p>
        </div>
        <div class="modal-content">
          <div v-form class="modal-inputs">
            <slot></slot>
          </div>
        </div>
        <div class="modal-sub-footer">
          <div
            :class="{
              'alert': true,
              'alert-danger': true,
              'error-list': duplicationErrors.length > 1
            }"
            v-if="duplicationErrors.length > 0">
            <ul>
              <li
                v-for="(duplicationError, index) in duplicationErrors"
                :key="index"
                v-html="$sanitize(duplicationError)"
              />
            </ul>
          </div>
          <p class="note-text" v-html="$sanitize(getNoteText)"/>
        </div>
        <div class="modal-footer">
          <button
            class="btn"
            :disabled="!getIsValid || hasBeenSubmitted"
            @click="submitRequest()"
          >{{ translate('General_Copy') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  watch,
  PropType,
} from 'vue';
import useExternalPluginComponent from '../useExternalPluginComponent';
import { translate } from '../translate';
import { externalLink } from '../externalLink';
import { EntityDuplicatorStore } from './EntityDuplicatorStore';
import { DuplicateRequestResponse } from './types';
import { EntityDuplicatorAdapter } from './EntityDuplicatorAdapter';
import MatomoLoader from '../MatomoLoader/MatomoLoader';

// async since we're referencing a recursive component
const Form = useExternalPluginComponent('CorePluginsAdmin', 'Form');
const { $ } = window;

interface EntityDuplicatorState {
  isLoading: boolean;
  isValidated: boolean;
  duplicationErrors: string[];
  hasBeenSubmitted: boolean;
}

export default defineComponent({
  directives: {
    Form,
  },
  components: {
    MatomoLoader,
  },
  props: {
    /**
     * The reactive class for controlling the settings of the modal from multiple components.
     */
    modalStore: {
      type: Object as PropType<EntityDuplicatorStore>,
      required: true,
    },
    /**
     * The adapter that handles validation and submission logic
     */
    adapter: {
      type: Object as PropType<EntityDuplicatorAdapter>,
      required: true,
    },
    /**
     * Optional "Learn more." link to append to the end of the description text if provided.
     */
    descriptionLearnMoreLink: {
      type: String,
      default: '',
    },
  },
  data(): EntityDuplicatorState {
    return {
      isLoading: true,
      isValidated: false,
      duplicationErrors: [],
      hasBeenSubmitted: false,
    };
  },
  emits: [
    'duplicationSuccessful',
    'duplicationFailed',
  ],
  watch: {
    isModalVisible(newValue) {
      if (!newValue) {
        return;
      }

      // TODO - Do some logic before showing modal

      this.showModal();

      // TODO - determine the best indication that loading is done
      this.isLoading = false;
    },
  },
  methods: {
    closeModal() {
      const root = this.$refs.root as HTMLElement;
      const $root = $(root);
      $root.modal('close');
    },
    resetModal() {
      this.modalStore.hideModal();
      this.isLoading = true;
      this.isValidated = false;
      this.duplicationErrors = [];
      this.hasBeenSubmitted = false;
    },
    showModal() {
      const root = this.$refs.root as HTMLElement;
      const $root = $(root);
      $root.modal({
        dismissible: true,
        onCloseEnd: () => {
          this.resetModal();
        },
      }).modal('open');
    },
    submitRequest() {
      this.hasBeenSubmitted = true;
      // Make sure all the validation passes before making the server request
      this.validateFormFields();
      if (!this.getIsValid) {
        this.hasBeenSubmitted = false;
        return;
      }

      // Use adapter to prepare API parameters
      const params = this.adapter.prepareApiParams(this.modalStore.state.entityFormData);

      // Use adapter to submit the request
      this.adapter.submitRequest(params).then((response: DuplicateRequestResponse) => {
        // If the response was invalid or unsuccessful, emit the failure and show an error message
        if (!response || !response.isDuplicationSuccessful) {
          this.emitFailureAndSetErrorMessage(response);
          return;
        }

        // Call adapter's onSuccess if defined
        if (this.adapter.onSuccess) {
          this.adapter.onSuccess(response);
        }

        // Emit success so parent can perform desired actions like reload the data store or page
        this.$emit('duplicationSuccessful', response);

        this.closeModal();
      }).catch((error) => {
        this.emitFailureAndSetErrorMessage();

        // Call adapter's onFailure if defined
        if (this.adapter.onFailure) {
          this.adapter.onFailure(error);
        }

        console.log('Unexpected server error during request.', error);
      }).finally(() => {
        this.hasBeenSubmitted = false;
      });
    },
    validateFormFields() {
      this.isValidated = true;
      this.duplicationErrors = [];

      // Don't bother if the modal isn't visible
      if (!this.modalStore.state.isModalVisible) {
        return;
      }

      // Use adapter for validation
      const validationResult = this.adapter.validateFormFields(
        this.modalStore.state.entityFormData,
      );

      if (!validationResult.isValid && validationResult.errorMessages.length > 0) {
        this.duplicationErrors = validationResult.errorMessages;
      }
    },
    emitFailureAndSetErrorMessage(response: null|DuplicateRequestResponse = null) {
      let tempResponseObject = response;
      // If no response object is set, create one with a generic error message
      if (!tempResponseObject) {
        tempResponseObject = {
          isDuplicationSuccessful: false,
          errorMessage: translate('General_ErrorRequest', '', ''),
        };
      }

      // If the error message wasn't set, set it to a generic error message
      if (!tempResponseObject.errorMessage || tempResponseObject.errorMessage.length === 0) {
        tempResponseObject.errorMessage = translate('General_ErrorRequest', '', '');
      }

      this.duplicationErrors = [];
      this.duplicationErrors.push(tempResponseObject.errorMessage);
      this.$emit('duplicationFailed', tempResponseObject);
    },
  },
  mounted() {
    // Watch the formData object for any property changes to know whether current data was validated
    watch(
      () => this.modalStore.state.entityFormData,
      () => {
        // Reset validation state when form data changes
        this.isValidated = false;
      },
      { deep: true },
    );
  },
  computed: {
    isModalVisible(): boolean {
      return this.modalStore.state.isModalVisible ?? false;
    },
    getModalTitle(): string {
      return translate('CoreHome_CopyX', this.modalStore.getEntityTypeTranslation);
    },
    getNoteText(): string {
      const noteText = translate(
        'CoreHome_CopyModalNote',
        '<strong>',
        '</strong>',
        this.modalStore.getEntityTypeTranslation,
      );

      return `${noteText}`;
    },
    getDuplicateDescription(): string {
      return translate('CoreHome_CopyXDescription', this.modalStore.getEntityTypeTranslation);
    },
    getLearnMoreLink() {
      if (!this.descriptionLearnMoreLink) {
        return '';
      }

      const linkString = externalLink(this.descriptionLearnMoreLink);
      return translate('CoreHome_LearnMoreFullStop', linkString, '</a>');
    },
    getIsValid(): boolean {
      // Show as valid until validation has actually been checked
      if (!this.isValidated) {
        return true;
      }

      return Array.isArray(this.duplicationErrors) && this.duplicationErrors.length === 0;
    },
  },
});
</script>
