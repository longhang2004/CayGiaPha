import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/settings/', '/internal/'],
    },
    sitemap: 'https://cay-gia-pha-six.vercel.app/sitemap.xml',
  };
}
