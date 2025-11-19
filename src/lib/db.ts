import Dexie, { Table } from "dexie";
import {
  Scan,
  Project,
  Site,
  Position,
  Location,
  Equipment,
  Origin,
  EquipmentLocation,
  PackageSession,
  PackagePartDefinition,
} from "@/types";

export class ScannerDatabase extends Dexie {
  scans!: Table<Scan>;
  projects!: Table<Project>;
  sites!: Table<Site>;
  positions!: Table<Position>;
  locations!: Table<Location>;
  equipments!: Table<Equipment>;
  origins!: Table<Origin>;
  equipmentLocations!: Table<EquipmentLocation>;
  packageSessions!: Table<PackageSession>;
  packageDefinitions!: Table<PackagePartDefinition>;

  constructor() {
    super("BarcodeScannerDB");
    this.version(1).stores({
      scans: "++id, barcode, synced, date",
      projects: "id, code, projectId",
      sites: "id, code",
      positions: "id, siteId, number",
      locations: "id, code",
      equipments: "id, code",
      origins: "id, code",
      equipmentLocations: "[equipmentId+locationId]",
      packageSessions: "++id, clientSessionId, synced",
      packageDefinitions: "id, packageBarcode",
    });
  }
}

export const db = new ScannerDatabase();

// Helper functions
export async function saveScan(scan: Omit<Scan, "id" | "synced">): Promise<number> {
  return db.scans.add({ ...scan, synced: false });
}

export async function getPendingScans(): Promise<Scan[]> {
  return db.scans.where("synced").equals(0).toArray();
}

export async function markScanSynced(id: number): Promise<void> {
  await db.scans.update(id, { synced: true });
}

export async function getScanHistory(): Promise<Scan[]> {
  return db.scans.orderBy("date").reverse().limit(50).toArray();
}

export async function saveOfflineData(data: {
  sites: Site[];
  positions: Position[];
  locations: Location[];
  equipments: Equipment[];
  origins: Origin[];
  equipmentLocations: EquipmentLocation[];
  packageDefinitions: PackagePartDefinition[];
}): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.sites,
      db.positions,
      db.locations,
      db.equipments,
      db.origins,
      db.equipmentLocations,
      db.packageDefinitions,
    ],
    async () => {
      await db.sites.clear();
      await db.positions.clear();
      await db.locations.clear();
      await db.equipments.clear();
      await db.origins.clear();
      await db.equipmentLocations.clear();
      await db.packageDefinitions.clear();

      if (data.sites.length) await db.sites.bulkAdd(data.sites);
      if (data.positions.length) await db.positions.bulkAdd(data.positions);
      if (data.locations.length) await db.locations.bulkAdd(data.locations);
      if (data.equipments.length) await db.equipments.bulkAdd(data.equipments);
      if (data.origins.length) await db.origins.bulkAdd(data.origins);
      if (data.equipmentLocations.length)
        await db.equipmentLocations.bulkAdd(data.equipmentLocations);
      if (data.packageDefinitions.length)
        await db.packageDefinitions.bulkAdd(data.packageDefinitions);
    }
  );
}

export async function saveProjects(projects: Project[]): Promise<void> {
  await db.transaction("rw", db.projects, async () => {
    await db.projects.clear();
    await db.projects.bulkAdd(projects);
  });
}

export async function getProjects(): Promise<Project[]> {
  return db.projects.toArray();
}

export async function getSites(): Promise<Site[]> {
  return db.sites.toArray();
}

export async function getPositionsBySite(siteId: number): Promise<Position[]> {
  return db.positions.where("siteId").equals(siteId).toArray();
}

export async function getLocations(): Promise<Location[]> {
  return db.locations.toArray();
}

export async function getEquipments(): Promise<Equipment[]> {
  return db.equipments.toArray();
}

export async function getEquipmentsByLocation(
  locationId: number
): Promise<Equipment[]> {
  const relations = await db.equipmentLocations
    .where("locationId")
    .equals(locationId)
    .toArray();
  const equipmentIds = relations.map((r) => r.equipmentId);
  return db.equipments.where("id").anyOf(equipmentIds).toArray();
}
