import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { DeliveryService } from '../../services/delivery.service';
import { Area, DeliveryType, PlatformDelivery } from '../../models/platform-delivery.model';

interface AreaAgg { area: Area; enTiempo: number; fueraTiempo: number; }
interface TypeAgg { tipo: DeliveryType; total: number; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatDatepickerModule, MatNativeDateModule, MatInputModule],
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent {
  private service = inject(DeliveryService);

  areas: Area[] = this.service.getAreas();
  selectedAreaSet = signal<Set<Area>>(new Set<Area>(this.areas));
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  all = signal<PlatformDelivery[]>([]);
  filtered = signal<PlatformDelivery[]>([]);

  kpi = signal({ entregadas: 0, enTiempo: 0, fueraTiempo: 0 });
  areaAgg = signal<AreaAgg[]>([]);
  typeAgg = signal<TypeAgg[]>([]);

  readonly maxBars = signal(1);
  readonly circumference = 2 * Math.PI * 90; // r=90

  constructor() {
    this.service.getAll().subscribe((rows) => {
      this.all.set(rows);
      this.applyFilters();
    });
  }

  trackArea = (_: number, r: AreaAgg) => r.area;

  selectAll() {
    this.selectedAreaSet.set(new Set(this.areas));
    this.applyFilters();
  }
  clearAreas() {
    this.selectedAreaSet.set(new Set());
    this.applyFilters();
  }
  toggleArea(a: Area, on: boolean) {
    const next = new Set(this.selectedAreaSet());
    if (on) next.add(a); else next.delete(a);
    this.selectedAreaSet.set(next);
    this.applyFilters();
  }

  applyFilters() {
    const areas = this.selectedAreaSet();
    const from = this.dateFrom ?? undefined;
    const to = this.dateTo ?? undefined;

    let rows = this.all();
    if (areas.size > 0) rows = rows.filter(r => areas.has(r.area));
    if (from) rows = rows.filter(r => new Date(r.fechaSolicitud) >= from);
    if (to) rows = rows.filter(r => new Date(r.fechaSolicitud) <= to);

    this.filtered.set(rows);

    // KPIs
    let entregadas = 0, enTiempo = 0, fueraTiempo = 0;
    const now = new Date();
    for (const r of rows) {
      if (r.status === 'Entregada') entregadas++;
      else {
        const comp = new Date(r.fechaCompromiso!);
        if (now <= comp) enTiempo++; else fueraTiempo++;
      }
    }
    this.kpi.set({ entregadas, enTiempo, fueraTiempo });

    // Area aggregation (only en proceso)
    const aggMap = new Map<Area, AreaAgg>();
    const baseAreas: Area[] = (areas.size > 0 ? Array.from(areas) : this.areas);
    baseAreas.forEach(a => aggMap.set(a, { area: a, enTiempo: 0, fueraTiempo: 0 }));
    for (const r of rows) {
      if (r.status !== 'En proceso') continue;
      const comp = new Date(r.fechaCompromiso!);
      const bucket = aggMap.get(r.area)!;
      if (now <= comp) bucket.enTiempo++; else bucket.fueraTiempo++;
    }
    const areaArr = Array.from(aggMap.values());
    const max = Math.max(1, ...areaArr.map(x => Math.max(x.enTiempo, x.fueraTiempo)));
    this.maxBars.set(max);
    this.areaAgg.set(areaArr);

    // Type distribution
    const colorMap: Record<DeliveryType, string> = {
      'Manual': 'var(--cso-orange-a)',
      'Semi-digital': 'var(--cso-orange-b)',
      'Full-digital': 'var(--cso-primary)'
    };
    const tMap = new Map<DeliveryType, TypeAgg>();
    for (const t of ['Manual','Semi-digital','Full-digital'] as DeliveryType[]) {
      tMap.set(t, { tipo: t, total: 0, color: colorMap[t] });
    }
    for (const r of rows) {
      const b = tMap.get(r.tipo)!; b.total++;
    }
    this.typeAgg.set(Array.from(tMap.values()));
  }

  barHeight(value: number): number {
    const max = this.maxBars();
    return Math.round((value / max) * 100);
  }

  tooltip(r: AreaAgg, label: 'En tiempo' | 'Fuera de tiempo'): string {
    const total = r.enTiempo + r.fueraTiempo;
    const value = label === 'En tiempo' ? r.enTiempo : r.fueraTiempo;
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `${r.area}: ${label} ${value} (${pct}%)`;
  }

  totalFiltered() { return this.filtered().length; }
  percent(v: number, total: number): string { return total ? Math.round((v/total)*100) + '%' : '0%'; }

  donutSets() {
    const total = this.totalFiltered() || 1;
    let offset = 0;
    return this.typeAgg().map((t) => {
      const len = (t.total / total) * this.circumference;
      const seg = { len, offset, color: t.color } as any;
      offset -= len;
      return seg;
    });
  }
}
