import { preDeploy } from './lib';

preDeploy().catch(err => {
  console.error(err);
  process.exit(1);
});
