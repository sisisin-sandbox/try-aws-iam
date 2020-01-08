#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { TryAwsIamStack } from '../lib/try-aws-iam-stack';

const app = new cdk.App();
new TryAwsIamStack(app, 'TryAwsIamStack');
