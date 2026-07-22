# @recharts/devtools

Devtools for Recharts.

[![npm version](https://badge.fury.io/js/@recharts%2Fdevtools.svg)](https://badge.fury.io/js/@recharts%2Fdevtools)

## Installation

```bash
npm install @recharts/devtools --save-dev
```

## Usage

### Basic Usage

Import the `RechartsDevtools` component and render it inside of your chart.

Add a div with specific ID where the devtools will render a portal.

```tsx
import { RechartsDevtools, RECHARTS_DEVTOOLS_PORTAL_ID } from '@recharts/devtools';
import { AreaChart } from 'recharts';

function App() {
  return (
    <article>
      <AreaChart>
        {/* The DevTools component reads state from inside of the chart */}
        <RechartsDevtools />
      </AreaChart>
        {/* The Portal component renders the devtools UI, debugging information, hooks and other stuff */}
      <div id={RECHARTS_DEVTOOLS_PORTAL_ID} />
    </article>
  );
}
```

### Multiple Instances (Context Mode)

If you have multiple charts or devtools instances on the same page (e.g., in a documentation site with live editors), you should use the `RechartsDevtoolsContext` and `RechartsDevtoolsPortal` to ensure each devtools instance targets the correct location without ID conflicts.

1. Wrap your chart and editor/devtools area with `RechartsDevtoolsContext`. One context for one devtools.
2. Place `RechartsDevtoolsPortal` where you want the devtools UI to be rendered.
3. `RechartsDevtools` will automatically detect the context and render into the associated portal.

```tsx
import { RechartsDevtools, RechartsDevtoolsContext, RechartsDevtoolsPortal } from '@recharts/devtools';
import { AreaChart, LineChart } from 'recharts';

function EditorWithPreview() {
  return (
    <RechartsDevtoolsContext>
        <AreaChart>
          <RechartsDevtools />
        </AreaChart>
        <RechartsDevtoolsPortal />
    </RechartsDevtoolsContext>
      
    <RechartsDevtoolsContext>
        <LineChart>
          <RechartsDevtools />
        </LineChart>
        <RechartsDevtoolsPortal />
    </RechartsDevtoolsContext>
  );
}
```
