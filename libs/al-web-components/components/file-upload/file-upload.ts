import { TemplateResult, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import { nanoid } from 'nanoid';
import register from '../../directives/register';
import PackageJson from '../../package.json';
import { ALElement } from '../ALElement';
import { ALButton } from '../button/button';
import { ALFieldNote } from '../field-note/field-note';
import { ALIconClose } from '../icon/icons/close';
import { ALIconDocument } from '../icon/icons/document';
import { ALIconSuccess } from '../icon/icons/success';
import { ALIconWarningCircle } from '../icon/icons/warning-circle';
import { ALProgress } from '../progress/progress';
import styles from './file-upload.scss';

export interface FileUploadTextConfig {
  fileFormatErrorText: string;
  fileSizeErrorText: string;
}

export interface filesStateConfig {
  fileObject: File;
  fieldId: string;
  status: string;
  statusText: string;
  fileSizeExceeded: boolean;
  fileFormatError: boolean;
}

export interface FileUploadProgressStream {
  fileId: string;
  file: string;
  status: string;
  statusText: string;
}

export const defaultTextConfig: FileUploadTextConfig = {
  fileFormatErrorText: 'Failed, file format error',
  fileSizeErrorText: 'Failed, file size exceeded the size limit'
};

/**
 * Component: al-file-upload
 * - **slot**: The component's content
 */
export class ALFileUpload extends ALElement {
  static el = 'al-file-upload';

  private elementMap = register({
    elements: [
      [ALFieldNote.el, ALFieldNote],
      [ALIconClose.el, ALIconClose],
      [ALIconWarningCircle.el, ALIconWarningCircle],
      [ALIconSuccess.el, ALIconSuccess],
      [ALIconDocument.el, ALIconDocument],
      [ALProgress.el, ALProgress],
      [ALButton.el, ALButton]
    ],
    suffix: (globalThis as any).alAutoRegistry === true ? '' : PackageJson.version
  });

  private fieldNoteEl = unsafeStatic(this.elementMap.get(ALFieldNote.el));
  private iconCloseEl = unsafeStatic(this.elementMap.get(ALIconClose.el));
  private iconWarningEl = unsafeStatic(this.elementMap.get(ALIconWarningCircle.el));
  private iconDoneEl = unsafeStatic(this.elementMap.get(ALIconSuccess.el));
  private iconDocumentEl = unsafeStatic(this.elementMap.get(ALIconDocument.el));
  private progressEl = unsafeStatic(this.elementMap.get(ALProgress.el));
  private buttonEl = unsafeStatic(this.elementMap.get(ALButton.el));

  static get styles() {
    return unsafeCSS(styles.toString());
  }

  /**
   * Unique ID of the field
   */
  @property()
  accessor fieldId: string;

  /**
   * Label for the form field
   */
  @property()
  accessor label: string;

  /**
   * Name attribute for the checkbox
   */
  @property()
  accessor name: string;

  /**
   * Value associated with the field
   */
  @property()
  accessor value: string;

  /**
   * Text for the field note
   */
  @property()
  accessor fieldNote: string;

  /**
   * Text for the error note
   */
  @property()
  accessor errorNote: string;

  /**
   * Aria described-by attribute
   * - Connects the field note in the select to the select menu for accessibility
   */
  @property()
  accessor ariaDescribedBy: string;

  /**
   * Indicates if the field is required
   */
  @property({ type: Boolean })
  accessor isRequired: boolean;

  /**
   * Indicates if the field is disabled
   */
  @property({ type: Boolean })
  accessor isDisabled: boolean;

  /**
   * Indicates if the field note is in error state
   */
  @property({ type: Boolean })
  accessor isError: boolean;

  /**
   * Dragging state for the field
   */
  @state()
  accessor isDragging: boolean;

  /**
   * Indicates if the label is hidden
   */
  @property({ type: Boolean })
  accessor hideLabel: boolean;

  /**
   * State containing files
   */
  @state()
  accessor filesState: filesStateConfig[];

  /**
   * Configuration for text messages in file upload
   * - Specifies error text for unsupported file formats and size exceeded messages
   */
  @property({ type: Object })
  accessor textConfig: FileUploadTextConfig = {
    fileFormatErrorText: defaultTextConfig.fileFormatErrorText,
    fileSizeErrorText: defaultTextConfig.fileSizeErrorText
  };

  /**
   * Files to be uploaded from the application
   * - Represents the status of the files
   */
  @property({ type: Array })
  accessor uploadFiles: FileUploadProgressStream[];

  /**
   * Time taken for uploading
   * - Defaults to 1 second
   */
  @property({ type: Number })
  accessor uploadTime: number = 1;

  /**
   * Maximum file size allowed for upload in MB
   */
  @property({ type: Number })
  accessor fileSizeLimit: number = 75;

  /**
   * Acceptable file types for upload
   * - Example: '.jpg, .png, .gif'
   */
  @property()
  accessor accept: string;

  /**
   * Allows multiple files to be added to the file upload
   */
  @property({ type: Boolean })
  accessor multiple: boolean;

  private validFileMimeType: string[];

  constructor() {
    super();
    this.handleOnDragOver = this.handleOnDragOver.bind(this);
    this.handleOnDragEnd = this.handleOnDragEnd.bind(this);
    this.handleOnFileChange = this.handleOnFileChange.bind(this);
    this.handleOnFileRemove = this.handleOnFileRemove.bind(this);
  }

  /**
   * Connected callback lifecycle
   * 1. Sets a unique field ID if not already assigned using nanoid().
   * 2. Checks and assigns a unique ariaDescribedBy ID if fieldNote is present and no ariaDescribedBy is specified.
   */
  connectedCallback() {
    super.connectedCallback();
    /* 1 */
    this.fieldId = this.fieldId || nanoid();
    /* 2 */
    if (this.fieldNote) {
      this.ariaDescribedBy = this.ariaDescribedBy || nanoid();
    }
  }

  /**
   * Updated lifecycle
   * 1. Iterates over the changed properties of the component after an update.
   * 2. Checks if the changed property is 'uploadFiles' and it has been modified.
   * 3. Creates a new array to update file states.
   * 4. Finds and updates the status and status text for each file in the file upload progress.
   * 5. Updates the component's file state with the modified file statuses.
   * @param changedProperties - A map of changed properties in the component after an update.
   */
  updated(changedProperties: Map<string, unknown>) {
    /* 1 */
    changedProperties.forEach((oldValue, propName) => {
      /* 2 */
      if (propName === 'uploadFiles' && this.uploadFiles !== oldValue) {
        /* 3 */
        const updateFiles = this.filesState;
        this.uploadFiles.forEach((file) => {
          /* 4 */
          const index = updateFiles.findIndex((f: any) => f.fieldId === file.fileId);
          if (index > -1) {
            updateFiles[index].status = file.status;
            updateFiles[index].statusText = file.statusText;
          }
        });
        /* 5 */
        this.filesState = [];
        this.filesState = updateFiles;
      }
    });
  }

  /**
   * Set file size
   * 1. If the user's operating system is Windows, calculate and return the file size in bytes (converted from megabytes).
   * 2. If the user's operating system is Mac or Linux, calculate and return the file size in bytes (converted from megabytes).
   * @param fileSize - The size of the file in megabytes.
   * @returns The size of the file in bytes.
   */
  setFileSize(fileSize: number) {
    if (navigator.appVersion.indexOf('Win') !== -1) {
      return fileSize * 1024 * 1024; /* 1 */
    } else if (navigator.appVersion.indexOf('Mac') !== -1 || navigator.appVersion.indexOf('Linux') !== -1) {
      return fileSize * 1000 * 1000; /* 2 */
    }
  }

  /**
   * Handle on drag over
   * 1. Prevent the default behavior for the drag event.
   * 2. Check if the dragging state is false, then set it to true to indicate the drag has ended.
   */
  handleOnDragOver(e: DragEvent) {
    /* 1 */
    e.preventDefault();
    /* 2 */
    if (!this.isDragging) {
      this.isDragging = true;
    }
  }

  /**
   * Handle on drag end
   * 1. Prevent the default behavior for the drag event.
   * 2. Check if the dragging state is true, then set it to false to indicate the drag has ended.
   */
  handleOnDragEnd(e: DragEvent) {
    /* 1 */
    e.preventDefault();
    /* 2 */
    if (this.isDragging) {
      this.isDragging = false;
    }
  }

  /**
   * Handle on file remove
   * 1. Filter out the files except the one being removed using its fieldId.
   * 2. If all files are removed, set 'filesState' to null.
   * 3. Dispatch an event to notify that files have been removed.
   */
  handleOnFileRemove(fieldId: string) {
    /* 1 */
    const files = this.filesState;
    const updatedFiles = files.filter((file: any) => file.fieldId !== fieldId);
    this.filesState = updatedFiles;
    /* 2 */
    if (updatedFiles.length === 0) {
      this.filesState = null;
    }
    /* 3 */
    this.dispatch({ eventName: 'onFileUploadFileRemove', detailObj: { updatedFiles } });
  }

  /**
   * Handle on file change
   * 1. Copy existing files from state to a new variable
   * 2. Append new files to this new array
   * 3. If there is a maxFiles limit and if the more files have been selected than the max, remove those over the limit from the array.
   * 4. Set new state with existing and newly selected files
   * 5. Transition 'Uploading' status to 'Success' after uploadTime
   */
  handleOnFileChange(e: any) {
    const fileObjects = e.dataTransfer?.files || e.target?.files;
    if (!fileObjects) return;

    /* 1 */
    const files = Array.apply(undefined, this.filesState);

    const uploadedFiles: any = [];

    this.validFileMimeType = this.accept?.split(',');

    /* 2 */
    Object.entries(fileObjects).forEach((file: any) => {
      let filesizerror = false;
      let fileformaterror = false;
      if (file[1].size > this.setFileSize(this.fileSizeLimit)) {
        filesizerror = true;
      }
      if (this.validFileMimeType?.length) {
        const fileMimeType = file[1].type;
        const fileMimeTypeRoot = fileMimeType.split('/')[0];
        const fileMimeTypeWildcard = fileMimeTypeRoot + '/*';
        if (this.validFileMimeType.indexOf(fileMimeType) === -1 && this.validFileMimeType.indexOf(fileMimeTypeWildcard) === -1) {
          fileformaterror = true;
        }
      }
      const fileObj = {
        fileObject: file,
        status: filesizerror || fileformaterror ? 'Failed' : 'Uploading',
        fieldId: nanoid(),
        statusText: '',
        fileSizeExceeded: filesizerror,
        fileFormatError: fileformaterror
      };

      uploadedFiles.push(fileObj);

      files.push(fileObj);
    });

    this.dispatch({ eventName: 'onFileUploadFileUpload', detailObj: { uploadedFiles } });
    this.filesState = files as filesStateConfig[];

    /* 5 */
    setTimeout(() => {
      const updatedFiles = this.filesState.map((file: any) => {
        if (file.status === 'Uploading') {
          return {
            ...file,
            status: 'Success'
          };
        }
        return file;
      });
      this.filesState = updatedFiles;
    }, this.uploadTime * 1000);
  }

  render() {
    const componentClassNames = this.componentClassNames('al-c-file-upload', {
      'al-is-dragging': this.isDragging === true,
      'al-is-error': this.isError === true,
      'al-is-disabled': this.isDisabled,
      'al-has-hidden-label': this.hideLabel
    });

    return html`
      <div class="${componentClassNames}">
        <label class="al-c-file-upload__label" for="${this.fieldId}">${this.label}</label>
        <div
          class="al-c-file-upload__body"
          @dragover=${this.handleOnDragOver}
          @dragend=${this.handleOnDragEnd}
          @dragleave=${this.handleOnDragEnd}
          @drop=${this.handleOnDragEnd}
        >
          <input
            class="al-c-file-upload__input"
            type="file"
            id="${this.fieldId}"
            @drop=${this.handleOnFileChange}
            @change=${this.handleOnFileChange}
            accept="${ifDefined(this.accept)}"
            name="${ifDefined(this.name)}"
            value="${ifDefined(this.value)}"
            ?required="${this.isRequired}"
            ?disabled="${this.isDisabled}"
            ?multiple="${this.multiple}"
            aria-describedby="${ifDefined(this.ariaDescribedBy)}"
            aria-invalid="false"
          />
          <slot></slot>
          ${this.fieldNote || this.slotNotEmpty('field-note')
            ? html`
                <slot name="field-note">
                  <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} id=${ifDefined(this.ariaDescribedBy)}> ${this.fieldNote} </${this.fieldNoteEl}>
                </slot>
              `
            : html``}
          ${(this.errorNote || this.slotNotEmpty('error')) && this.isError
            ? html`
                <slot name="error">
                  <${this.fieldNoteEl} ?isDisabled=${this.isDisabled} ?isError=${true}> ${this.errorNote} </${this.fieldNoteEl}>
                </slot>
              `
            : html``}
        </div>
        <ul class="al-c-file-upload__list">
          ${this.filesState?.map(
            (file: any) => html`
            <li class="al-c-file-upload__item">
              <div class="al-c-file-upload__item-body">
                <div class="al-c-file-upload__item-first">
                  <${this.iconDocumentEl} class="al-c-file-upload__icon"></${this.iconDocumentEl}>
                  <span class="al-c-file-upload__item-text">${file.fileObject[1].name}</span>
                </div>
                <div class="al-c-file-upload__item-second">
                  ${
                    file.status === 'Success'
                      ? html`
                        <div class="al-c-file-upload__status">
                          <${this.iconDoneEl}></${this.iconDoneEl}>
                        </div>
                      `
                      : ''
                  }
                  ${
                    file.status === 'Failed'
                      ? html`
                        <div class="al-c-file-upload__status">
                          <${this.iconWarningEl}></${this.iconWarningEl}>
                        </div>
                      `
                      : ''
                  }
                  <${this.buttonEl}
                    class="al-c-file-upload__close-button"
                    variant="tertiary"
                    ?hideText=${true}
                    type="button"
                    @click=${() => this.handleOnFileRemove(file.fieldId)}
                  >
                    Delete
                    <${this.iconCloseEl} slot="after"></${this.iconCloseEl}>
                  </${this.buttonEl}>
                </div>
              </div>
              ${
                file.status === 'Uploading'
                  ? html`
                    <div class="al-c-file-upload__status-uploading">
                      <${this.progressEl} duration=${this.uploadTime}></${this.progressEl}>
                    </div>
                  `
                  : ''
              }
              ${
                file.status === 'Failed' && file.fileSizeExceeded && !file.fileFormatError
                  ? html`
                    <${this.fieldNoteEl} ?isError=${true} class="al-c-file-upload__status-text">
                      ${this.textConfig.fileSizeErrorText}
                    </${this.fieldNoteEl}>
                  `
                  : ''
              }
              ${
                file.status === 'Failed' && file.fileFormatError
                  ? html`
                    <${this.fieldNoteEl} ?isError=${true} class="al-c-file-upload__status-text">
                      ${this.textConfig.fileFormatErrorText}
                    </${this.fieldNoteEl}>
                  `
                  : ''
              }
              ${
                file.status === 'Failed' && file.statusText
                  ? html`
                    <${this.fieldNoteEl} ?isError=${true} class="al-c-file-upload__status-text">
                      ${file.statusText}
                    </${this.fieldNoteEl}>
                  `
                  : ''
              }
            </li>
          `
          )}
        </ul>
      </div>
    ` as TemplateResult<1>;
  }
}

if ((globalThis as any).alAutoRegistry === true && customElements.get(ALFileUpload.el) === undefined) {
  customElements.define(ALFileUpload.el, ALFileUpload);
}

declare global {
  interface HTMLElementTagNameMap {
    'al-file-upload': ALFileUpload;
  }
}
