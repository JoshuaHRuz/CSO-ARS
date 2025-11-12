import { Component, inject, signal, ViewChild, AfterViewInit, effect } from '@angular/core';
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
import { DashboardStore } from './dashboard.store';

interface AreaAgg { area: Area; enTiempo: number; fueraTiempo: number; }
interface TypeAgg { tipo: DeliveryType; total: number; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatDatepickerModule, MatNativeDateModule, MatInputModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: 'dashboard.component.html',
  providers: [DashboardStore]
})
export class DashboardComponent implements AfterViewInit {
  private service = inject(DeliveryService);
  readonly store = inject(DashboardStore);

  // Expose filters bound in template
  areas: Area[] = this.store.areas;
  types: DeliveryType[] = this.store.types;
  selectedAreaSet = this.store.selectedAreaSet;
  selectedTypeSet = this.store.selectedTypeSet;
  // Keep date pickers local and sync to store
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  filtered = this.store.filtered;
  dataSource = new MatTableDataSource<PlatformDelivery>([]);
  detailDisplayedColumns = this.store.detailDisplayedColumns;

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

  kpi = this.store.kpi;
  areaAgg = this.store.areaAgg;
  typeAgg = this.store.typeAgg;

  get showTimeDetails(): string | null { return this.store.showTimeDetails(); }
  readonly maxBars = this.store.maxBars;
  readonly circumference = this.store.circumference;

  constructor() {
    this.service.getAll().subscribe((rows) => {
      this.store.setAll(rows);
    });
    effect(() => {
      this.dataSource.data = this.store.detailRows();
      if (this._paginator) this._paginator.firstPage();
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
    this.store.selectAllAreas();
  }
  clearAreas() {
    this.store.clearAreas();
  }
  toggleArea(a: Area, on: boolean) {
    this.store.toggleArea(a, on);
  }

  selectAllTypes() {
    this.store.selectAllTypes();
  }
  clearTypes() {
    this.store.clearTypes();
  }
  toggleType(t: DeliveryType, on: boolean) {
    this.store.toggleType(t, on);
  }

  applyFilters() {
    this.store.setDateRange(this.dateFrom, this.dateTo);
  }

  barHeight(value: number): number {
    return this.store.barHeight(value);
  }

  tooltip(r: AreaAgg, label: 'En tiempo' | 'Fuera de tiempo'): string {
    return this.store.tooltip(r, label);
  }

  totalFiltered() { return this.store.totalFiltered(); }
  percent(v: number, total: number): string { return this.store.percent(v, total); }

  donutSets() {
    return this.store.donutSets();
  }
  resetDate() {
    this.dateFrom = null;
    this.dateTo = null;
    this.store.resetDate();
  }
  updateDetails(time: string): void {
    this.store.updateDetails(time);
  }
  closeDetails():void{
    this.store.closeDetails();
  }
  // Filtering helpers moved to store
}
