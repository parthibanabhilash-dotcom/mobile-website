import { afterEach, expect, it, vi } from 'vitest';
import { uploadCloudinary } from '../src/lib/cloudinary';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const file = () => new File(['image'], 'phone.png', { type: 'image/png' });
function configure() {
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'shop-test');
  vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
}
it('requires complete credentials before contacting the provider', async () => {
  configure();
  vi.stubEnv('CLOUDINARY_API_SECRET', '');
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  await expect(uploadCloudinary(file())).rejects.toThrow('Configure Cloudinary');
  expect(request).not.toHaveBeenCalled();
});
it('uploads through the backend and returns a secure image URL', async () => {
  configure();
  const url = 'https://res.cloudinary.com/shop-test/image/upload/v1/phone.png';
  const request = vi.fn().mockResolvedValue(Response.json({ secure_url: url }));
  vi.stubGlobal('fetch', request);
  await expect(uploadCloudinary(file())).resolves.toBe(url);
  const [endpoint, options] = request.mock.calls[0];
  expect(endpoint).toBe('https://api.cloudinary.com/v1_1/shop-test/image/upload');
  expect(options.method).toBe('POST');
  expect(options.headers.Authorization).toBe(
    `Basic ${Buffer.from('test-key:test-secret').toString('base64')}`,
  );
  expect(options.body.get('file').name).toBe('phone.png');
});
it('does not expose provider errors or accept external delivery URLs', async () => {
  configure();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ error: 'secret' }, { status: 401 })),
  );
  await expect(uploadCloudinary(file())).rejects.toThrow('Cloudinary upload failed');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ secure_url: 'https://evil.example/phone.png' })),
  );
  await expect(uploadCloudinary(file())).rejects.toThrow('invalid image URL');
});
