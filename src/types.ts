import { Coordinate } from 'ol/coordinate';

export interface DevicesLocation {
  [key: string]: Coordinate;
}

export interface GeoJSON {
  features: Array<{
    type: string;
    properties: {
      IP: string;
      name: string;
      ref: string;
      id: string;
    };
    geometry: {
      type: string;
      coordinates: [number, number];
    };
  }>;
}

export interface MapOptions {
  center_lat: number;
  center_lon: number;
  tile_url: string;
  zoom_level: number;
  timezone: string;
  timebound: number;
  devicesLocation: { [key: string]: Coordinate } | null;
}

export const defaults: MapOptions = {
  center_lat: 48.262725,
  center_lon: 11.66725,
  tile_url: '',
  zoom_level: 18,
  timezone: 'Europe/Berlin',
  timebound: 30,
  devicesLocation: null,
};
