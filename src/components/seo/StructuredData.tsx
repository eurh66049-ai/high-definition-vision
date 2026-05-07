import { Helmet } from 'react-helmet-async';

interface BookStructuredDataProps {
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverImageUrl?: string;
    category: string;
    rating?: number;
    reviewCount?: number;
    publishedDate?: string;
    language?: string;
    pageCount?: number;
  };
}

interface AuthorStructuredDataProps {
  author: {
    id: string;
    name: string;
    bio?: string;
    avatarUrl?: string;
    website?: string;
    booksCount?: number;
    followersCount?: number;
    nationality?: string;
  };
}

interface WebsiteStructuredDataProps {
  organizationData?: {
    name?: string;
    url?: string;
    logo?: string;
    description?: string;
    sameAs?: string[];
  };
}

export const BookStructuredData = ({ book }: BookStructuredDataProps) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": book.title,
    "author": {
      "@type": "Person",
      "name": book.author
    },
    "description": book.description,
    "image": book.coverImageUrl || "/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png",
    "genre": book.category,
    "inLanguage": book.language || "ar",
    "numberOfPages": book.pageCount,
    "datePublished": book.publishedDate,
    "publisher": {
      "@type": "Organization",
      "name": "منصة كتبي"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "url": `https://kotobi.xyz/book/${book.id}`,
    "isAccessibleForFree": true,
    "license": "https://creativecommons.org/licenses/by/4.0/",
    ...(book.rating && book.reviewCount && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": book.rating,
        "ratingCount": book.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      }
    })
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const AuthorStructuredData = ({ author }: AuthorStructuredDataProps) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": author.name,
    "description": author.bio,
    "image": author.avatarUrl || "/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png",
    "url": `https://kotobi.xyz/author/${author.id}`,
    "jobTitle": "مؤلف",
    "worksFor": {
      "@type": "Organization",
      "name": "منصة كتبي"
    },
    "nationality": author.nationality,
    "award": `${author.booksCount || 0} كتاب منشور`,
    "follows": `${author.followersCount || 0} متابع`
  };

  if (author.website) {
    structuredData["sameAs"] = [author.website];
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export const WebsiteStructuredData = ({ organizationData }: WebsiteStructuredDataProps) => {
  const defaultOrgData = {
    name: "منصة كتبي",
    url: "https://kotobi.xyz",
    logo: "https://kotobi.xyz/lovable-uploads/b1cd70fc-5c3b-47ac-ba45-cc3236f7c840.png",
    description: "المكتبة الرقمية العربية المجانية - اكتشف آلاف الكتب العربية المجانية",
    sameAs: [
      "https://facebook.com/kotobi.app",
      "https://twitter.com/kotobi_app",
      "https://instagram.com/kotobi.app"
    ]
  };

  const orgData = { ...defaultOrgData, ...organizationData };

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": orgData.name,
    "url": orgData.url,
    "description": orgData.description,
    "inLanguage": "ar",
    "publisher": {
      "@type": "Organization",
      "name": orgData.name,
      "logo": {
        "@type": "ImageObject",
        "url": orgData.logo
      },
      "sameAs": orgData.sameAs
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://kotobi.xyz/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": orgData.name,
    "url": orgData.url,
    "logo": orgData.logo,
    "description": orgData.description,
    "sameAs": orgData.sameAs,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["Arabic", "English"]
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(websiteStructuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData)}
      </script>
    </Helmet>
  );
};