declare module '@turf/turf' {
  import type * as GeoJSON from 'geojson';

  export function centroid(
    geojson: GeoJSON.Feature<GeoJSON.Geometry> | GeoJSON.Geometry
  ): GeoJSON.Feature<GeoJSON.Point>;

  export function transformRotate<T extends GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry>(
    geojson: T,
    angle: number,
    options?: { pivot?: [number, number] }
  ): T;

  export function destination(
    origin: [number, number],
    distance: number,
    bearing: number,
    options?: { units?: string }
  ): GeoJSON.Feature<GeoJSON.Point>;

  export function polygon(coords: number[][][]): GeoJSON.Feature<GeoJSON.Polygon>;

  export function circle(
    center: [number, number],
    radius: number,
    options?: { steps?: number; units?: string }
  ): GeoJSON.Feature<GeoJSON.Polygon>;

  export function bearing(
    start: [number, number],
    end: [number, number]
  ): number;

  export function distance(
    start: [number, number],
    end: [number, number],
    options?: { units?: string }
  ): number;

  export function transformTranslate<T extends GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry>(
    geojson: T,
    distance: number,
    direction: number,
    options?: { units?: string }
  ): T;
}


