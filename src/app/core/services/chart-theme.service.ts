import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Chart } from 'chart.js';
import { ThemeService } from './theme.service';

export interface ChartPalette {
  series: string[];
  text: string;
  muted: string;
  grid: string;
  surface: string;
  border: string;
  font: string;
}

/** Reads the --pm-chart-* tokens so charts follow the active theme. */
@Injectable({ providedIn: 'root' })
export class ChartThemeService {
  /** Emits on every theme change; pages re-create their charts with the new palette. */
  readonly changes$;

  constructor(@Inject(DOCUMENT) private document: Document, theme: ThemeService) {
    this.changes$ = theme.theme$;
  }

  palette(): ChartPalette {
    const style = this.document.defaultView?.getComputedStyle(this.document.documentElement);
    const read = (name: string, fallback: string) => style?.getPropertyValue(`--pm-${name}`).trim() || fallback;
    return {
      series: [1, 2, 3, 4, 5, 6].map((i, idx) => read(`chart-${i}`, ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#0891b2'][idx])),
      text: read('text', '#0f172a'),
      muted: read('text-muted', '#475569'),
      grid: read('chart-grid', 'rgba(15, 23, 42, .08)'),
      surface: read('surface-raised', '#ffffff'),
      border: read('border', '#e2e8f0'),
      font: read('font-sans', 'Inter, sans-serif')
    };
  }

  /** Applies theme colours to Chart.js' global defaults; call before creating charts. */
  // Type-only import: chart.js stays in the lazy chunks of the pages that draw charts.
  applyDefaults(chart: Pick<typeof Chart, 'defaults'>): ChartPalette {
    const p = this.palette();
    const d = chart.defaults;
    d.color = p.muted;
    d.borderColor = p.grid;
    d.font.family = p.font;
    Object.assign(d.plugins.tooltip, {
      backgroundColor: p.surface,
      titleColor: p.text,
      bodyColor: p.text,
      borderColor: p.border,
      borderWidth: 1
    });
    d.plugins.legend.labels.color = p.muted;
    return p;
  }
}
