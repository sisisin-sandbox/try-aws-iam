import * as cdk from '@aws-cdk/core';
import { TryAwsIamStack } from './try-aws-iam-stack';

export function main() {
  const app = new cdk.App();
  new TryAwsIamStack(app, 'TryAwsIamStack');
}
