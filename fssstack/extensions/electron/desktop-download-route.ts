import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch("https://api.github.com/repos/owner/repository/releases?per_page=30", {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    next: { revalidate: 300 },
  });
  if (!response.ok) return new NextResponse('Unable to load releases', { status: 502 });
  const releases = await response.json() as Array<{ tag_name: string; draft: boolean; prerelease: boolean; published_at: string | null; assets: Array<{ name: string; browser_download_url: string }> }>;
  const release = releases.filter((item) => item.tag_name.startsWith('desktop-v') && !item.draft && !item.prerelease).sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))[0];
  const asset = release?.assets.find((item) => item.name.endsWith('.dmg'));
  return asset ? NextResponse.redirect(asset.browser_download_url) : new NextResponse('No desktop release yet', { status: 404 });
}
