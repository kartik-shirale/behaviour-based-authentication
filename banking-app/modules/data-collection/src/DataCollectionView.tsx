import { requireNativeView } from 'expo';
import * as React from 'react';

import { DataCollectionViewProps } from './DataCollection.types';

const NativeView: React.ComponentType<DataCollectionViewProps> =
  requireNativeView('DataCollection');

export default function DataCollectionView(props: DataCollectionViewProps) {
  return <NativeView {...props} />;
}
