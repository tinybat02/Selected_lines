import React, { Component } from 'react';
import { Slider, Rail, Handles, Tracks, Ticks } from 'react-compound-slider';
import { SliderRail, Handle, Track, Tick } from './SliderComponents';

const sliderStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
};

interface IProps {
  domain: number[];
  defaultValues: number[];
  mode: 1 | 2 | 3;
  step: number;
  trackRight: boolean;
  trackLeft: boolean;
  defaultTicks: number[];
  format: (i: number) => string | number;
  setValue: (value: number[]) => void;
}

interface IState {}

export class CustomSlider extends Component<IProps, IState> {
  state = {
    values: this.props.defaultValues.slice(),
    update: this.props.defaultValues.slice(),
  };

  onUpdate = (update: ReadonlyArray<number>) => {
    this.setState({ update });
  };

  onChange = (values: ReadonlyArray<number>) => {
    this.setState({ values });
    this.props.setValue(values.slice());
  };

  render() {
    const { domain, mode, step, trackLeft, trackRight, defaultTicks, format } = this.props;
    const {
      state: { values },
    } = this;

    return (
      <div style={{ margin: '0px auto', padding: 15, height: 20, width: '90%' }}>
        <Slider
          mode={mode}
          step={step}
          domain={domain}
          rootStyle={sliderStyle}
          onUpdate={this.onUpdate}
          onChange={this.onChange}
          values={values}
        >
          <Rail>{({ getRailProps }) => <SliderRail getRailProps={getRailProps} />}</Rail>
          <Handles>
            {({ handles, activeHandleID, getHandleProps }) => (
              <div className="slider-handles">
                {handles.map((handle) => (
                  <Handle
                    key={handle.id}
                    handle={handle}
                    domain={domain}
                    isActive={handle.id === activeHandleID}
                    getHandleProps={getHandleProps}
                    format={format}
                  />
                ))}
              </div>
            )}
          </Handles>
          <Tracks right={trackRight} left={trackLeft}>
            {({ tracks, getTrackProps }) => (
              <div className="slider-tracks">
                {tracks.map(({ id, source, target }) => (
                  <Track key={id} source={source} target={target} getTrackProps={getTrackProps} />
                ))}
              </div>
            )}
          </Tracks>
          <Ticks values={defaultTicks}>
            {({ ticks }) => (
              <div className="slider-ticks">
                {ticks.map((tick) => (
                  <Tick key={tick.id} tick={tick} count={ticks.length} format={format} />
                ))}
              </div>
            )}
          </Ticks>
        </Slider>
      </div>
    );
  }
}
