# Cloudinary image uploads

Create a Cloudinary Image & Video API Free account. Find your cloud name and API credentials in Console Settings > API Keys. Do not send the API secret in chat or commit it.

In Vercel > Project > Settings > Environment Variables, set:

| Key                   | Value                    |
| --------------------- | ------------------------ |
| CLOUDINARY_CLOUD_NAME | Your cloud name          |
| CLOUDINARY_API_KEY    | Your API key             |
| CLOUDINARY_API_SECRET | Your API secret (Secret) |

Select the deployment environments you use and redeploy after saving. No unsigned upload preset is required. Cloudinary credentials take priority over the existing S3 configuration. Keep `PAYMENTS_LIVE_ENABLED=false`.

Admin uploads remain authenticated, role checked, origin checked and rate limited. PNG/JPEG/WebP files are validated by their content and must be at most 5 MB. Secrets are used only on the backend; the browser receives the HTTPS image URL. Test uploading and saving a product, then check the storefront image after redeployment.

The Free plan has usage limits covering storage, bandwidth and transformations. Monitor usage and stay on the Free plan; no paid upgrade is required by this integration. Real provider uploads must be verified after credentials are configured.

References: [Cloudinary uploads](https://cloudinary.com/documentation/upload_images), [Free plan](https://cloudinary.com/documentation/developer_onboarding_faq_free_plan).
