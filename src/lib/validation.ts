import { z } from 'zod';
export const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());
export const password = z.string().min(10, 'Use at least 10 characters').max(128);
export const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().max(200).default(''),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid six-digit pincode'),
  label: z.string().max(30).default('Home'),
});
export const cartSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().max(100), quantity: z.number().int().min(1).max(10) }))
    .max(50),
});
export const variantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().min(1).max(100),
    color: z.string().min(1).max(60),
    colorHex: z.string().regex(/^#[\da-fA-F]{6}$/),
    ram: z.string().min(1).max(30),
    storage: z.string().min(1).max(30),
    price: z.number().int().min(1).max(100000000),
    originalPrice: z.number().int().min(1).max(100000000),
    stock: z.number().int().min(0).max(100000),
  })
  .refine((v) => v.originalPrice >= v.price, {
    message: 'Original price must be at least the offer price',
  });
export const productSchema = z.object({
  title: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  subtitle: z.string().max(200),
  description: z.string().min(10).max(10000),
  warranty: z.string().min(2).max(2000),
  brand: z.string().min(1).max(60),
  category: z.string().min(1).max(60),
  specifications: z.record(z.string().max(100), z.string().max(500)),
  badge: z.string().max(30),
  featured: z.boolean(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']),
  seoTitle: z.string().max(160).default(''),
  seoDescription: z.string().max(300).default(''),
  images: z
    .array(
      z
        .string()
        .regex(/^(\/products\/|\/uploads\/|https:\/\/)/)
        .max(2000),
    )
    .min(1)
    .max(10),
  variants: z.array(variantSchema).min(1).max(30),
});
