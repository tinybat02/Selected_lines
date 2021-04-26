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
import { processData, produceLayerByTime, filterByTime } from './utils/helpers';
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
}

export class MainPanel extends PureComponent<Props, IState> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  lineLayer: VectorLayer;
  perDeviceRoute: { [key: string]: [number, number][] } = {};
  perDeviceTime: { [key: string]: number[] } = {};

  state: IState = {
    colors: {},
    all_hashs: [],
    hash_list: [],
    domain: [],
    timepoint: 0,
  };

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
    const { perDeviceRoute, perDeviceTime, timeRange } = processData(buffer);

    this.perDeviceRoute = perDeviceRoute;
    this.perDeviceTime = perDeviceTime;

    this.setState((prevState) => ({
      ...prevState,
      all_hashs: Object.keys(perDeviceTime),
      domain: timeRange,
      timepoint: timeRange[0],
    }));
  }

  componentDidUpdate(prevProps: Props, prevState: IState) {
    if (prevProps.data.series[0] !== this.props.data.series[0]) {
      this.map.removeLayer(this.lineLayer);

      if (this.props.data.series.length == 0) {
        this.setState({ all_hashs: [], hash_list: [], colors: {}, domain: [], timepoint: 0 });
        return;
      }

      const { buffer } = this.props.data.series[0].fields[0].values as Buffer;
      const { perDeviceRoute, perDeviceTime, timeRange } = processData(buffer);

      this.perDeviceRoute = perDeviceRoute;
      this.perDeviceTime = perDeviceTime;

      this.setState((prevState) => ({
        ...prevState,
        all_hashs: Object.keys(perDeviceTime),
        domain: timeRange,
        timepoint: timeRange[0],
      }));

      if (this.state.hash_list.length == 0) return;

      const { hash_list, colors } = this.state;
      const { timebound } = this.props.options;

      const toDisplay = filterByTime(this.perDeviceRoute, this.perDeviceTime, hash_list, timeRange[0], timebound);

      const { lineLayer, newcolors } = produceLayerByTime(toDisplay, colors);

      this.lineLayer = lineLayer;

      this.map.addLayer(this.lineLayer);
      this.setState({ colors: newcolors });
    }

    if (prevState.timepoint != this.state.timepoint && this.state.timepoint != 0) {
      this.map.removeLayer(this.lineLayer);
      const { hash_list, timepoint, colors } = this.state;
      const { timebound } = this.props.options;

      if (hash_list.length == 0) return;

      const toDisplay = filterByTime(this.perDeviceRoute, this.perDeviceTime, hash_list, timepoint, timebound);

      const { lineLayer, newcolors } = produceLayerByTime(toDisplay, colors);

      this.lineLayer = lineLayer;
      this.map.addLayer(this.lineLayer);

      this.setState({ colors: newcolors });
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

    const hash_list = selectOption.map((item) => item.value);

    const { timepoint, colors } = this.state;
    const { timebound } = this.props.options;

    const toDisplay = filterByTime(this.perDeviceRoute, this.perDeviceTime, hash_list, timepoint, timebound);

    const { lineLayer, newcolors } = produceLayerByTime(toDisplay, colors);

    this.lineLayer = lineLayer;

    this.map.addLayer(this.lineLayer);

    this.setState((prevState) => ({ ...prevState, hash_list: hash_list, colors: newcolors }));
  };

  onSlide = (value: number[]) => {
    this.setState({ timepoint: value[0] });
  };

  render() {
    const { all_hashs, domain, timepoint } = this.state;
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
        </div>
        <div id={this.id} style={{ width: '100%', height: '90%' }}></div>
      </>
    );
  }
}
