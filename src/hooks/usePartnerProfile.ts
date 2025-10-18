import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StorageLocation {
  id: string;
  name: string;
  address?: string;
  is_default?: boolean;
}

export interface PartnerProfile {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_iban?: string;
  bank_swift_code?: string;
  bank_branch?: string;
  tax_registration_number?: string;
}

export const usePartnerProfile = (partnerId?: string) => {
  const queryClient = useQueryClient();

  const { data: partnerProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["partner-profile", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;

      const { data, error } = await supabase
        .from("shipping_partners")
        .select("id, company_name, contact_person, email, phone, address, logo_url, bank_name, bank_account_number, bank_account_name, bank_iban, bank_swift_code, bank_branch, tax_registration_number")
        .eq("id", partnerId)
        .single();

      if (error) throw error;
      return data as PartnerProfile;
    },
    enabled: !!partnerId,
  });

  const { data: storageLocations = [], isLoading } = useQuery({
    queryKey: ["partner-storage-locations", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from("shipping_partners")
        .select("storage_locations")
        .eq("id", partnerId)
        .single();

      if (error) throw error;
      
      // Parse the Json type from Supabase using double casting
      const locations = data?.storage_locations;
      if (!locations || !Array.isArray(locations)) return [];
      
      return locations as unknown as StorageLocation[];
    },
    enabled: !!partnerId,
  });

  const addLocationMutation = useMutation({
    mutationFn: async (newLocation: Omit<StorageLocation, "id">) => {
      if (!partnerId) throw new Error("Partner ID required");

      const locationWithId: StorageLocation = {
        ...newLocation,
        id: crypto.randomUUID(),
      };

      const updatedLocations = [...storageLocations, locationWithId];

      const { error } = await supabase
        .from("shipping_partners")
        .update({ storage_locations: updatedLocations as any })
        .eq("id", partnerId);

      if (error) throw error;
      return locationWithId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-storage-locations", partnerId] });
      toast.success("Storage location saved to profile");
    },
    onError: (error) => {
      toast.error("Failed to save location: " + error.message);
    },
  });

  const removeLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!partnerId) throw new Error("Partner ID required");

      const updatedLocations = storageLocations.filter((loc) => loc.id !== locationId);

      const { error } = await supabase
        .from("shipping_partners")
        .update({ storage_locations: updatedLocations as any })
        .eq("id", partnerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-storage-locations", partnerId] });
      toast.success("Storage location removed");
    },
    onError: (error) => {
      toast.error("Failed to remove location: " + error.message);
    },
  });

  return {
    partnerProfile,
    storageLocations,
    isLoading: isLoading || isLoadingProfile,
    addLocation: addLocationMutation.mutate,
    removeLocation: removeLocationMutation.mutate,
  };
};
