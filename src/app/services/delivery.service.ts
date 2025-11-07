import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Area, DeliveryStatus, DeliveryType, PlatformDelivery } from '../models/platform-delivery.model';

// Helper: SLA days per type
const SLA_DAYS: Record<DeliveryType, number> = {
  'Manual': 90,
  'Semi-digital': 21,
  'Full-digital': 3
};

const AREAS: Area[] = [
  'Arquitectura',
  'Ciberseguridad',
  'Gobierno, riesgo y cumplimiento (GRC)',
  'Gestión de accesos',
  'Seguridad de aplicaciones',
  'Seguridad en la nube',
  'Seguridad e infraestructura'
];

const TYPES: DeliveryType[] = ['Manual', 'Semi-digital', 'Full-digital'];
const STATUSES: DeliveryStatus[] = ['Entregada', 'En proceso'];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(d: Date): string {
  // YYYY-MM-DD format
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private data: PlatformDelivery[] = this.generateData();

  // Generates 30–60 mock records with varied areas, types, dates and status.
  private generateData(): PlatformDelivery[] {
    const out: PlatformDelivery[] = [];
    const now = new Date();
    const total = 180 + Math.floor(Math.random() * 31); // 30–60

    for (let i = 0; i < total; i++) {
      const area = AREAS[Math.floor(Math.random() * AREAS.length)];
      const tipo = TYPES[Math.floor(Math.random() * TYPES.length)];
      const status = STATUSES[Math.random() < 0.6 ? 1 : 0]; // bias to 'En proceso'

      // solicitud within last 150 days
      const daysAgo = Math.floor(Math.random() * 150);
      const fechaSolicitud = addDays(now, -daysAgo);

      // 40% chance to omit compromiso to test SLA computation
      const omitComp = Math.random() < 0.4;
      let fechaCompromiso: string | undefined = omitComp ? undefined : toIso(addDays(fechaSolicitud, SLA_DAYS[tipo]));
      let fechaEntrega: string | undefined;

      if (status === 'Entregada') {
        // delivered between solicitud and solicitud + SLA + 15 days
        const deliverIn = Math.floor(Math.random() * (SLA_DAYS[tipo] + 15));
        fechaEntrega = toIso(addDays(fechaSolicitud, Math.max(1, deliverIn)));
        // if compromiso missing, compute from SLA as well for consistency
        if (!fechaCompromiso) {
          fechaCompromiso = toIso(addDays(fechaSolicitud, SLA_DAYS[tipo]));
        }
      }

      const item: PlatformDelivery = {
        id: `${i + 1}`,
        nombrePlataforma: `Plataforma ${i + 1}`,
        area,
        tipo,
        fechaSolicitud: toIso(fechaSolicitud),
        fechaCompromiso, // may be missing; consumers must compute if needed
        fechaEntrega,
        status,
        observaciones: Math.random() < 0.25 ? 'Revisión pendiente de documentación.' : undefined
      };
      out.push(item);
    }

    return out.map((x) => this.ensureCompromiso(x));
  }

  // Ensures fechaCompromiso exists by applying SLA to fechaSolicitud when missing.
  private ensureCompromiso(x: PlatformDelivery): PlatformDelivery {
    if (!x.fechaCompromiso) {
      const d = new Date(x.fechaSolicitud);
      x.fechaCompromiso = toIso(addDays(d, SLA_DAYS[x.tipo]));
    }
    return x;
  }

  getAll(): Observable<PlatformDelivery[]> {
    return of(this.data.map((x) => this.ensureCompromiso({ ...x }))).pipe(delay(300));
  }

  getKpis(): Observable<{ entregadas: number; procesoEnTiempo: number; procesoFueraTiempo: number }> {
    const now = new Date();
    let entregadas = 0, procesoEnTiempo = 0, procesoFueraTiempo = 0;

    for (const x of this.data) {
      const item = this.ensureCompromiso(x);
      if (item.status === 'Entregada') {
        entregadas++;
      } else {
        const compromiso = new Date(item.fechaCompromiso!);
        if (now <= compromiso) procesoEnTiempo++; else procesoFueraTiempo++;
      }
    }

    return of({ entregadas, procesoEnTiempo, procesoFueraTiempo }).pipe(delay(300));
  }

  getChartDataByArea(filtroAreas?: Area[]): Observable<{ area: Area; enTiempo: number; fueraTiempo: number }[]> {
    const now = new Date();
    const areas = (filtroAreas && filtroAreas.length > 0) ? filtroAreas : AREAS;
    const result: { area: Area; enTiempo: number; fueraTiempo: number }[] = areas.map(a => ({ area: a, enTiempo: 0, fueraTiempo: 0 }));

    for (const x of this.data) {
      if (x.status !== 'En proceso') continue;
      const item = this.ensureCompromiso(x);
      if (!areas.includes(item.area)) continue;
      const compromiso = new Date(item.fechaCompromiso!);
      const bucket = result.find(r => r.area === item.area)!;
      if (now <= compromiso) bucket.enTiempo++; else bucket.fueraTiempo++;
    }

    return of(result).pipe(delay(300));
  }

  getDistributionByType(): Observable<{ tipo: DeliveryType; total: number }[]> {
    const map = new Map<DeliveryType, number>();
    TYPES.forEach(t => map.set(t, 0));
    for (const x of this.data) {
      map.set(x.tipo, (map.get(x.tipo) || 0) + 1);
    }
    const arr = TYPES.map(t => ({ tipo: t, total: map.get(t)! }));
    return of(arr).pipe(delay(300));
  }

  // Expose areas and types for filters
  getAreas(): Area[] { return AREAS.slice(); }
  getTypes(): DeliveryType[] { return TYPES.slice(); }
}
