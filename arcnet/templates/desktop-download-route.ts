import { NextResponse } from "next/server";

const app = "example";
const repository = "mp-lb/releases";
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

  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/main/feeds/${app}/release.json`,
    { next: { revalidate: 300 } },
  );
  if (!response.ok)
    return new NextResponse("Unable to load releases", { status: response.status === 404 ? 404 : 502 });

  const release = await response.json() as { tag: string; assets: Record<string, string> };
  const url = `https://github.com/${repository}/releases/download/${release.tag}/${expected}`;
  if (!release.tag.startsWith(`${app}-desktop-v`) || release.assets[expected] !== url)
    return new NextResponse("Installer unavailable", { status: 404 });

  return NextResponse.redirect(url);
}
