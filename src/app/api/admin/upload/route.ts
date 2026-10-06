import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireUser, checkOrigin, HttpError, rateLimit } from '@/lib/security';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(true);
    await rateLimit(`upload:${user.id}`, 100, 3600);
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size === 0)
      throw new HttpError(400, 'Upload a PNG, JPEG, or WebP image up to 5 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!png && !jpg && !webp)
      throw new HttpError(400, 'Unsupported image format. SVG uploads are not accepted.');
    const ext = png ? 'png' : jpg ? 'jpg' : 'webp';
    const key = `products/${randomUUID()}.${ext}`;
    const contentType = png ? 'image/png' : jpg ? 'image/jpeg' : 'image/webp';
    let url: string;
    if (process.env.STORAGE_BUCKET) {
      if (!process.env.STORAGE_PUBLIC_URL) throw new Error('STORAGE_PUBLIC_URL required');
      const client = new S3Client({
        region: process.env.STORAGE_REGION || 'ap-south-1',
        endpoint: process.env.STORAGE_ENDPOINT || undefined,
        forcePathStyle: !!process.env.STORAGE_ENDPOINT,
        credentials: process.env.STORAGE_ACCESS_KEY
          ? {
              accessKeyId: process.env.STORAGE_ACCESS_KEY,
              secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
            }
          : undefined,
      });
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.STORAGE_BUCKET,
          Key: key,
          Body: bytes,
          ContentType: contentType,
        }),
      );
      url = `${process.env.STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    } else {
      if (process.env.NODE_ENV === 'production')
        throw new HttpError(503, 'Object storage is required for production uploads.');
      const filename = key.split('/')[1];
      await mkdir(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
      await writeFile(path.join(process.cwd(), 'public', 'uploads', filename), bytes);
      url = `/uploads/${filename}`;
    }
    return NextResponse.json({ url });
  } catch (e) {
    console.error(
      JSON.stringify({
        event: 'upload_error',
        message: e instanceof Error ? e.message : 'Unknown',
      }),
    );
    return NextResponse.json(
      { error: e instanceof HttpError ? e.message : 'Upload failed. Please try again.' },
      { status: e instanceof HttpError ? e.status : 500 },
    );
  }
}
