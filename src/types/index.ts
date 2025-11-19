export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface Project {
  id: number;
  company: string;
  projectId: string;
  code: string;
  name: string;
}

export interface Scan {
  id?: number;
  barcode: string;
  lat: number;
  lng: number;
  comment: string;
  date: string;
  images?: string[];
  synced?: boolean;
}

export interface Site {
  id: number;
  code: string;
  name: string;
}

export interface Position {
  id: number;
  number: string;
  siteId: number;
}

export interface Location {
  id: number;
  code: string;
  name: string;
}

export interface Equipment {
  id: number;
  code: string;
  name: string;
}

export interface Origin {
  id: number;
  code: string;
  name: string;
}

export interface EquipmentLocation {
  equipmentId: number;
  locationId: number;
}

export interface OfflineData {
  origins: Origin[];
  sites: Site[];
  equipments: Equipment[];
  positions: Position[];
  locations: Location[];
  equipmentLocations: EquipmentLocation[];
  packageDefinitions: PackagePartDefinition[];
}

export interface PackagePartDefinition {
  id: number;
  packageBarcode: string;
  partBarcode: string;
  partName: string;
  partClass?: string;
  expectedOrder: number;
}

export interface PackageSession {
  id?: number;
  clientSessionId: string;
  packageBarcode: string;
  startedAt: string;
  completedAt?: string;
  storageLocation?: string;
  totalParts: number;
  scannedParts: ScannedPart[];
  synced?: boolean;
}

export interface ScannedPart {
  id?: number;
  partBarcode: string;
  partName: string;
  scannedAt: string;
  isDamaged: boolean;
  damageType?: string;
  damageSeverity?: string;
  damageNotes?: string;
  damagePhotos?: string[];
}

export interface StorageMarkerData {
  site: string;
  position: string;
  location: string;
  equipment: string;
  equipmentNumber: string;
  storageMarker: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}
