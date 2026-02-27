/**
 * TypeScript type definitions matching backend database schemas
 * Following PROJECT-MASTER.md pattern
 * 
 * These types should mirror the Pydantic schemas in backend/schemas/
 */

// =====================================================
// User Types
// =====================================================

import type { UserRole } from './roles'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole  // User's primary role
  is_active: boolean
  digital_signature_url?: string | null
  signature_uploaded_at?: string | null
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
  heatnummer?: string
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
  heatnummer?: string
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
  heatnummer?: string
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

// =====================================================
// Orders System Types (Phase 1.2)
// =====================================================

// Order Type (predefined operation types)
export interface OrderType {
  id: string
  name: string  // e.g., "Zagen", "Boren", "Kanten"
  icon: string  // e.g., "saw", "drill", "fold"
  sort_order: number
}

// Posnummer (Part Number)
export interface Posnummer {
  id: string
  fase_id: string
  posnr: string  // e.g., "001", "042"
  materiaal: string  // e.g., "S235", "RVS 316"
  profiel?: string | null  // e.g., "IPE 200", "Rechthoekige buis 40x40x3"
  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  quantity: number
  notes?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  dimensions_display?: string  // Computed property from backend
  file_count?: number  // Future: Phase 2
}

export interface PosnummerCreate {
  posnr: string
  materiaal: string
  profiel?: string | null
  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  quantity?: number
  notes?: string | null
}

export interface PosnummerUpdate {
  posnr?: string
  materiaal?: string
  profiel?: string | null
  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  quantity?: number
  notes?: string | null
}

// Order (individual operation in a sequence)
export interface Order {
  id: string
  orderreeks_id: string
  order_type_id: string
  sequence_position: number  // 1, 2, 3, etc.
  status: 'open' | 'in_uitvoering' | 'afgerond' | 'blocked'
  assigned_to?: string | null
  started_at?: string | null
  completed_at?: string | null
  completed_by?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
}

export interface OrderResponse extends Order {
  order_type_name: string
  order_type_icon?: string
  assigned_to_name?: string | null
  posnummer_count: number
}

export interface OrderDetailResponse extends OrderResponse {
  posnummers: Posnummer[]
  assigned_user?: UserSummary | null
  completed_user?: UserSummary | null
  approved_user?: UserSummary | null
}

export interface OrderAssign {
  assigned_to: string | null  // user_id or null to unassign
}

export interface LinkPosnummersRequest {
  posnummer_ids: string[]
}

// Orderreeks (sequence of orders)
export interface Orderreeks {
  id: string
  fase_id: string
  title: string  // e.g., "Volledig", "West", "Oost"
  status: 'open' | 'in_uitvoering' | 'afgerond'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrderreeksResponse extends Orderreeks {
  orders: OrderResponse[]
  fase_code?: string  // e.g., "PROJECT-001"
  order_count?: number
  progress_percentage?: number  // 0-100
}

export interface OrderreeksCreate {
  fase_id: string
  title?: string  // Default: "Volledig"
  order_type_ids: string[]  // List of order type IDs in desired sequence
}

export interface OrderreeksUpdate {
  title?: string
  status?: 'open' | 'in_uitvoering' | 'afgerond'
}

// Statistics for Fase
export interface FaseStatistics {
  order_count: number
  posnummer_count: number
  file_count: number  // Future: Phase 2
  claimed_plate_count: number  // Future: Phase 5
}

// Statistics for Project
export interface ProjectStatistics {
  fase_count: number
  order_count: number
  posnummer_count: number
  file_count: number  // Future: Phase 2
}

// =====================================================
// Laserplanner Types
// =====================================================

export type LaserJobStatus = 'aangemaakt' | 'geprogrammeerd' | 'nc_verzonden' | 'gereed'

export interface LaserLineItem {
  id: string
  laser_job_id: string
  projectcode: string | null
  fasenr: string | null
  posnr: string | null
  profiel: string | null
  aantal: number | null
  lengte: number | null
  kwaliteit: string | null
  gewicht: number | null
  zaag: string | null
  opmerkingen: string | null
  row_number: number
  created_at: string
}

export interface LaserJob {
  id: string
  naam: string
  beschrijving: string | null
  project_id: string | null
  fase_id: string | null
  status: LaserJobStatus
  csv_metadata: Record<string, string> | null
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
  line_item_count: number
}

export interface LaserJobWithLineItems extends LaserJob {
  line_items: LaserLineItem[]
}

export interface CSVParseResult {
  metadata: Record<string, string>
  headers: string[]
  rows: Array<{
    row_number: number
    [key: string]: any
  }>
}
