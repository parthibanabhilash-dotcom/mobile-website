import { Prisma } from '@prisma/client';
import { db, demoMode } from './db';
import { demoProducts } from './catalog-data';
import { productInclude, toProduct } from './catalog';
export async function queryCatalog(params: URLSearchParams) {
  const q = (params.get('q') || '').trim().slice(0, 100),
    category = params.get('category'),
    brand = params.get('brand'),
    ram = params.get('ram'),
    storage = params.get('storage'),
    collection = params.get('collection'),
    sort = params.get('sort') || 'featured';
  const max =
    params.get('suggest') === 'true'
      ? 100000000
      : Math.max(100, Math.min(100000000, (Number(params.get('max')) || 150000) * 100));
  const stock = params.get('inStock') === 'true',
    offers = params.get('offers') === 'true';
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.get('page')) || 1))),
    take = params.get('suggest') === 'true' ? 5 : 9;
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 8);
  if (demoMode()) {
    let products = demoProducts.filter(
      (p) =>
        terms.every((term) =>
          `${p.title} ${p.brand} ${p.category}`.toLowerCase().includes(term.toLowerCase()),
        ) &&
        (!category || p.category === category) &&
        (!brand || p.brand === brand) &&
        (collection !== 'accessories' || p.category !== 'Smartphones') &&
        (collection !== 'new' || p.badge.includes('NEW')) &&
        p.variants.some(
          (v) =>
            v.price <= max &&
            (!ram || v.ram === ram) &&
            (!storage || v.storage === storage) &&
            (!stock || v.stock - v.reserved > 0) &&
            (!offers || v.price < v.originalPrice),
        ),
    );
    if (sort === 'low') products.sort((a, b) => a.variants[0].price - b.variants[0].price);
    if (sort === 'high') products.sort((a, b) => b.variants[0].price - a.variants[0].price);
    if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
    return {
      products: products.slice((page - 1) * take, page * take),
      total: products.length,
      demo: true,
    };
  }
  let ids: string[] | undefined;
  if (stock || offers) {
    const rows = await db.$queryRaw<
      { productId: string }[]
    >`SELECT DISTINCT \`productId\` FROM \`Variant\` WHERE (${!stock} OR \`stock\` - \`reserved\` > 0) AND (${!offers} OR \`price\` < \`originalPrice\`) AND \`price\` <= ${max} AND (${!ram} OR \`ram\` = ${ram || ''}) AND (${!storage} OR \`storage\` = ${storage || ''})`;
    ids = rows.map((r) => r.productId);
  }
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(q
      ? {
          AND: terms.map((term) => ({
            OR: [
              { title: { contains: term } },
              { brand: { name: { contains: term } } },
              { category: { name: { contains: term } } },
            ],
          })),
        }
      : {}),
    ...(category
      ? { category: { name: category } }
      : collection === 'accessories'
        ? { category: { name: { not: 'Smartphones' } } }
        : {}),
    ...(brand ? { brand: { name: brand } } : {}),
    ...(collection === 'new' ? { badge: { contains: 'NEW' } } : {}),
    ...(ids ? { id: { in: ids } } : {}),
    variants: {
      some: { price: { lte: max }, ...(ram ? { ram } : {}), ...(storage ? { storage } : {}) },
    },
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'low'
      ? { minPrice: 'asc' }
      : sort === 'high'
        ? { minPrice: 'desc' }
        : sort === 'rating'
          ? { ratingScore: 'desc' }
          : { createdAt: 'desc' };
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      take,
      skip: (page - 1) * take,
      orderBy: [orderBy, { id: 'asc' }],
    }),
    params.get('suggest') === 'true' ? Promise.resolve(0) : db.product.count({ where }),
  ]);
  return { products: products.map(toProduct), total };
}
