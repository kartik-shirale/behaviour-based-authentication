// Reexport the native module. On web, it will be resolved to DataCollectionModule.web.ts
// and on native platforms to DataCollectionModule.ts
export { default } from './src/DataCollectionModule';
export { default as DataCollectionView } from './src/DataCollectionView';
export * from  './src/DataCollection.types';
