import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class TryAwsIamStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const allowanceChangeOwnPasswordPolicy = new iam.ManagedPolicy(this, 'AllowanceChangeOwnPasswordPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:ChangePassword',
            'iam:CreateAccessKey',
            'iam:CreateVirtualMFADevice',
            'iam:DeactivateMFADevice',
            'iam:DeleteAccessKey',
            'iam:DeleteVirtualMFADevice',
            'iam:EnableMFADevice',
            'iam:GetAccountPasswordPolicy',
            'iam:UpdateAccessKey',
            'iam:UpdateSigningCertificate',
            'iam:UploadSigningCertificate',
            'iam:UpdateLoginProfile',
            'iam:ResyncMFADevice',
            'iam:ListAccessKeys',
          ],
          resources: [
            `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:user/\${aws:username}`,
            `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:mfa/\${aws:username}`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:user/`],
          actions: ['iam:ListUsers'],
        }),
      ],
    });
    const requireMfaPolicy = new iam.ManagedPolicy(this, 'RequireMFAPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          notActions: ['iam:*'],
          resources: ['*'],
          conditions: {
            BoolIfExists: {
              'aws:MultiFactorAuthPresent': 'false',
            },
          },
        }),
      ],
    });

    const adminGroup = new iam.Group(this, 'Admins', {
      managedPolicies: [
        requireMfaPolicy,
        allowanceChangeOwnPasswordPolicy,
        iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
      ],
    });

    const secret = new secretsmanager.Secret(this, 'ForUserSecret', {
      generateSecretString: { passwordLength: 32 },
    });

    new cdk.CfnOutput(this, 'UserSecretValue', {
      value: [
        'aws secretsmanager get-secret-value',
        `--secret-id ${secret.secretArn}`,
        `--region ${cdk.Aws.REGION}`,
        '--query SecretString',
        '--output text',
      ].join(' '),
    });

    new iam.User(this, 'sisisin-operator', {
      groups: [adminGroup],
      userName: 'sisisin-operator',
      passwordResetRequired: true,
      password: secret.secretValue,
    });
  }
}
