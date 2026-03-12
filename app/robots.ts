import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/citizen/'],
      },
    ],
    sitemap: 'https://samadhan-ai.vercel.app/sitemap.xml',
  };
}
