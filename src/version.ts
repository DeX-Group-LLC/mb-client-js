import packageJson from '../package.json';

export const VERSION = packageJson.version;
// Only allow versions that match the major version of the current version:
export const VERSION_RANGE = `^${VERSION.split('.')[0]}`;