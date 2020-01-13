import * as iam from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as cdk from '@aws-cdk/core';
import { users } from '../resources/users';

export class TryAwsIamStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const allowanceChangeOwnPasswordPolicy = new iam.ManagedPolicy(this, 'AllowanceChangeOwnPasswordPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'iam:CreateAccessKey',
            'iam:CreateVirtualMFADevice',
            'iam:DeactivateMFADevice',
            'iam:DeleteAccessKey',
            'iam:DeleteVirtualMFADevice',
            'iam:EnableMFADevice',
            'iam:UpdateAccessKey',
            'iam:UpdateSigningCertificate',
            'iam:UploadSigningCertificate',
            'iam:UpdateLoginProfile',
            'iam:ResyncMFADevice',
            // 'iam:ListAccessKeys',  ReadOnlyAccessついてるなら不要
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

    const adminGroup = new iam.Group(this, 'AdminGroup', {
      managedPolicies: [
        requireMfaPolicy,
        allowanceChangeOwnPasswordPolicy,
        iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('IAMUserChangePassword'),
      ],
    });

    const userResources = users.map(userName => {
      const secret = new secretsmanager.Secret(this, `${userName}ForUserSecret`, {
        generateSecretString: { passwordLength: 32 },
      });

      const output = new cdk.CfnOutput(this, `${userName}UserSecretValue`, {
        value: [
          'aws secretsmanager get-secret-value',
          `--secret-id ${secret.secretArn}`,
          `--region ${cdk.Aws.REGION}`,
          '--query SecretString',
          '--output text',
        ].join(' '),
      });

      const user = new iam.CfnUser(this, userName, {
        groups: [adminGroup.groupName],
        userName: userName,
        loginProfile: {
          passwordResetRequired: true,
          password: secret.secretValue.toString(),
        },
      });

      return { secret, output, user };
    });

    if (users.length !== 0) {
      const adminRole = new iam.CfnRole(this, 'AdminRole', {
        managedPolicyArns: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess').managedPolicyArn],
        assumeRolePolicyDocument: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              principals: users.map(user => new iam.ArnPrincipal(`arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:user/${user}`)),
              actions: ['sts:AssumeRole'],
              conditions: {
                Bool: {
                  'aws:MultiFactorAuthPresent': 'true',
                },
              },
            }),
          ],
        }),
      });
      userResources.forEach(({ user }) => adminRole.addDependsOn(user));
    }
  }
}
