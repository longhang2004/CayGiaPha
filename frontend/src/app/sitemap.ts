import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://cay-gia-pha-six.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://cay-gia-pha-six.vercel.app/signin',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://cay-gia-pha-six.vercel.app/signup',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://cay-gia-pha-six.vercel.app/help',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://cay-gia-pha-six.vercel.app/support',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }
  ];
}
