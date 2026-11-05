/**
 * Global Plus Jakarta Sans wiring.
 *
 * The design (docs/design/Permana Sales.dc.html) sets `font-family:'Plus Jakarta
 * Sans'` on the whole app and leans on weights 400–800. React Native loads each
 * weight as its own family, so `fontWeight` alone cannot select a face. We map
 * fontWeight → the matching Jakarta family once, globally, by wrapping the
 * default Text/TextInput render — that way the 13 existing screens keep using
 * plain `fontWeight: '700'` and still render in Jakarta ExtraBold/Bold/etc.
 */
import React from 'react';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

/** Font map passed to `useFonts` in App.tsx. */
export const jakartaFontMap = {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
};

const WEIGHT_TO_FAMILY: Record<string, string> = {
    '100': 'PlusJakartaSans_400Regular',
    '200': 'PlusJakartaSans_400Regular',
    '300': 'PlusJakartaSans_400Regular',
    '400': 'PlusJakartaSans_400Regular',
    normal: 'PlusJakartaSans_400Regular',
    '500': 'PlusJakartaSans_500Medium',
    '600': 'PlusJakartaSans_600SemiBold',
    '700': 'PlusJakartaSans_700Bold',
    bold: 'PlusJakartaSans_700Bold',
    '800': 'PlusJakartaSans_800ExtraBold',
    '900': 'PlusJakartaSans_800ExtraBold',
};

function applyFont(style: unknown) {
    const flat = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
    // An explicit fontFamily (e.g. a monospace price) wins — leave it alone.
    if (flat.fontFamily) return style;
    const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400';
    const family = WEIGHT_TO_FAMILY[weight] ?? WEIGHT_TO_FAMILY['400'];
    // Drop fontWeight so the platform doesn't try to synthesize a heavier cut
    // of an already-weighted face.
    const { fontWeight, ...rest } = flat;
    return [{ fontFamily: family }, rest];
}

let installed = false;

/** Patch Text/TextInput once so their styles default to the Jakarta family. */
export function installJakartaFont(): void {
    if (installed) return;
    installed = true;
    for (const Comp of [RNText, RNTextInput] as unknown as {
        render?: (...args: unknown[]) => React.ReactElement;
    }[]) {
        const orig = Comp.render;
        if (typeof orig !== 'function') continue;
        Comp.render = function patchedRender(...args: unknown[]) {
            const el = orig.apply(this, args);
            return React.cloneElement(el, {
                style: applyFont((el.props as { style?: unknown }).style),
            } as Partial<typeof el.props>);
        };
    }
}
