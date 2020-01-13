import { IAM } from 'aws-sdk';
import { users } from '../resources/users';
const ignoreUsers = new Set(['sisisin']);
const managedUsers = new Set<string>(users);

export async function preDeploy() {
  const iam = new IAM();
  const mfaDevices = await iam.listVirtualMFADevices().promise();

  const deleteTargets = mfaDevices.VirtualMFADevices.filter(d => {
    const isRoot = d.User?.UserName === undefined;
    if (isRoot) return false;

    const shouldIgnore = ignoreUsers.has(d.User?.UserName!);
    if (shouldIgnore) return false;

    const isDeletedUser = !managedUsers.has(d.User?.UserName!);
    return isDeletedUser;
  });

  for (const mfa of deleteTargets) {
    await iam.deactivateMFADevice({ SerialNumber: mfa.SerialNumber, UserName: mfa.User?.UserName ?? '' }).promise();
    await iam.deleteVirtualMFADevice({ SerialNumber: mfa.SerialNumber }).promise();
  }
}

export async function preDestroy() {
  const iam = new IAM();
  const mfaDevices = await iam.listVirtualMFADevices().promise();

  const deleteTargets = mfaDevices.VirtualMFADevices.filter(d => {
    const isRoot = d.User?.UserName === undefined;
    if (isRoot) return false;

    const shouldIgnore = ignoreUsers.has(d.User?.UserName!);
    if (shouldIgnore) return false;

    return true;
  });

  for (const mfa of deleteTargets) {
    await iam.deactivateMFADevice({ SerialNumber: mfa.SerialNumber, UserName: mfa.User?.UserName ?? '' }).promise();
    await iam.deleteVirtualMFADevice({ SerialNumber: mfa.SerialNumber }).promise();
  }
}
