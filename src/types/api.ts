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

/** GET /products — the active product catalogue. */
export type Product = {
    id: number;
    code: string;
    name: string;
    /** e.g. "Dedicated Internet Access", "Hosta", "iMore". */
    group: string;
    /** "Fiber" | "Radio". */
    media: string;
    /** Starting price in Rupiah; null when not set. */
    starting_price: number | null;
    is_active: boolean;
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

export type CanvassResult = 'interested' | 'competitor' | 'not_now' | 'closed';

/** One door-to-door canvassing visit. */
export type CanvassVisit = {
    id: number;
    canvass_area_id: number;
    user_id: number;
    name: string;
    result: CanvassResult;
    result_label: string;
    note: string | null;
    has_photo: boolean;
    lat: number | null;
    lng: number | null;
    lead_id: number | null;
    created_at: string;
};

/** A canvassing area (a mapped patch with a unit target). */
export type CanvassArea = {
    id: number;
    name: string;
    polygon: number[][];
    target_units: number;
    team_id: number | null;
    assigned_user_id: number | null;
    visits_count?: number;
};

/** An area with its visit list loaded. */
export type CanvassAreaDetail = CanvassArea & { visits: CanvassVisit[] };

/** Canvassing outcomes a user may pick, with local labels and pin colours. */
export const CANVASS_RESULTS: { value: CanvassResult; label: string; bg: string; fg: string }[] = [
    { value: 'interested', label: 'Interested', bg: '#d6f4f6', fg: '#00737a' },
    { value: 'competitor', label: 'Using competitor', bg: '#fdeecd', fg: '#8a5e00' },
    { value: 'not_now', label: 'Not now', bg: '#eef2f5', fg: '#5e7180' },
    { value: 'closed', label: 'Closed / empty', bg: '#fbe6e6', fg: '#a83434' },
];

// --- Notifications ----------------------------------------------------------

export type NotificationItem = {
    id: string;
    type: string | null;
    tag: string | null;
    title: string | null;
    body: string | null;
    lead_id: number | null;
    read: boolean;
    created_at: string | null;
};

/** GET /notifications — a paginator with the unread count added on top. */
export type NotificationsResponse = Paginated<NotificationItem> & { unread: number };

// --- Targets ----------------------------------------------------------------

/** An Account Manager's own monthly + annual target summary. */
export type TargetSummary = {
    mrc_target: number;
    won: number;
    pct: number;
    annual_target: number;
    annual_won: number;
};

export type TargetTeam = {
    id: number;
    name: string;
    leader: string | null;
    members: number;
    mrc_target: number;
    sum_am_targets: number;
    under_sum: boolean;
    won: number;
    pct: number;
    annual_target: number;
};

export type TargetPerson = {
    id: number;
    name: string;
    team_id: number | null;
    team: string | null;
    mrc_target: number;
    annual_target: number;
    won: number;
    pct: number;
};

export type TargetsResponse = {
    period: string;
    me: TargetSummary | null;
    teams: TargetTeam[];
    people: TargetPerson[];
};

// --- Reports ----------------------------------------------------------------

export type ReportKpis = {
    won_mrc: number;
    new_customers: number;
    pipeline_added: number;
    activities: number;
};

export type ReportSeriesPoint = { label: string; mrc: number; current: boolean };
export type FunnelStep = { key: string; label: string; value: number };

export type ReportsResponse = {
    period: 'weekly' | 'monthly';
    kpis: ReportKpis;
    series: ReportSeriesPoint[];
    funnel: FunnelStep[];
};

export type LeaderboardRow = {
    user_id: number;
    name: string;
    team: string | null;
    won_mrc: number;
    deals: number;
};

export type LeaderboardResponse = {
    scope: 'team' | 'all';
    month: string;
    rows: LeaderboardRow[];
};

// --- Quotations -------------------------------------------------------------

export type QuotationStatus =
    | 'verifying'
    | 'waiting_gm'
    | 'approved'
    | 'returned'
    | 'rejected'
    | 'sent';

export type Quotation = {
    id: number;
    number: string | null;
    lead_id: number;
    company?: string;
    bandwidth: string | null;
    mrc: number;
    otc: number;
    term_months: number;
    discount_pct: number;
    net_mrc: number;
    contract_value: number;
    status: QuotationStatus;
    status_label: string;
    completed_step: number;
    admin_note: string | null;
    gm_note: string | null;
    requested_by: number;
    requester?: string;
    has_pdf: boolean;
    verified_at: string | null;
    approved_at: string | null;
    sent_at: string | null;
    created_at: string | null;
};

/** Status pill colours for a quotation. */
export const QUOTATION_STATUS_STYLE: Record<QuotationStatus, { bg: string; fg: string }> = {
    verifying: { bg: '#fff2d6', fg: '#8a5e00' },
    waiting_gm: { bg: '#e8eff4', fg: '#2c5d78' },
    approved: { bg: '#dff3e8', fg: '#137347' },
    returned: { bg: '#fdeecd', fg: '#8a5e00' },
    rejected: { bg: '#fbe6e6', fg: '#a83434' },
    sent: { bg: '#d6f4f6', fg: '#00737a' },
};

/** Quotation term + discount options allowed by the API. */
export const QUOTATION_TERMS = [12, 24, 36] as const;
export const QUOTATION_DISCOUNTS = [0, 5, 10, 15] as const;
