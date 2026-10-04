export type StatColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';

/** Trusted HTML fragment (Filament `Htmlable`). */
export type HtmlContent = { html: string };

export function html(content: string): HtmlContent {
  return { html: content };
}

export function isHtmlContent(value: unknown): value is HtmlContent {
  return (
    !!value &&
    typeof value === 'object' &&
    'html' in value &&
    typeof (value as HtmlContent).html === 'string'
  );
}

export type StatScalar = string | number | null | undefined;

export interface StatData {
  label: string;
  labelHtml?: string;
  value: string | number;
  valueHtml?: string;
  description?: string;
  descriptionHtml?: string;
  descriptionIcon?: string;
  descriptionIconPosition?: 'before' | 'after';
  descriptionColor?: StatColor;
  color?: StatColor;
  icon?: string;
  url?: string;
  openUrlInNewTab?: boolean;
  /** Sparkline values rendered under the stat. */
  chart?: number[];
  chartColor?: StatColor;
  placeholder?: string;
  extraAttributes?: Record<string, string>;
  /** Pre-escaped HTML attribute string for Edge (built at serialize time). */
  extraAttributesHtml?: string;
  /** Cards this stat spans inside the overview grid (Filament Schema columnSpan). */
  columnSpan?: number;
}

export type StatConfigurator = (stat: Stat) => void;

const configurators: StatConfigurator[] = [];

function isBlank(value: StatScalar): boolean {
  return value == null || value === '';
}

/**
 * Filament-style stat card descriptor for {@link StatsOverviewWidget}.
 */
export class Stat {
  private readonly data: StatData;
  private rawValue: StatScalar | HtmlContent;
  private placeholderText?: string;

  private constructor(label: string | HtmlContent, value: StatScalar | HtmlContent) {
    if (isHtmlContent(label)) {
      this.data = { label: '', labelHtml: label.html, value: '' };
    } else {
      this.data = { label: String(label), value: '' };
    }
    this.rawValue = value;
    this.applyValue(value);
  }

  static make(label: string | HtmlContent, value: StatScalar | HtmlContent = null): Stat {
    const stat = new Stat(label, value);
    for (const configure of configurators) configure(stat);
    return stat;
  }

  /** Filament `Stat::configureUsing()` — runs on every {@link Stat.make}. */
  static configureUsing(callback: StatConfigurator): void {
    configurators.push(callback);
  }

  /** Test helper — clears global configurators. */
  static clearConfigureUsing(): void {
    configurators.length = 0;
  }

  description(text: string | HtmlContent): this {
    if (isHtmlContent(text)) {
      this.data.descriptionHtml = text.html;
      this.data.description = undefined;
    } else {
      this.data.description = text;
      this.data.descriptionHtml = undefined;
    }
    return this;
  }

  descriptionIcon(icon: string, position: 'before' | 'after' = 'after'): this {
    this.data.descriptionIcon = icon;
    this.data.descriptionIconPosition = position;
    return this;
  }

  descriptionColor(color: StatColor): this {
    this.data.descriptionColor = color;
    return this;
  }

  color(color: StatColor): this {
    this.data.color = color;
    return this;
  }

  icon(icon: string): this {
    this.data.icon = icon;
    return this;
  }

  url(href: string): this {
    this.data.url = href;
    return this;
  }

  openUrlInNewTab(value = true): this {
    this.data.openUrlInNewTab = value;
    return this;
  }

  chart(values: number[] | null | undefined): this {
    if (values == null) return this;
    this.data.chart = values;
    return this;
  }

  chartColor(color: StatColor): this {
    this.data.chartColor = color;
    return this;
  }

  placeholder(text: string): this {
    this.placeholderText = text;
    this.data.placeholder = text;
    this.applyValue(this.rawValue);
    return this;
  }

  extraAttributes(attrs: Record<string, string>, options?: { merge?: boolean }): this {
    this.data.extraAttributes = options?.merge
      ? { ...this.data.extraAttributes, ...attrs }
      : { ...attrs };
    return this;
  }

  columnSpan(span: number): this {
    this.data.columnSpan = Math.max(1, Math.floor(span));
    return this;
  }

  value(next: StatScalar | HtmlContent): this {
    this.rawValue = next;
    this.applyValue(next);
    return this;
  }

  private applyValue(value: StatScalar | HtmlContent): void {
    if (isHtmlContent(value)) {
      this.data.valueHtml = value.html;
      this.data.value = '';
      return;
    }
    this.data.valueHtml = undefined;
    if (isBlank(value)) {
      this.data.value = this.placeholderText ?? '';
      return;
    }
    this.data.value = value as string | number;
  }

  toJSON(): StatData {
    const out: StatData = {
      label: this.data.label,
      value: this.data.value,
    };
    const copy = <K extends keyof StatData>(key: K) => {
      const value = this.data[key];
      if (value !== undefined) out[key] = value as StatData[K];
    };
    copy('labelHtml');
    copy('valueHtml');
    copy('description');
    copy('descriptionHtml');
    copy('descriptionIcon');
    copy('descriptionIconPosition');
    copy('descriptionColor');
    copy('color');
    copy('icon');
    copy('url');
    copy('openUrlInNewTab');
    copy('chartColor');
    copy('placeholder');
    copy('columnSpan');
    if (this.data.extraAttributes) out.extraAttributes = { ...this.data.extraAttributes };
    if (this.data.chart) out.chart = [...this.data.chart];
    return out;
  }
}
