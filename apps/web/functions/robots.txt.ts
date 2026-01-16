export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  let sitemapHost: string;
  if (url.hostname === 'htoprc.dev' || url.hostname === 'www.htoprc.dev') {
    sitemapHost = 'https://htoprc.dev';
  } else if (url.hostname === 'staging.htoprc.dev') {
    sitemapHost = 'https://staging.htoprc.dev';
  } else {
    // Preview deployments and local dev
    sitemapHost = url.origin;
  }

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${sitemapHost}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
