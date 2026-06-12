import { registerPlugin } from '@capacitor/core';

export interface AppUpdatePlugin {
  installApk(options: { filePath: string }): Promise<void>;
  verifyFileSha256(options: { filePath: string; sha256: string }): Promise<{ valid: boolean; sha256: string }>;
}

export const AppUpdateNative = registerPlugin<AppUpdatePlugin>('AppUpdate');
