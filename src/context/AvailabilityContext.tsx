import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { availabilityService } from '@/services/availability.service';

interface AvailabilityContextValue {
  /** true si el negocio tiene reglas de horarios definidas */
  hasBusinessAvailability: boolean | null;
  /** Refresca el estado (ej. después de guardar reglas en Mi Negocio) */
  refresh: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

export function AvailabilityProvider({ children }: { children: ReactNode }) {
  const { businessId } = useAuth();
  const [hasBusinessAvailability, setHasBusinessAvailability] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setHasBusinessAvailability(null);
      return;
    }
    try {
      const rules = await availabilityService.getBusinessRules(businessId);
      const businessRules = rules.filter((r) => !r.resourceId);
      setHasBusinessAvailability(businessRules.length > 0);
    } catch {
      setHasBusinessAvailability(true);
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AvailabilityContext.Provider value={{ hasBusinessAvailability, refresh }}>
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useAvailability(): AvailabilityContextValue {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error('useAvailability must be used within AvailabilityProvider');
  return ctx;
}
