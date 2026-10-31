export type TenantStatus = 'draft' | 'active' | 'suspended';
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type FeatureCode =
  | 'competitions' | 'teams' | 'players' | 'matches' | 'standings'
  | 'statistics' | 'staff' | 'awards' | 'sponsors' | 'articles' | 'market' | 'gallery';
export type Tenant = {
  id: string; slug: string; name: string; tagline: string | null;
  logo_url: string | null; cover_url: string | null; brand_color: string;
  status: TenantStatus; owner_id: string; created_at: string;
};
export type TenantFeature = { tenant_id: string; code: FeatureCode; enabled: boolean; ends_at: string | null };
export type Member = { tenant_id: string; user_id: string; role: MemberRole };
export type Profile = { id: string; username: string; full_name: string | null; email: string };
export type Row = Record<string, unknown> & { id: string; tenant_id: string };
export type Option = { id: string; name: string };
