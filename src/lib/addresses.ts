import { supabase } from "@/integrations/supabase/client";

export type Address = {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at: string;
};

export const ADDRESS_TYPES = ["Home", "Work"] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const TABLE_MISSING = /PGRST205|PGRST204|Could not find the table|Failed to fetch/i;

/** Returns the user's saved addresses, or [] when the table is not available yet. */
export async function listAddresses(userId: string): Promise<Address[]> {
  try {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      if (TABLE_MISSING.test(error.message)) return [];
      throw error;
    }
    return (data ?? []) as unknown as Address[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (TABLE_MISSING.test(msg)) return [];
    throw err;
  }
}

/** Inserts (or updates when `input.id` is set) an address. If `makeDefault`, clears other defaults first. */
export async function saveAddress(
  userId: string,
  input: Partial<Address>,
  makeDefault: boolean,
): Promise<Address> {
  if (makeDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }
  const { id, ...fields } = input;
  if (id) {
    const { data, error } = await supabase
      .from("addresses")
      .update({ ...fields, user_id: userId, is_default: makeDefault })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Address;
  }
  const { data, error } = await supabase
    .from("addresses")
    .insert({ ...fields, user_id: userId, is_default: makeDefault })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Address;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}

export async function setDefaultAddress(id: string, userId: string): Promise<void> {
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .neq("id", id);
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) throw error;
}
