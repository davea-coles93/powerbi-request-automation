declare module 'react-cytoscapejs' {
  import { Component } from 'react';
  import { Core, ElementDefinition, Stylesheet, LayoutOptions } from 'cytoscape';

  export interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    style?: React.CSSProperties;
    stylesheet?: Stylesheet[];
    layout?: LayoutOptions;
    cy?: (cy: Core) => void;
    pan?: { x: number; y: number };
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    autoungrabify?: boolean;
    autounselectify?: boolean;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}
