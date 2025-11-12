import { Component, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DeliveryService } from '../../services/delivery.service';
import { Area, DeliveryType, PlatformDelivery } from '../../models/platform-delivery.model';

interface AreaAgg { area: Area; enTiempo: number; fueraTiempo: number; }
interface TypeAgg { tipo: DeliveryType; total: number; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatDatepickerModule, MatNativeDateModule, MatInputModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements AfterViewInit {
  private service = inject(DeliveryService);

  areas: Area[] = this.service.getAreas();
  selectedAreaSet = signal<Set<Area>>(new Set<Area>(this.areas));
  types: DeliveryType[] = this.service.getTypes();
  selectedTypeSet = signal<Set<DeliveryType>>(new Set<DeliveryType>(this.types));
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  all = signal<PlatformDelivery[]>([]);
  filtered = signal<PlatformDelivery[]>([]);
  dataSource = new MatTableDataSource<PlatformDelivery>([]);
  detailDisplayedColumns = signal<string[]>(['id','nombrePlataforma','area','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','status','observaciones']);

  private _paginator?: MatPaginator;
  private _sort?: MatSort;

  @ViewChild(MatPaginator)
  set paginator(p: MatPaginator | undefined) {
    this._paginator = p;
    if (p) {
      this.dataSource.paginator = p;
      // Resetea a la primera página al re-vincular
      p.firstPage();
    }
  }

  @ViewChild(MatSort)
  set sort(s: MatSort | undefined) {
    this._sort = s;
    if (s) {
      this.dataSource.sort = s;
      this.dataSource.sort.active = 'id' as any;
      this.dataSource.sort.direction = 'asc';
    }
  }

  kpi = signal({ entregadas: 0, enTiempo: 0, fueraTiempo: 0 });
  areaAgg = signal<AreaAgg[]>([]);
  typeAgg = signal<TypeAgg[]>([]);

  showTimeDetails: string | null  = null;
  readonly maxBars = signal(1);
  readonly circumference = 2 * Math.PI * 90; // r=90

  constructor() {
    this.service.getAll().subscribe((rows) => {
      this.all.set(rows);
      this.applyFilters();
    });
  }

  ngAfterViewInit(): void {
    // sortingDataAccessor para tratar números y fechas correctamente
    this.dataSource.sortingDataAccessor = (item: PlatformDelivery, property: string): any => {
      switch (property) {
        case 'id':
          return Number(item.id) || 0;
        case 'fechaSolicitud':
          return item.fechaSolicitud ? new Date(item.fechaSolicitud).getTime() : 0;
        case 'fechaCompromiso':
          return item.fechaCompromiso ? new Date(item.fechaCompromiso).getTime() : 0;
        case 'fechaEntrega':
          return item.fechaEntrega ? new Date(item.fechaEntrega).getTime() : 0;
        case 'area':
          return (item.area || '').toString().toLowerCase();
        case 'tipo':
          return (item.tipo || '').toString().toLowerCase();
        case 'status':
          return (item.status || '').toString().toLowerCase();
        case 'nombrePlataforma':
          return (item.nombrePlataforma || '').toString().toLowerCase();
        case 'observaciones':
          return (item.observaciones || '').toString().toLowerCase();
        default:
          return (item as any)[property];
      }
    };
  }

  trackArea = (_: number, r: AreaAgg) => r.area;
  colorMapArea = [
    { tipo: 'En tiempo', color: 'var(--cso-primary)' },
    { tipo: 'Fuera de tiempo', color: 'var(--cso-orange-a)' }
  ];

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

  selectAllTypes() {
    this.selectedTypeSet.set(new Set(this.types));
    this.applyFilters();
  }
  clearTypes() {
    this.selectedTypeSet.set(new Set());
    this.applyFilters();
  }
  toggleType(t: DeliveryType, on: boolean) {
    const next = new Set(this.selectedTypeSet());
    if (on) next.add(t); else next.delete(t);
    this.selectedTypeSet.set(next);
    this.applyFilters();
  }

  applyFilters() {
    const areas = this.selectedAreaSet();
    const types = this.selectedTypeSet();
    const from = this.dateFrom ?? undefined;
    const to = this.dateTo ?? undefined;

    let rows = this.all();
    if (areas.size > 0) rows = rows.filter(r => areas.has(r.area));
    if (types.size > 0) rows = rows.filter(r => types.has(r.tipo));
    if (from) rows = rows.filter(r => new Date(r.fechaSolicitud) >= from);
    if (to) rows = rows.filter(r => new Date(r.fechaSolicitud) <= to);

    this.filtered.set(rows);
    this.updateDetailTable();

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
  resetDate() {
    this.dateFrom = null;
    this.dateTo = null;
    this.applyFilters();
  }
  updateDetails(time: string): void {
    if (this.showTimeDetails === time) {
      this.showTimeDetails = null;
    } else {
      this.showTimeDetails = time;
    }
    this.updateDetailTable();
  }
  closeDetails():void{
    this.showTimeDetails = null;
    this.updateDetailTable();
  }
  now = new Date();

  isOnTime(delivery: PlatformDelivery): boolean {
    if (delivery.status !== 'En proceso' || !delivery.fechaCompromiso) return false;
    return new Date(delivery.fechaCompromiso) >= this.now;
  }

  isLate(delivery: PlatformDelivery): boolean {
    if (delivery.status !== 'En proceso' || !delivery.fechaCompromiso) return false;
    return new Date(delivery.fechaCompromiso) < this.now;
  }

  private updateDetailTable(): void {
    const base = this.filtered();
    let rows: PlatformDelivery[] = base;
    const view = this.showTimeDetails;

    if (view === 'Entregadas') {
      rows = base.filter(r => r.status === 'Entregada');
      this.detailDisplayedColumns.set(['id','nombrePlataforma','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','observaciones']);
    } else if (view === 'En proceso y en tiempo') {
      rows = base.filter(r => this.isOnTime(r));
      this.detailDisplayedColumns.set(['id','nombrePlataforma','area','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','status','observaciones']);
    } else if (view === 'En proceso y fuera de tiempo') {
      rows = base.filter(r => this.isLate(r));
      this.detailDisplayedColumns.set(['id','nombrePlataforma','area','tipo','fechaSolicitud','fechaCompromiso','fechaEntrega','status','observaciones']);
    } else {
      // Sin vista seleccionada
      rows = [];
    }

    this.dataSource.data = rows;
    // Reset paginación a primera página cuando cambia el conjunto
    if (this._paginator) {
      this._paginator.firstPage();
    }
  }
}
