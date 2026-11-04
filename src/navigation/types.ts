import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Screens inside the Pipeline tab's stack. */
export type PipelineStackParamList = {
    PipelineList: undefined;
    LeadDetail: { leadId: number; company: string };
};

export type PipelineStackScreenProps<T extends keyof PipelineStackParamList> =
    NativeStackScreenProps<PipelineStackParamList, T>;

/** Screens inside the Canvass tab's stack. */
export type CanvassStackParamList = {
    CanvassList: undefined;
    CanvassArea: { areaId: number; name: string };
};

export type CanvassStackScreenProps<T extends keyof CanvassStackParamList> =
    NativeStackScreenProps<CanvassStackParamList, T>;
