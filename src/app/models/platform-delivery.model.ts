export type Area =
  | 'Arquitectura'
  | 'Ciberseguridad'
  | 'Gobierno, riesgo y cumplimiento (GRC)'
  | 'Gestión de accesos'
  | 'Seguridad de aplicaciones'
  | 'Seguridad en la nube'
  | 'Seguridad e infraestructura';

export type DeliveryType = 'Manual' | 'Semi-digital' | 'Full-digital';
export type DeliveryStatus = 'Entregada' | 'En proceso';

export interface PlatformDelivery {
  id: string;
  nombrePlataforma: string;
  area: Area;
  tipo: DeliveryType;
  fechaSolicitud: string;   // ISO
  fechaCompromiso?: string; // ISO – calcular desde SLA
  fechaEntrega?: string;    // ISO – solo si entregada
  status: DeliveryStatus;
  observaciones?: string;
}
