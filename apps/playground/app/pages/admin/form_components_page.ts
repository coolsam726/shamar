import {
  FormPage,
  form,
  Tabs,
  Tab,
  Section,
  Grid,
  Fieldset,
  Callout,
  TextInput,
  Textarea,
  Select,
  Toggle,
  Checkbox,
  Radio,
  CheckboxList,
  DatePicker,
  DateTimePicker,
  TimePicker,
  WeekPicker,
  MonthPicker,
  FilePicker,
  FileUpload,
  RichEditor,
  MarkdownEditor,
  CodeEditor,
  TagsInput,
  ColorPicker,
  KeyValue,
  Repeater,
  Slider,
  Rating,
  ToggleButtons,
  type PageRequestContext,
  type PageSaveResult,
} from '@shamar/core'

/**
 * Single-page gallery of form field types — used for docs screenshots and QA.
 * Visit `/demo/form-components`. Changes are not persisted.
 */
export default class FormComponentsPage extends FormPage {
  static override slug = 'form-components'
  static override label = 'Form components'
  static override navigationGroup = 'Developer'
  /** Sidebar order within Developer. */
  static override navigationSort = 1
  static override icon = 'rectangle-stack'

  static override form() {
    return form((f) => {
      f.schema([
        Callout.make('Docs gallery')
          .info()
          .description(
            'Every Shamar form field on one page. Used for reference docs screenshots — save is a no-op.',
          )
          .columnSpanFull(),
        Tabs.make()
          .columnSpanFull()
          .tabs([
            Tab.make('Fields')
              .icon('squares-2x2')
              .schema([
                Section.make('Text & selection')
                  .columns(2)
                  .schema([
                    TextInput.make('textInput')
                      .label('Text input')
                      .placeholder('Product name')
                      .helperText('Single-line text, email, URL, currency, etc.'),
                    Textarea.make('textarea')
                      .label('Textarea')
                      .rows(3)
                      .placeholder('Multi-line notes…')
                      .columnSpanFull(),
                    Select.make('select')
                      .label('Select')
                      .options([
                        { label: 'Draft', value: 'draft' },
                        { label: 'Published', value: 'published' },
                        { label: 'Archived', value: 'archived' },
                      ])
                      .helperText('Static combobox with search.'),
                    TagsInput.make('tagsInput')
                      .label('Tags input')
                      .helperText('Press Enter to add a tag.'),
                    Toggle.make('toggle').label('Toggle').inline().helperText('Boolean switch.'),
                    Checkbox.make('checkbox')
                      .label('Checkbox')
                      .helperText('Single boolean checkbox.'),
                    Radio.make('radio')
                      .label('Radio')
                      .options([
                        { label: 'New', value: 'new' },
                        { label: 'Refurbished', value: 'refurbished' },
                      ])
                      .inline()
                      .helperText('Classic radio list.'),
                    CheckboxList.make('checkboxList')
                      .label('Checkbox list')
                      .options([
                        { label: 'Online', value: 'online' },
                        { label: 'Retail', value: 'retail' },
                        { label: 'Wholesale', value: 'wholesale' },
                      ])
                      .checkboxColumns(3)
                      .columnSpanFull(),
                    ToggleButtons.make('toggleButtons')
                      .label('Toggle buttons')
                      .options([
                        { label: 'S', value: 's' },
                        { label: 'M', value: 'm' },
                        { label: 'L', value: 'l' },
                        { label: 'XL', value: 'xl' },
                      ])
                      .grouped(false),
                    ColorPicker.make('colorPicker').label('Color picker'),
                    Slider.make('slider')
                      .label('Slider')
                      .min(0)
                      .max(100)
                      .step(5)
                      .showValue(),
                    Rating.make('rating').label('Rating').allowZero(),
                  ]),
                Section.make('Dates & times')
                  .columns(2)
                  .schema([
                    DatePicker.make('datePicker').label('Date picker'),
                    DateTimePicker.make('dateTimePicker')
                      .label('Date time picker')
                      .seconds(),
                    TimePicker.make('timePicker').label('Time picker').hours12(),
                    WeekPicker.make('weekPicker').label('Week picker'),
                    MonthPicker.make('monthPicker').label('Month picker'),
                  ]),
                Section.make('Files')
                  .columns(2)
                  .schema([
                    FilePicker.make('filePicker')
                      .label('Image file picker')
                      .image()
                      .helperText('Compact image layout with placeholder.'),
                    FilePicker.make('filePickerGeneric')
                      .label('Generic file picker')
                      .helperText('Any file type — compact layout like the image picker.'),
                    FileUpload.make('fileUpload')
                      .label('File upload')
                      .accept('image/*,.pdf')
                      .helperText('Native file input.'),
                  ]),
                Section.make('Rich & structured')
                  .schema([
                    RichEditor.make('richEditor')
                      .label('Rich editor (simple)')
                      .simple()
                      .columnSpanFull(),
                    RichEditor.make('richEditorNotion')
                      .label('Rich editor (notion)')
                      .notion()
                      .columnSpanFull(),
                    RichEditor.make('richEditorDocument')
                      .label('Rich editor (document)')
                      .document()
                      .columnSpanFull(),
                    MarkdownEditor.make('markdownEditor')
                      .label('Markdown editor')
                      .columnSpanFull(),
                    CodeEditor.make('codeEditor')
                      .label('Code editor')
                      .language('json')
                      .columnSpanFull(),
                    KeyValue.make('keyValue')
                      .label('Key value')
                      .keyLabel('Key')
                      .valueLabel('Value')
                      .columnSpanFull(),
                    Repeater.make('repeater')
                      .label('Repeater')
                      .itemLabel('Row')
                      .schema([
                        TextInput.make('label').label('Label').required(),
                        TextInput.make('value').label('Value'),
                      ])
                      .defaultItems(1)
                      .columnSpanFull(),
                  ]),
              ]),
            Tab.make('Layouts')
              .icon('view-columns')
              .schema([
                Section.make('Grid & fieldset')
                  .schema([
                    Grid.make(2)
                      .columnSpanFull()
                      .schema([
                        TextInput.make('gridA').label('Grid column A'),
                        TextInput.make('gridB').label('Grid column B'),
                      ]),
                    Fieldset.make('Grouped fields')
                      .schema([
                        TextInput.make('fieldsetA').label('Inside fieldset'),
                        Toggle.make('fieldsetToggle').label('Nested toggle').inline(),
                      ])
                      .columnSpanFull(),
                  ]),
              ]),
          ]),
      ])
    })
  }

  static override async fill(_ctx: PageRequestContext) {
    return {
      textInput: 'Trail running shoe',
      textarea: 'Internal notes for the docs gallery.',
      select: 'published',
      tagsInput: ['demo', 'gallery'],
      toggle: true,
      checkbox: true,
      radio: 'new',
      checkboxList: ['online', 'retail'],
      toggleButtons: 'm',
      colorPicker: '#f1511b',
      slider: 75,
      rating: 4,
      datePicker: '2026-03-15',
      dateTimePicker: '2026-03-15T09:30:00',
      timePicker: '14:30:00',
      weekPicker: '2026-W12',
      monthPicker: '2026-03',
      filePicker: '',
      filePickerGeneric: '',
      fileUpload: '',
      richEditor: '<p>Rich text <strong>content</strong> (simple mode).</p>',
      richEditorNotion: '<p>Notion-style <em>editor</em> demo.</p>',
      richEditorDocument: '<p>Document-style editor demo.</p>',
      markdownEditor: '## Markdown\n\nGallery demo body.',
      codeEditor: '{\n  "theme": "light"\n}',
      keyValue: { sku: 'DEMO-001', region: 'EU' },
      repeater: [{ label: 'Default', value: '1' }],
      gridA: 'Left',
      gridB: 'Right',
      fieldsetA: 'Grouped value',
      fieldsetToggle: false,
    }
  }

  static override async save(
    _data: Record<string, unknown>,
    _ctx: PageRequestContext,
  ): Promise<PageSaveResult> {
    return { message: 'Demo only — form component gallery is not persisted.' }
  }
}
