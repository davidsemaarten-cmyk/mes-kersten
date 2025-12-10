/**
 * TypeScript type definitions matching backend database schemas
 * Following PROJECT-MASTER.md pattern
 * 
 * These types should mirror the Pydantic schemas in backend/schemas/
 */

// =====================================================
// User Types
// =====================================================

export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
}

export interface UserUpdate {
  email?: string
  full_name?: string
  password?: string
  is_active?: boolean
}

export interface UserLogin {
  email: string
  password: string
}

// =====================================================
// Project Types (placeholder for future implementation)
// =====================================================

export interface Project {
  id: string
  naam: string
  beschrijving?: string
  status: 'actief' | 'afgerond' | 'geannuleerd'
  created_at: string
  created_by: string
  updated_at: string
}

export interface ProjectCreate {
  naam: string
  beschrijving?: string
}

// =====================================================
// Phase Types (placeholder for future implementation)
// =====================================================

export interface Phase {
  id: string
  project_id: string
  fase_nummer: string
  beschrijving?: string
  opmerkingen_intern?: string
  opmerkingen_werkplaats?: string
  montage_datum?: string
  status: 'actief' | 'gereed' | 'gearchiveerd'
  created_at: string
  created_by: string
  updated_at: string
}

export interface PhaseCreate {
  project_id: string
  fase_nummer: string
  beschrijving?: string
  montage_datum?: string
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  detail: string
  error?: string
}

export interface AuthResponse {
  token: string
  user: User
}

// =====================================================
// PlateStock Module Types
// =====================================================

// Material Types
export interface Material {
  id: string
  plaatcode_prefix: string
  materiaalgroep: string
  specificatie: string | null
  oppervlaktebewerking: string
  kleur: string  // Hex color code
  created_at: string
  updated_at: string
  created_by?: string
  plate_count?: number
}

export interface MaterialCreate {
  plaatcode_prefix: string
  materiaalgroep: string
  specificatie: string | null
  oppervlaktebewerking: string
  kleur: string
}

export interface MaterialUpdate {
  materiaalgroep?: string
  specificatie?: string | null
  oppervlaktebewerking?: string
  kleur?: string
  // Note: plaatcode_prefix NOT editable if plates exist
}

export interface PrefixSuggestionRequest {
  materiaalgroep: string
  specificatie: string | null
  oppervlaktebewerking: string
}

export interface PrefixSuggestionResponse {
  suggestion: string
  is_unique: boolean
}

// Plate Types
export interface Plate {
  id: string
  plate_number: string
  material_prefix: string
  quality: string
  thickness: number
  width: number
  length: number
  weight?: number
  location?: string
  notes?: string
  barcode?: string
  status: 'beschikbaar' | 'geclaimd' | 'bij_laser'
  bij_laser_sinds?: string
  is_consumed: boolean
  consumed_at?: string
  consumed_by?: string
  created_at: string
  created_by: string
  updated_at: string
}

export interface PlateCreate {
  material_prefix: string
  quality: string
  thickness: number
  width: number
  length: number
  weight?: number
  location?: string
  notes?: string
  barcode?: string
}

export interface PlateUpdate {
  quality?: string
  thickness?: number
  width?: number
  length?: number
  weight?: number
  location?: string
  notes?: string
  barcode?: string
}

export interface UserSummary {
  id: string
  email: string
  full_name: string
}

export interface PlateWithRelations extends Plate {
  material?: Material
  creator?: UserSummary
  consumer?: UserSummary
  claims: Claim[]
}

// Claim Types
export interface Claim {
  id: string
  plate_id: string
  project_naam: string
  project_fase: string  // 3-digit string
  actief: boolean
  m2_geclaimd?: number
  notes?: string
  claimed_by: string
  claimed_at: string
}

export interface ClaimCreate {
  plate_id: string
  project_naam: string
  project_fase: string
  m2_geclaimd?: number
  notes?: string
}

export interface ClaimUpdate {
  project_naam?: string
  project_fase?: string
  m2_geclaimd?: number
  notes?: string
  actief?: boolean
}

export interface ClaimWithPlate extends Claim {
  plate?: Plate
  claimer?: UserSummary
}

export interface ClaimBulkCreate {
  plate_ids: string[]
  project_naam: string
  project_fase: string
}

export interface BulkClaimResponse {
  claims: Claim[]
  total_m2: number
}

export interface ReleaseByProjectRequest {
  project_naam: string
  project_fase: string
}

export interface ReleaseByProjectResponse {
  claims_released: number
  plates_freed: number
}

// Plate Grouping Types
export interface PlateGroup {
  type: 'group'
  plates: PlateWithRelations[]
  count: number
  first_number: string
  last_number: string
  material_prefix: string
  quality: string
  thickness: number
  width: number
  length: number
  location?: string
}

export interface SinglePlate {
  type: 'single'
  plate: PlateWithRelations
}

export type PlateOrGroup = PlateGroup | SinglePlate

// Statistics Types
export interface MaterialStats {
  material: string
  count: number
  m2: number
}

export interface LocationStats {
  location: string
  count: number
}

export interface OverviewStats {
  total_plates: number
  total_m2: number
  claimed_plates: number
  claimed_m2: number
  available_plates: number
  available_m2: number
  by_material: MaterialStats[]
  by_location: LocationStats[]
}

export interface ProjectStats {
  project_naam: string
  fase: string
  plates: number
  m2: number
}

export interface ProjectsStatsResponse {
  active_projects: number
  total_claimed_m2: number
  projects: ProjectStats[]
}

// Helper type for Van Laser request
export interface VanLaserRequest {
  new_location: string
}
