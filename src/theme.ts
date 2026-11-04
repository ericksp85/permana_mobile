/**
 * Permana brand tokens — mirrored from the web app's Tailwind @theme so the
 * native app and the console/PWA read as one product.
 */
export const colors = {
    navy: '#034a6b',
    blue: '#02638e',
    teal: '#00b5be',
    tealDark: '#00737a',
    ink: '#0b2a3c',
    mutedink: '#5e7180',
    line: '#e1e9ee',
    softbg: '#f3f7f9',
    white: '#ffffff',
    success: '#1e9e6a',
    warning: '#e8a317',
    danger: '#d94848',
} as const;

/** Pipeline stage pill colors (bg / fg), keyed by LeadStage value. */
export const stageColors: Record<string, { bg: string; fg: string }> = {
    new: { bg: '#e8eff4', fg: '#2c5d78' },
    follow: { bg: '#ddf5f6', fg: '#00737a' },
    meeting: { bg: '#e9edfb', fg: '#3a52a8' },
    quote: { bg: '#fff2d6', fg: '#8a5e00' },
    nego: { bg: '#f1e8fb', fg: '#6e3fa8' },
    won: { bg: '#dff3e8', fg: '#137347' },
    lost: { bg: '#fbe6e6', fg: '#a83434' },
};

export const radius = {
    card: 18,
    btn: 12,
    pill: 999,
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
} as const;
