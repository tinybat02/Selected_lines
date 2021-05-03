import React, { PureComponent } from 'react';
import { PanelProps, Vector as VectorData } from '@grafana/data';
import { MapOptions } from './types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom, DragRotateAndZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import ReactMultiSelectCheckboxes from 'react-multiselect-checkboxes';
import nanoid from 'nanoid';
import { CustomSlider } from './components/CustomSlider';
import { processData, produceLayerByTime, filterByTime, createObserverCircle } from './utils/helpers';
import { toLocalTime } from './utils/formatTime';
import 'ol/ol.css';
import './style/MainPanel.css';

interface Props extends PanelProps<MapOptions> {}
interface Buffer extends VectorData {
  buffer: any;
}

interface IState {
  colors: { [key: string]: string };
  all_hashs: string[];
  hash_list: string[];
  domain: number[];
  timepoint: number;
  iter: number;
  subRoute: { [key: string]: [number, number][] };
  subUncertainty: { [key: string]: number[] };
  subObserver: { [key: string]: Array<{ [key: string]: number }> };
  subError: { [key: string]: number[] };
}

const initState = {
  all_hashs: [],
  hash_list: [],
  colors: {},
  domain: [],
  timepoint: 0,
  iter: 0,
  subRoute: {},
  subUncertainty: {},
  subObserver: {},
  subError: {},
};

export class MainPanel extends PureComponent<Props, IState> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  lineLayer: VectorLayer;
  radiusLayer: VectorLayer;
  perDeviceRoute: { [key: string]: [number, number][] } = {};
  perDeviceTime: { [key: string]: number[] } = {};
  perDeviceUncertainty: { [key: string]: number[] } = {};
  perDeviceObserver: { [key: string]: Array<{ [key: string]: number }> } = {};
  perDeviceError: { [key: string]: number[] } = {};

  state: IState = { ...initState };

  componentDidMount() {
    const { tile_url, zoom_level, center_lon, center_lat } = this.props.options;
    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });
    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function (event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
        new DragRotateAndZoom(),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    if (this.props.data.series.length == 0) return;

    const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
    const {
      perDeviceRoute,
      perDeviceTime,
      perDeviceUncertainty,
      perDeviceObserver,
      perDeviceError,
      timeRange,
    } = processData(buffer);

    this.perDeviceRoute = perDeviceRoute;
    this.perDeviceTime = perDeviceTime;
    this.perDeviceUncertainty = perDeviceUncertainty;
    this.perDeviceObserver = perDeviceObserver;
    this.perDeviceError = perDeviceError;

    this.setState((prevState) => ({
      ...prevState,
      all_hashs: Object.keys(perDeviceTime).sort((a, b) => perDeviceTime[b].length - perDeviceTime[a].length),
      domain: timeRange,
      timepoint: timeRange[0],
    }));
  }

  componentDidUpdate(prevProps: Props, prevState: IState) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      this.map.removeLayer(this.lineLayer);
      this.map.removeLayer(this.radiusLayer);

      if (this.props.data.series.length == 0) {
        this.setState({ ...initState });
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      const {
        perDeviceRoute,
        perDeviceTime,
        perDeviceUncertainty,
        perDeviceObserver,
        perDeviceError,
        timeRange,
      } = processData(buffer);

      this.perDeviceRoute = perDeviceRoute;
      this.perDeviceTime = perDeviceTime;
      this.perDeviceUncertainty = perDeviceUncertainty;
      this.perDeviceObserver = perDeviceObserver;
      this.perDeviceError = perDeviceError;

      this.setState((prevState) => ({
        ...prevState,
        all_hashs: Object.keys(perDeviceTime).sort((a, b) => perDeviceTime[b].length - perDeviceTime[a].length),
        domain: timeRange,
        timepoint: timeRange[0],
      }));

      if (this.state.hash_list.length == 0) return;

      const { hash_list, colors } = this.state;
      const { timebound } = this.props.options;

      const { subRoute } = filterByTime(
        this.perDeviceRoute,
        this.perDeviceTime,
        this.perDeviceUncertainty,
        this.perDeviceObserver,
        this.perDeviceError,
        hash_list,
        timeRange[0],
        timebound
      );

      const { /* lineLayer, */ newcolors } = produceLayerByTime(subRoute, colors);

      // this.lineLayer = lineLayer;
      // this.map.addLayer(this.lineLayer);

      this.setState({ colors: newcolors });
    }

    if (prevState.timepoint != this.state.timepoint && this.state.timepoint != 0) {
      this.map.removeLayer(this.lineLayer);
      this.map.removeLayer(this.radiusLayer);

      const { hash_list, timepoint, colors } = this.state;
      const { timebound, devicesLocation } = this.props.options;

      if (hash_list.length == 0) return;

      const { subRoute, subUncertainty, subObserver, subError } = filterByTime(
        this.perDeviceRoute,
        this.perDeviceTime,
        this.perDeviceUncertainty,
        this.perDeviceObserver,
        this.perDeviceError,
        hash_list,
        timepoint,
        timebound
      );

      const { /* lineLayer, */ newcolors } = produceLayerByTime(subRoute, colors);

      // this.lineLayer = lineLayer;
      // this.map.addLayer(this.lineLayer);

      if (devicesLocation) {
        this.radiusLayer = createObserverCircle(
          subRoute,
          subUncertainty,
          subObserver,
          subError,
          0,
          devicesLocation,
          newcolors
        );
        this.map.addLayer(this.radiusLayer);
      }

      this.setState((prev) => ({
        ...prev,
        colors: newcolors,
        iter: 0,
        subRoute,
        subUncertainty,
        subObserver,
        subError,
      }));
    }

    if (prevState.iter != this.state.iter) {
      this.map.removeLayer(this.radiusLayer);

      if (!this.props.options.devicesLocation) return;

      const { subRoute, subUncertainty, subObserver, subError, iter, colors } = this.state;

      this.radiusLayer = createObserverCircle(
        subRoute,
        subUncertainty,
        subObserver,
        subError,
        iter,
        this.props.options.devicesLocation,
        colors
      );
      this.map.addLayer(this.radiusLayer);
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
  }

  handleChange = (selectOption: Array<{ label: string; value: string }>) => {
    this.map.removeLayer(this.lineLayer);
    this.map.removeLayer(this.radiusLayer);

    const hash_list = selectOption.map((item) => item.value);

    if (hash_list.length == 0) return;

    const { timepoint, colors, iter } = this.state;
    const { timebound, devicesLocation } = this.props.options;

    const { subRoute, subUncertainty, subObserver, subError } = filterByTime(
      this.perDeviceRoute,
      this.perDeviceTime,
      this.perDeviceUncertainty,
      this.perDeviceObserver,
      this.perDeviceError,
      hash_list,
      timepoint,
      timebound
    );

    const { /* lineLayer, */ newcolors } = produceLayerByTime(subRoute, colors);

    // this.lineLayer = lineLayer;
    // this.map.addLayer(this.lineLayer);

    if (devicesLocation) {
      this.radiusLayer = createObserverCircle(
        subRoute,
        subUncertainty,
        subObserver,
        subError,
        iter,
        devicesLocation,
        newcolors
      );
      this.map.addLayer(this.radiusLayer);
    }

    this.setState((prevState) => ({
      ...prevState,
      hash_list: hash_list,
      colors: newcolors,
      subRoute,
      subUncertainty,
      subObserver,
      subError,
    }));
  };

  onSlide = (value: number[]) => {
    this.setState({ timepoint: value[0] });
  };

  onIter = (type: string) => () => {
    const { iter, subRoute } = this.state;
    if (type == 'prev' && iter > 0) {
      this.setState({ iter: iter - 1 });
    }

    if (type == 'next' && iter < (Object.values(subRoute)[0] || []).length - 2) {
      this.setState({ iter: iter + 1 });
    }
  };

  render() {
    const { all_hashs, domain, timepoint, subRoute, iter, hash_list } = this.state;
    const { timezone } = this.props.options;

    return (
      <>
        <div style={{ display: 'flex', marginTop: 30, marginBottom: 20 }}>
          <ReactMultiSelectCheckboxes
            options={all_hashs.map((hash_id) => ({ label: hash_id, value: hash_id }))}
            onChange={this.handleChange}
          />
          <span style={{ margin: 10 }}>{timepoint}</span>
          {domain.length > 0 && (
            <CustomSlider
              domain={domain}
              defaultValues={domain.slice(0, 1)}
              mode={1}
              step={1}
              trackRight={false}
              trackLeft={true}
              defaultTicks={domain}
              format={(d) => toLocalTime(d, timezone)}
              setValue={this.onSlide}
            />
          )}
          {hash_list.length > 0 && (
            <>
              <div>
                {iter + 1}/{(Object.values(subRoute)[0] || []).length - 1}
              </div>
              <button className="btn-route" onClick={this.onIter('prev')}>
                Prev
              </button>
              <button className="btn-route" onClick={this.onIter('next')}>
                Next
              </button>{' '}
            </>
          )}
        </div>
        <div id={this.id} style={{ width: '100%', height: '90%' }}></div>
      </>
    );
  }
}
