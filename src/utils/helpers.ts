import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Coordinate } from 'ol/coordinate';
import LineString from 'ol/geom/LineString';
import { Circle, Stroke, Style, Fill, RegularShape } from 'ol/style';

interface SingleData {
  latitude: number;
  longitude: number;
  hash_id: string;
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
      image: new Circle({
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

  const reorderData = routeData.slice(0).reverse();

  const lineFeature = new Feature(new LineString(reorderData).transform('EPSG:4326', 'EPSG:3857'));

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

  const perDeviceRoute: { [key: string]: [number, number][] } = {};
  const perDeviceTime: { [key: string]: number[] } = {};

  data.map((datum) => {
    if (perDeviceRoute[datum.hash_id]) {
      perDeviceRoute[datum.hash_id].push([datum.longitude, datum.latitude]);
      perDeviceTime[datum.hash_id].push(datum.timestamp);
    } else {
      perDeviceRoute[datum.hash_id] = [[datum.longitude, datum.latitude]];
      perDeviceTime[datum.hash_id] = [datum.timestamp];
    }
  });

  return { perDeviceRoute, perDeviceTime, timeRange };
};

export const produceLayer = (
  perDevice: { [key: string]: [number, number][] },
  hash_list: string[],
  colors: { [key: string]: string }
) => {
  const filter_absent_hash = hash_list.filter((hash_id) => perDevice[hash_id]);

  const dataLines = filter_absent_hash.map((hash_id) => {
    if (!colors[hash_id]) colors[hash_id] = randomColor();

    return drawFeature(perDevice[hash_id], colors[hash_id]);
  });

  const lineLayer = new VectorLayer({
    source: new VectorSource({
      features: dataLines,
    }),
    zIndex: 2,
  });

  return { lineLayer, newcolors: colors };
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
