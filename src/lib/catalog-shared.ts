export type ShopVariant = {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  ram: string;
  storage: string;
  price: number;
  originalPrice: number;
  stock: number;
  reserved: number;
};
export type ShopProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  warranty: string;
  specifications: Record<string, string>;
  brand: string;
  category: string;
  badge: string;
  featured: boolean;
  status: string;
  images: string[];
  variants: ShopVariant[];
  rating: number;
  reviewCount: number;
  demo?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};
const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export const money = (paise: number) => rupees.format(paise / 100);
export const categories = ['Smartphones', 'Audio', 'Wearables', 'Chargers', 'Cases'];
export const brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Anker', 'Spigen'];
