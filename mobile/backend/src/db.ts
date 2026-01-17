import { DataSource } from 'typeorm';
import { appDataSource } from './data-source';

let promise: Promise<DataSource> | null = null;

export const getDataSource = async (): Promise<DataSource> => {
  if (appDataSource.isInitialized) {
    return appDataSource;
  }

  if (!promise) {
    promise = appDataSource.initialize().catch((error) => {
      promise = null;
      throw error;
    });
  }

  return promise;
};
