import { preDestroy } from './lib';

preDestroy().catch(err => {
  console.error(err);
  process.exit(1);
});
