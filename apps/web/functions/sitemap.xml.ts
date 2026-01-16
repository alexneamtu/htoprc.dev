interface Env {
  VITE_API_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  // Determine API URL based on hostname
  let apiUrl: string;
  if (url.hostname === 'htoprc.dev' || url.hostname === 'www.htoprc.dev') {
    apiUrl = 'https://api.htoprc.dev';
  } else if (url.hostname === 'staging.htoprc.dev') {
    apiUrl = 'https://api-staging.htoprc.dev';
  } else {
    // Local development or preview deployments
    apiUrl = context.env.VITE_API_URL || 'https://api-staging.htoprc.dev';
  }

  const response = await fetch(`${apiUrl}/sitemap.xml`);

  if (!response.ok) {
    return new Response('Sitemap not available', { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
