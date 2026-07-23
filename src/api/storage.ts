import {decode} from 'base64-arraybuffer';
import {supabaseAdmin} from './supabase';

export async function uploadEvidencePhoto(
  taskId: string,
  base64Data: string,
  fileName: string = 'evidence.jpg',
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const ext = fileName.split('.').pop() || 'jpg';
  const timeStamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filePath = `${taskId}/${timeStamp}_${randomStr}.${ext}`;

  const arrayBuffer = decode(base64Data);

  const {data, error} = await supabaseAdmin.storage
    .from('evidence-files')
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Gagal upload foto ke Supabase Storage: ${error.message}`);
  }

  const {data: urlData} = supabaseAdmin.storage
    .from('evidence-files')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
