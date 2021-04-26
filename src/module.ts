// @ts-ignore
import { PanelPlugin } from '@grafana/ui';
import { MapOptions, defaults } from './types';
import { MainPanel } from './MainPanel';
import { PanelEditor } from './PanelEditor';

export const plugin = new PanelPlugin<MapOptions>(MainPanel).setDefaults(defaults).setEditor(PanelEditor);
