// /maps/<map>.svg — chart thumbnails used by cards (one cached file instead of inline SVG per card).
import type { APIRoute } from 'astro';
import { mapNames, standaloneSvg } from '../../lib/maps';

export const getStaticPaths = () => mapNames().map((map) => ({ params: { map } }));

export const GET: APIRoute = ({ params }) =>
  new Response(standaloneSvg(params.map!) ?? '', { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
