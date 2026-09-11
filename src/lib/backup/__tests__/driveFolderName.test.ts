import { resolveDriveFolderName } from '../driveFolderName';

describe('resolveDriveFolderName', () => {
  it('resolves a distinct folder name per mode', () => {
    expect(resolveDriveFolderName('visible_folder')).toBe('Cofrinho');
    expect(resolveDriveFolderName('app_data_folder')).toBe('Cofrinho (app data)');
    expect(resolveDriveFolderName('visible_folder')).not.toBe(
      resolveDriveFolderName('app_data_folder'),
    );
  });
});
