import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export async function compressImage(uri: string): Promise<string> {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult.uri;
}

export async function uploadImage(
  uri: string,
  bucket: string,
  path: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const compressedUri = await compressImage(uri);
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `${path}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
