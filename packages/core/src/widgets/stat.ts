export type StatColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';

export interface StatData {
  label: string;
  value: string | number;
  description?: string;
  descriptionIcon?: string;
  descriptionIconPosition?: 'before' | 'after';
  color?: StatColor;
  url?: string;
  /** Sparkline values rendered under the stat. */
  chart?: number[];
}

/**
 * Filament-style stat card descriptor for {@link StatsOverviewWidget}.
 */
export class Stat {
  private readonly data: StatData;

  private constructor(label: string, value: string | number) {
    this.data = { label, value };
  }

  static make(label: string, value: string | number): Stat {
    return new Stat(label, value);
  }

  description(text: string): this {
    this.data.description = text;
    return this;
  }

  descriptionIcon(icon: string, position: 'before' | 'after' = 'after'): this {
    this.data.descriptionIcon = icon;
    this.data.descriptionIconPosition = position;
    return this;
  }

  color(color: StatColor): this {
    this.data.color = color;
    return this;
  }

  url(href: string): this {
    this.data.url = href;
    return this;
  }

  chart(values: number[]): this {
    this.data.chart = values;
    return this;
  }

  toJSON(): StatData {
    return { ...this.data };
  }
}
