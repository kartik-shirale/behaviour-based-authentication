import * as React from 'react';

import { DataCollectionViewProps } from './DataCollection.types';

export default function DataCollectionView(props: DataCollectionViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
