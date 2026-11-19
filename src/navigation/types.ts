import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Screens inside the Home tab's stack. */
export type HomeStackParamList = {
    HomeMain: undefined;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
    NativeStackScreenProps<HomeStackParamList, T>;

/** Screens inside the Pipeline tab's stack. */
export type PipelineStackParamList = {
    PipelineList: undefined;
    LeadDetail: { leadId: number; company: string };
    NewLead: undefined;
};

export type PipelineStackScreenProps<T extends keyof PipelineStackParamList> =
    NativeStackScreenProps<PipelineStackParamList, T>;

/**
 * Screens inside the More tab's stack. The design's bottom nav is Home ·
 * Pipeline · Schedule · More, with everything secondary (attendance,
 * canvassing, quotations, reports, notifications, sign-out) living under More.
 */
export type MoreStackParamList = {
    MoreMenu: undefined;
    Notifications: undefined;
    Attendance: undefined;
    CanvassList: undefined;
    CanvassArea: { areaId: number; name: string };
    Quotations: undefined;
    Reports: undefined;
    Targets: undefined;
    Products: undefined;
};

export type MoreStackScreenProps<T extends keyof MoreStackParamList> =
    NativeStackScreenProps<MoreStackParamList, T>;
