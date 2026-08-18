import { base44 } from "@/api/base44Client";

// Singleton helper for the HubSettings record (first row is the global toggle).
export async function getHubSettings() {
  const rows = await base44.entities.HubSettings.list();
  return rows[0] || null;
}

// Flip the Ninja Token availability flag for everyone. Creates the singleton
// record on first use, otherwise updates the existing one.
export async function setNinjaAvailability(value) {
  const existing = await getHubSettings();
  if (existing?.id) {
    await base44.entities.HubSettings.update(existing.id, {
      isNinjaTokenActive: !!value,
    });
    return existing.id;
  }
  const created = await base44.entities.HubSettings.create({
    isNinjaTokenActive: !!value,
  });
  return created.id;
}