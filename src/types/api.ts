/**
 * TypeScript shapes mirroring the Laravel API Resources (/api/v1).
 */

export type Role = 'gm_sales' | 'sales_manager' | 'account_manager' | 'admin_sales';

export type User = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: Role | null;
    role_label: string | null;
    team_id: number | null;
    team: string | null;
    branch_id: number | null;
    is_active: boolean;
    permissions: {
        can_see_all_data: boolean;
        can_edit_settings: boolean;
    };
};

export type LeadStage =
    | 'new'
    | 'follow'
    | 'meeting'
    | 'quote'
    | 'nego'
    | 'won'
    | 'lost';

export type VerificationStatus = 'unverified' | 'verified' | 'rejected';

export type Lead = {
    id: number;
    company: string;
    contact_name: string | null;
    contact_title: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    source: string | null;
    bandwidth: string | null;
    est_mrc: number | null;
    won_mrc: number | null;
    stage: LeadStage;
    stage_label: string;
    next_step: string | null;
    verification_status: VerificationStatus;
    lost_reason: string | null;
    owner_id: number;
    owner?: string;
    team_id: number | null;
    team?: string | null;
    product_id: number | null;
    won_at: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type ActivityType = 'CALL' | 'MEET' | 'VISIT' | 'WA' | 'NOTE' | 'QUOTE' | 'WIN';

export type Activity = {
    id: number;
    lead_id: number;
    user_id: number;
    user?: string;
    type: ActivityType;
    type_label: string;
    title: string;
    note: string | null;
    occurred_at: string;
};

/** A lead detail response includes its activity timeline. */
export type LeadDetail = Lead & { activities: Activity[] };

export type EventStatus = 'planned' | 'done' | 'cancelled';

export type Event = {
    id: number;
    lead_id: number | null;
    type: string;
    type_label: string;
    title: string;
    location: string | null;
    status: EventStatus;
    starts_at: string;
    ends_at: string | null;
};

/** Loggable activity types a user may pick (system logs QUOTE/WIN itself). */
export const LOGGABLE_TYPES: { value: ActivityType; label: string }[] = [
    { value: 'CALL', label: 'Call' },
    { value: 'MEET', label: 'Meeting' },
    { value: 'VISIT', label: 'Visit' },
    { value: 'WA', label: 'WhatsApp' },
    { value: 'NOTE', label: 'Note' },
];

/** Laravel paginator envelope for a collection resource. */
export type Paginated<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

/** A single resource is wrapped in `data`. */
export type Single<T> = { data: T };

export type LoginResponse = {
    token: string;
    user: User;
};

/** One attendance record (today's or a past day). */
export type Attendance = {
    id: number;
    user_id: number;
    date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    check_in_lat: number | null;
    check_in_lng: number | null;
    distance_m: number | null;
    inside_geofence: boolean;
    check_in_reason: string | null;
};

/** The office geofence a branch defines. */
export type Geofence = {
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    radius_m: number;
};

/** GET /attendance — today's record, the office geofence, recent history. */
export type AttendanceIndex = {
    today: Attendance | null;
    geofence: Geofence | null;
    history: Attendance[];
};
