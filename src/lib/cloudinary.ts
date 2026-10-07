import { HttpError } from './security';

export async function uploadCloudinary(file: File): Promise<string> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !/^[a-z0-9_-]+$/i.test(cloud) || !key || !secret)
    throw new HttpError(503, 'Configure Cloudinary cloud name, API key and API secret in Vercel.');
  const form = new FormData();
  form.set('file', file);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
    body: form,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      'Cloudinary upload failed. Check your API credentials and free-plan usage.',
    );
  const data = await response.json();
  const url = typeof data.secure_url === 'string' ? new URL(data.secure_url) : null;
  if (
    !url ||
    url.protocol !== 'https:' ||
    url.hostname !== 'res.cloudinary.com' ||
    !url.pathname.startsWith(`/${cloud}/image/upload/`)
  )
    throw new HttpError(502, 'Cloudinary returned an invalid image URL.');
  return url.toString();
}
