import { Injectable, computed, signal } from '@angular/core';
import { Area, DeliveryType, PlatformDelivery } from '../../models/platform-delivery.model';
import { DeliveryService } from '../../services/delivery.service';

interface AreaAgg { area: Area; enTiempo: number; fueraTiempo: number; }
interface TypeAgg { tipo: DeliveryType; total: number; color: string; }

@Injectable()
export class DashboardStore {
  // Static data
  readonly areas: Area[];
  readonly types: DeliveryType[];

  // Filters/state
  readonly selectedAreaSet = signal<Set<Area>>(new Set<Area>());
  readonly selectedTypeSet = signal<Set<DeliveryType>>(new Set<DeliveryType>());
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly showTimeDetails = signal<string | null>(null);

  // Data
  readonly all = signal<PlatformDelivery[]>([]);

  // Derived
  readonly filtered = computed<PlatformDelivery[]>(() => {
    const rows = this.all();
    const areas = this.selectedAreaSet();
    const types = this.selectedTypeSet();
    const from = this.dateFrom();
    const to = this.dateTo();
    return rows
      .filter(r => areas.size === 0 || areas.has(r.area))
      .filter(r => types.size === 0 || types.has(r.tipo))
      .filter(r => !from || new Date(r.fechaSolicitud) >= from)
      .filter(r => !to || new Date(r.fechaSolicitud) <= to);
  });

  readonly kpi = computed(() => {
    const rows = this.filtered();
    let entregadas = 0, enTiempo = 0, fueraTiempo = 0;
    const now = new Date();
    for (const r of rows) {
      if (r.status === 'Entregada') entregadas++;
      else {
        const comp = new Date(r.fechaCompromiso!);
        if (now <= comp) enTiempo++; else fueraTiempo++;
      }
    }
    return { entregadas, enTiempo, fueraTiempo };
  });

  readonly areaAgg = computed<AreaAgg[]>(() => {
    const rows = this.filtered();
    const now = new Date();
    const result = new Map<Area, AreaAgg>();
    // Seed with selected or all areas to keep consistent ordering
    const baseAreas = (this.selectedAreaSet().size > 0 ? Array.from(this.selectedAreaSet()) : this.areas);
    baseAreas.forEach(a => result.set(a, { area: a, enTiempo: 0, fueraTiempo: 0 }));
    for (const r of rows) {
      if (r.status !== 'En proceso') continue;
      const comp = new Date(r.fechaCompromiso!);
      const bucket = result.get(r.area)!;
      if (now <= comp) bucket.enTiempo++; else bucket.fueraTiempo++;
    }
    return Array.from(result.values());
  });

  readonly typeAgg = computed<TypeAgg[]>(() => {
    const rows = this.filtered();
    const colorMap: Record<DeliveryType, string> = {
      'Manual': 'var(--cso-orange-a)',
      'Semi-digital': 'var(--cso-orange-b)',
      'Full-digital': 'var(--cso-primary)'
    };
    const totals = new Map<DeliveryType, number>([
      ['Manual', 0], ['Semi-digital', 0], ['Full-digital', 0]
    ]);
    for (const r of rows) totals.set(r.tipo, (totals.get(r.tipo) || 0) + 1);
    return (['Manual','Semi-digital','Full-digital'] as DeliveryType[])
      .map(t => ({ tipo: t, total: totals.get(t)!, color: colorMap[t] }));
  });

  readonly maxBars = computed(() => {
    const arr = this.areaAgg();
    return Math.max(1, ...arr.map(x => Math.max(x.enTiempo, x.fueraTiempo)));
  });

  readonly circumference = 2 * Math.PI * 90; // r=90

  readonly totalFiltered = computed(() => this.filtered().length);

  readonly donutSets = computed(() => {
    const total = this.totalFiltered() || 1;
    let offset = 0;
    return this.typeAgg().map((t) => {
      const len = (t.total / total) * this.circumference;
      const seg = { len, offset, color: t.color } as any;
      offset -= len;
      return seg;
    });
  });

  readonly detailDisplayedColumns = computed<string[]>(() => {
    const view = this.showTimeDetails();
    if (view === 'Entregadas') {
      return ['id','nombrePlataforma','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','observaciones'];
    }
    if (view === 'En proceso y en tiempo' || view === 'En proceso y fuera de tiempo') {
      return ['id','nombrePlataforma','area','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','status','observaciones'];
    }
    return [];
  });

  readonly detailRows = computed<PlatformDelivery[]>(() => {
    const base = this.filtered();
    const view = this.showTimeDetails();
    if (view === 'Entregadas') return base.filter(r => r.status === 'Entregada');
    if (view === 'En proceso y en tiempo') return base.filter(r => this.isOnTime(r));
    if (view === 'En proceso y fuera de tiempo') return base.filter(r => this.isLate(r));
    return [];
  });

  constructor(private readonly deliveryService: DeliveryService) {
    this.areas = this.deliveryService.getAreas();
    this.types = this.deliveryService.getTypes();
    this.selectedAreaSet.set(new Set(this.areas));
    this.selectedTypeSet.set(new Set(this.types));
  }

  setAll(rows: PlatformDelivery[]) {
    this.all.set(rows);
  }

  // Filters API
  selectAllAreas() { this.selectedAreaSet.set(new Set(this.areas)); }
  clearAreas() { this.selectedAreaSet.set(new Set()); }
  toggleArea(a: Area, on: boolean) {
    const next = new Set(this.selectedAreaSet());
    if (on) next.add(a); else next.delete(a);
    this.selectedAreaSet.set(next);
  }

  selectAllTypes() { this.selectedTypeSet.set(new Set(this.types)); }
  clearTypes() { this.selectedTypeSet.set(new Set()); }
  toggleType(t: DeliveryType, on: boolean) {
    const next = new Set(this.selectedTypeSet());
    if (on) next.add(t); else next.delete(t);
    this.selectedTypeSet.set(next);
  }

  setDateRange(from: Date | null, to: Date | null) {
    this.dateFrom.set(from);
    this.dateTo.set(to);
  }
  resetDate() { this.setDateRange(null, null); }

  // View controls
  updateDetails(time: string) {
    this.showTimeDetails.set(this.showTimeDetails() === time ? null : time);
  }
  closeDetails() { this.showTimeDetails.set(null); }

  // Helpers
  isOnTime(d: PlatformDelivery): boolean {
    if (d.status !== 'En proceso' || !d.fechaCompromiso) return false;
    return new Date(d.fechaCompromiso) >= new Date();
    }
  isLate(d: PlatformDelivery): boolean {
    if (d.status !== 'En proceso' || !d.fechaCompromiso) return false;
    return new Date(d.fechaCompromiso) < new Date();
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
  percent(v: number, total: number): string { return total ? Math.round((v/total)*100) + '%' : '0%'; }
}

