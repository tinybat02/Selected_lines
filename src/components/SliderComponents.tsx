import React, { Component, Fragment } from 'react';
import { SliderItem, GetEventData, GetRailProps, GetTrackProps, GetHandleProps } from 'react-compound-slider';
import './tooltip.css';

// *******************************************************
// TOOLTIP RAIL
// *******************************************************
const railStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  transform: 'translate(0%, -50%)',
  height: 40,
  cursor: 'pointer',
  zIndex: 300,
};

const railCenterStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  transform: 'translate(0%, -50%)',
  height: 14,
  borderRadius: 7,
  cursor: 'pointer',
  pointerEvents: 'none' as 'none',
  backgroundColor: 'rgb(155,155,155)',
};

interface TooltipRailProps {
  activeHandleID: string;
  getRailProps: GetRailProps;
  getEventData: GetEventData;
}

export class TooltipRail extends Component<TooltipRailProps> {
  state = {
    value: null,
    percent: null,
  };

  onMouseEnter = () => {
    document.addEventListener('mousemove', this.onMouseMove);
  };

  onMouseLeave = () => {
    this.setState({ value: null, percent: null });
    document.removeEventListener('mousemove', this.onMouseMove);
  };

  onMouseMove = (e: MouseEvent) => {
    const { activeHandleID, getEventData } = this.props;

    if (activeHandleID) {
      this.setState({ value: null, percent: null });
    } else {
      this.setState(getEventData(e));
    }
  };

  render() {
    const { value, percent } = this.state;
    const { activeHandleID, getRailProps } = this.props;

    return (
      <Fragment>
        {!activeHandleID && value ? (
          <div
            style={{
              left: `${percent}%`,
              position: 'absolute',
              marginLeft: '-11px',
              marginTop: '-35px',
            }}
          >
            <div className="tooltip-dev">
              <span className="tooltiptext">{value}</span>
            </div>
          </div>
        ) : null}
        <div
          style={railStyle}
          {...getRailProps({
            onMouseEnter: this.onMouseEnter,
            onMouseLeave: this.onMouseLeave,
          })}
        />
        <div style={railCenterStyle} />
      </Fragment>
    );
  }
}

// *******************************************************
// SLIDER RAIL (no tooltips)
// *******************************************************
const railOuterStyle: React.CSSProperties = {
  position: 'absolute',
  transform: 'translate(0%, -50%)',
  width: '100%',
  height: 40,
  // borderRadius: 7,
  cursor: 'pointer',
};

const railInnerStyle: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: 8,
  transform: 'translate(0%, -50%)',
  borderRadius: 4,
  pointerEvents: 'none',
  backgroundColor: 'rgb(155,155,155)',
};

interface SliderRailProps {
  getRailProps: GetRailProps;
}

export const SliderRail: React.FC<SliderRailProps> = ({ getRailProps }) => (
  <Fragment>
    <div style={railOuterStyle} {...getRailProps()} />
    <div style={railInnerStyle} />
  </Fragment>
);

// *******************************************************
// HANDLE COMPONENT
// *******************************************************
interface HandleProps {
  isActive: boolean;
  domain: number[];
  handle: SliderItem;
  getHandleProps: GetHandleProps;
  disabled?: boolean;
  format: (i: number) => number | string;
}

export class Handle extends Component<HandleProps> {
  state = {
    mouseOver: false,
  };

  onMouseEnter = () => {
    this.setState({ mouseOver: true });
  };

  onMouseLeave = () => {
    this.setState({ mouseOver: false });
  };

  render() {
    const {
      domain: [min, max],
      handle: { id, value, percent },
      isActive,
      disabled,
      getHandleProps,
      format,
    } = this.props;
    const { mouseOver } = this.state;

    return (
      <Fragment>
        {(mouseOver || isActive) && !disabled ? (
          <div
            style={{
              left: `${percent}%`,
              position: 'absolute',
              marginLeft: '-11px',
              marginTop: '-35px',
            }}
          >
            <div className="tooltip-dev">
              <span className="tooltiptext">{format(value)}</span>
            </div>
          </div>
        ) : null}
        <div
          style={{
            left: `${percent}%`,
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)',
            zIndex: 400,
            width: 26,
            height: 42,
            cursor: 'pointer',
            backgroundColor: 'none',
          }}
          {...getHandleProps(id, {
            onMouseEnter: this.onMouseEnter,
            onMouseLeave: this.onMouseLeave,
          })}
        />
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          style={{
            left: `${percent}%`,
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)',
            zIndex: 300,
            width: 20,
            height: 20,
            border: 0,
            borderRadius: '50%',
            boxShadow: '1px 1px 1px 1px rgba(0, 0, 0, 0.2)',
            backgroundColor: disabled ? '#666' : '#21618C',
          }}
        />
      </Fragment>
    );
  }
}

// *******************************************************
// TRACK COMPONENT
// *******************************************************
interface TrackProps {
  source: SliderItem;
  target: SliderItem;
  getTrackProps: GetTrackProps;
  disabled?: boolean;
}

export const Track: React.FC<TrackProps> = ({ source, target, getTrackProps, disabled }) => {
  return (
    <div
      style={{
        position: 'absolute',
        transform: 'translate(0%, -50%)',
        height: 10,
        zIndex: 1,
        backgroundColor: disabled ? '#999' : '#4d80a3',
        borderRadius: 7,
        cursor: 'pointer',
        left: `${source.percent}%`,
        width: `${target.percent - source.percent}%`,
      }}
      {...getTrackProps()}
    />
  );
};

// *******************************************************
// TICK COMPONENT
// *******************************************************
interface TickProps {
  tick: SliderItem;
  count: number;
  format?: (val: number) => string | number;
}

export const Tick: React.FC<TickProps> = ({ tick, count, format = (d) => d }) => {
  return (
    <div>
      <div
        style={{
          position: 'absolute',
          marginTop: 17,
          width: 1,
          height: 5,
          backgroundColor: 'rgb(200,200,200)',
          left: `${tick.percent}%`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          marginTop: 25,
          fontSize: 10,
          textAlign: 'center',
          marginLeft: `${-(100 / count) / 2}%`,
          width: `${100 / count}%`,
          left: `${tick.percent}%`,
        }}
      >
        {format(tick.value)}
      </div>
    </div>
  );
};
