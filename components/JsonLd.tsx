import { site } from "@/lib/site";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.legalName,
        alternateName: site.name,
        url: site.url,
        email: site.email,
        logo: `${site.url}/brand/fields-brandmark-locked-alpha.png`,
        founder: {
          "@type": "Person",
          name: site.founder.legalName,
          alternateName: site.founder.shortName,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Cassville",
          addressRegion: "MO",
          addressCountry: "US",
        },
        areaServed: "US",
        description: site.description,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.legalName,
        publisher: { "@id": `${site.url}/#organization` },
        description: site.description,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
