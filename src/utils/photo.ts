import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export type Photo = { uri: string; dataUrl: string };

// Longest edge sent to the server. The server stores photos at 1080px anyway,
// and decoding a 32–50 MP camera original there can exhaust PHP's memory.
const MAX_EDGE = 1080;

/** Downscale a camera capture and return it as a JPEG data URL (small, fast to upload). */
export async function shrinkPhoto(asset: ImagePickerAsset): Promise<Photo> {
    try {
        const ctx = ImageManipulator.manipulate(asset.uri);
        const { width, height } = asset;
        if (Math.max(width, height) > MAX_EDGE) {
            ctx.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
        }
        const ref = await ctx.renderAsync();
        const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
        if (out.base64) return { uri: out.uri, dataUrl: `data:image/jpeg;base64,${out.base64}` };
    } catch (e) {
        console.warn('Photo downscale failed, using original:', e);
    }
    // Fallback: original capture (picker already compressed it).
    return { uri: asset.uri, dataUrl: `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` };
}
