import { NextResponse } from "next/server";

const repository = "owner/repository";
const assets = {
  dmg: "Example-arm64.dmg",
  deb: "Example-linux-amd64.deb",
  rpm: "Example-linux-x86_64.rpm",
  exe: "Example-windows-x64.exe",
};

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "dmg";
  const expected = Object.hasOwn(assets, format) ? assets[format as keyof typeof assets] : undefined;
  if (!expected) return new NextResponse("Unknown installer format", { status: 400 });

  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    next: { revalidate: 300 },
  });
  if (!response.ok) return new NextResponse("Unable to load releases", { status: response.status === 404 ? 404 : 502 });

  const release = await response.json() as { tag_name: string; assets: { name: string; state: string }[] };
  if (!release.tag_name.startsWith("desktop-v") || !release.assets.some(({ name, state }) => name === expected && state === "uploaded"))
    return new NextResponse("Installer unavailable", { status: 404 });

  return NextResponse.redirect(`https://github.com/${repository}/releases/download/${encodeURIComponent(release.tag_name)}/${expected}`);
}
