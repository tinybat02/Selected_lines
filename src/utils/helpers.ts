import Feature from 'ol/Feature';
import { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import Circle from 'ol/geom/Circle';
import { Circle as CircleStyle, Stroke, Style, Fill, RegularShape, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { DevicesLocation, GeoJSON } from '../types';

interface SingleData {
  latitude: number;
  longitude: number;
  hash_id: string;
  devices: { [key: string]: number };
  uncertainty: number;
  error: number;
  [key: string]: any;
}

function randomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export const createPoint = (lonlat: Coordinate, color: string) => {
  const pointFeature = new Feature(new Point(lonlat).transform('EPSG:4326', 'EPSG:3857'));
  pointFeature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({ color: color }),
      }),
    })
  );

  return pointFeature;
};

export const drawFeature = (routeData: Coordinate[], color: string) => {
  if (routeData.length == 1) {
    return createPoint(routeData[0], color);
  }

  // const reorderData = routeData.slice(0).reverse();

  const lineFeature = new Feature(new LineString(routeData).transform('EPSG:4326', 'EPSG:3857'));

  const styles = [
    new Style({
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
    }),
  ];

  const geometry = lineFeature.getGeometry() as LineString;
  if (geometry) {
    geometry.forEachSegment(function (start, end) {
      var dx = end[0] - start[0];
      var dy = end[1] - start[1];
      var rotation = Math.atan2(dy, dx);
      styles.push(
        new Style({
          geometry: new Point(end),
          image: new RegularShape({
            fill: new Fill({ color: color }),
            points: 3,
            radius: 8,
            rotateWithView: true,
            rotation: -rotation,
            angle: Math.PI / 2,
          }),
        })
      );
    });
  }

  lineFeature.setStyle(styles);

  return lineFeature;
};

export const processData = (data: SingleData[]) => {
  const timeRange = [data.slice(-1)[0].timestamp, data[0].timestamp];

  data.reverse();
  const perDeviceRoute: { [key: string]: [number, number][] } = {};
  const perDeviceTime: { [key: string]: number[] } = {};
  const perDeviceUncertainty: { [key: string]: number[] } = {};
  const perDeviceObserver: { [key: string]: Array<{ [key: string]: number }> } = {};
  const perDeviceError: { [key: string]: number[] } = {};

  data.map((datum) => {
    if (perDeviceRoute[datum.hash_id]) {
      perDeviceRoute[datum.hash_id].push([datum.longitude, datum.latitude]);
      perDeviceTime[datum.hash_id].push(datum.timestamp);
      perDeviceUncertainty[datum.hash_id].push(datum.uncertainty || 0);
      perDeviceObserver[datum.hash_id].push(datum.devices || {});
      perDeviceError[datum.hash_id].push(datum.error || 0);
    } else {
      perDeviceRoute[datum.hash_id] = [[datum.longitude, datum.latitude]];
      perDeviceTime[datum.hash_id] = [datum.timestamp];
      perDeviceUncertainty[datum.hash_id] = [datum.uncertainty || 0];
      perDeviceObserver[datum.hash_id] = [datum.devices || {}];
      perDeviceError[datum.hash_id] = [datum.error || 0];
    }
  });

  return { perDeviceRoute, perDeviceTime, perDeviceUncertainty, perDeviceObserver, perDeviceError, timeRange };
};

export const produceLayerByTime = (
  routeData: { [key: string]: [number, number][] },
  colors: { [key: string]: string }
) => {
  const lineFeatures = Object.keys(routeData).map((hash_id) => {
    if (!colors[hash_id]) colors[hash_id] = randomColor();
    return drawFeature(routeData[hash_id], colors[hash_id]);
  });
  const lineLayer = new VectorLayer({
    source: new VectorSource({
      features: lineFeatures,
    }),
    zIndex: 2,
  });

  return { lineLayer, newcolors: colors };
};

export const filterByTime = (
  routeData: { [key: string]: [number, number][] },
  routeTime: { [key: string]: number[] },
  routeUncertainty: { [key: string]: number[] },
  routeObserver: { [key: string]: Array<{ [key: string]: number }> },
  routeError: { [key: string]: number[] },
  hash_list: string[],
  timepoint: number,
  timebound: number
) => {
  const subRoute: { [key: string]: [number, number][] } = {};
  const subUncertainty: { [key: string]: number[] } = {};
  const subObserver: { [key: string]: Array<{ [key: string]: number }> } = {};
  const subError: { [key: string]: number[] } = {};

  hash_list.map((hash) => {
    if (routeTime[hash]) {
      subRoute[hash] = [];
      subUncertainty[hash] = [];
      subObserver[hash] = [];
      subError[hash] = [];

      for (let i = 0; i < routeTime[hash].length; i++) {
        if (routeTime[hash][i] >= timepoint - timebound && routeTime[hash][i] <= timepoint + timebound) {
          subRoute[hash].push(routeData[hash][i]);
          subUncertainty[hash].push(routeUncertainty[hash][i]);
          subObserver[hash].push(routeObserver[hash][i]);
          subError[hash].push(routeError[hash][i]);
        }
      }
    }
  });

  Object.keys(subRoute).map((k) => {
    if (subRoute[k].length == 0) delete subRoute[k];
  });
  Object.keys(subUncertainty).map((k) => {
    if (subUncertainty[k].length == 0) delete subUncertainty[k];
  });
  Object.keys(subObserver).map((k) => {
    if (subObserver[k].length == 0) delete subObserver[k];
  });

  Object.keys(subError).map((k) => {
    if (subError[k].length == 0) delete subError[k];
  });

  return { subRoute, subUncertainty, subObserver, subError };
};

export const parseDeviceLocation = (geojson: GeoJSON) => {
  const devicesLocation: { [key: string]: Coordinate } = {};
  geojson.features.map((feature) => {
    devicesLocation[feature.properties.id.replace(':', '').toLocaleLowerCase()] = fromLonLat(
      feature.geometry.coordinates
    );
  });

  return devicesLocation;
};

export const createObserverCircle = (
  subRoute: { [key: string]: [number, number][] },
  subUncertainty: { [key: string]: number[] },
  subObserver: { [key: string]: Array<{ [key: string]: number }> },
  subError: { [key: string]: number[] },
  iter: number,
  devicesLocation: DevicesLocation
) => {
  const radiusFeature: Feature[] = [];
  Object.keys(subRoute).map((hash_id) => {
    const point = new Feature(new Circle(fromLonLat(subRoute[hash_id][iter]), subUncertainty[hash_id][iter]));
    const center = new Feature(new Circle(fromLonLat(subRoute[hash_id][iter]), 2));
    point.setStyle(
      new Style({
        stroke: new Stroke({ color: '#FFA040', width: 2 }),
      })
    );
    center.setStyle(
      new Style({
        stroke: new Stroke({ color: '#fff', width: 1 }),
        fill: new Fill({ color: '#fff' }),
        text: new Text({
          stroke: new Stroke({
            color: '#b7b7b7',
            width: 1,
          }),
          font: '10px/1 sans-serif',
          text: `${subError[hash_id][iter].toFixed(3)}`,
        }),
      })
    );

    radiusFeature.push(point, center);
  });

  Object.keys(subObserver).map((hash_id) => {
    Object.keys(subObserver[hash_id][iter]).map((device_id) => {
      if (devicesLocation[device_id]) {
        const circle = new Feature(new Circle(devicesLocation[device_id], subObserver[hash_id][iter][device_id]));
        circle.set('label', `${device_id}\n${subObserver[hash_id][iter][device_id].toFixed(3)}`);
        radiusFeature.push(circle);
      }
    });
  });

  return new VectorLayer({
    source: new VectorSource({
      features: radiusFeature,
    }),

    style: function (feature: FeatureLike) {
      const label = feature.get('label');
      return new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.05)',
        }),
        stroke: new Stroke({
          color: '#49A8DE',
          width: 2,
        }),
        text: new Text({
          stroke: new Stroke({
            color: '#b7b7b7',
            width: 1,
          }),
          font: '10px/1 sans-serif',
          text: label,
        }),
      });
    },
    zIndex: 2,
  });
};
