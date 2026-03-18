// --- Enums ---

export enum SlotStatus {
  OPEN = 'open',
  BLOCKED = 'blocked',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
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
  resourceId: number;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  createdAt: string;
}

export interface BusinessAvailabilityRule {
  id: number;
  businessId: number;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  createdAt: string;
}

export interface ResourceAvailabilityEffectiveRule {
  id: number;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  source: 'business' | 'resource' | string;
}

export interface ResourceAvailabilityDayOverride {
  id: number;
  resourceId: number;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  createdAt?: string;
}

export interface AvailabilityBlock {
  id: number;
  businessId?: number;
  resourceId?: number | null;
  startsAtUtc: string;
  endsAtUtc: string;
  reason?: string | null;
  createdAt?: string;
}

export interface Slot {
  id: number;
  businessId: number;
  resourceId: number;
  startsAtUtc: string;
  endsAtUtc: string;
  status: SlotStatus;
  createdAt: string;
  isBooked?: boolean;
  // En el endpoint público de slots, el backend devuelve el booking y el customer asociados
  // cuando el slot está reservado.
  booking?: Booking;
  customer?: Customer;
}

export interface Booking {
  id: number;
  businessId: number;
  resourceId: number;
  slotId: number;
  customerId: number;
  startsAtUtc: string;
  endsAtUtc: string;
  status: BookingStatus;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  createdAt: string;
}

export interface Customer {
  id: number;
  businessId: number;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
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
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export interface UpsertBusinessAvailabilityRuleDto {
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
}

export interface UpsertResourceDayOverrideDto {
  dayOfWeek: number;
  // Para overrides de recurso:
  // - omit ranges => hereda baseline (business o legacy fallback)
  // - ranges => override abierto con esos rangos
  // - isClosed=true => día cerrado (no se usa en el panel actual, pero lo soporta el backend)
  isClosed?: boolean;
  ranges?: { startLocalTime: string; endLocalTime: string }[];
}

export interface CreateAvailabilityBlockDto {
  startsAtUtc: string;
  endsAtUtc: string;
  reason?: string | null;
  resourceId?: number;
}

export interface GenerateSlotsDto {
  businessId: number;
  from: string;
  days?: number;
}

export interface PublicCreateBookingDto {
  resourceId: number;
  slotId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
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
