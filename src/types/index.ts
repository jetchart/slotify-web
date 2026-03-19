// --- Enums ---

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// --- Entities ---

export interface User {
  id: number;
  name: string;
  givenName: string;
  familyName: string;
  pictureUrl: string;
  email: string;
  isAdmin: boolean;
  businessId?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Business {
  id: number;
  name: string;
  slug: string;
  timezone: string;
  description: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessDto {
  name: string;
  slug: string;
  timezone: string;
  description?: string;
}

export interface Resource {
  id: number;
  businessId: number;
  name: string;
  slotMinutes: number;
  bufferMinutes: number;
  createdAt: string;
}

export interface AvailabilityRule {
  id: number;
  businessId: number;
  resourceId?: number | null;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  createdAt: string;
}


export interface AvailabilityBlock {
  id: number;
  businessId?: number;
  resourceId?: number | null;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  description?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}

/** Resumen de booking incluido en cada slot (slots on-the-fly, no persisten) */
export interface BookingSummary {
  id: number;
  status: BookingStatus;
  startsAtUtc: string;
  endsAtUtc: string;
  customer?: Customer;
}

/** Slot calculado en tiempo real (GET /public/resources/:id/slots?date=) */
export interface Slot {
  startsAtUtc: string;
  endsAtUtc: string;
  isBooked: boolean;
  booking: BookingSummary | null;
}

export interface Booking {
  id: number;
  businessId: number;
  resourceId: number;
  customerId: number;
  customer?: Customer;
  startsAtUtc: string;
  endsAtUtc: string;
  status: BookingStatus;
  notes?: string | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  businessId: number;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Exception {
  id: number;
  businessId: number;
  resourceId?: number | null;
  dateFrom: string;
  dateTo: string;
  /** true = negocio cerrado, false = negocio abierto en ese horario/día */
  isClosed: boolean;
  /** true = excepción para un rango de horario (usa startTime/endTime), false = todo el día */
  isBlockedRange: boolean;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

// --- DTOs ---

export interface CreateResourceDto {
  businessId: number;
  name: string;
  slotMinutes: number;
  bufferMinutes: number;
}

export interface UpdateResourceDto {
  name?: string;
  slotMinutes?: number;
  bufferMinutes?: number;
}

export interface UpsertAvailabilityRuleDto {
  businessId: number;
  resourceId?: number | null;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export interface CreateAvailabilityBlockDto {
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  description?: string | null;
  resourceId?: number | null;
}

export interface PublicCreateBookingDto {
  resourceId: number;
  startsAtUtc: string;
  endsAtUtc: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
}

// --- Auth ---

export interface UserCredentialResponse {
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  pictureUrl: string;
  isAdmin: boolean;
  jwt: string;
}
