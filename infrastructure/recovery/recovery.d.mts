import type { BackupMetadata } from './crypto-artifact.mjs';

export function restoreIntoNewOwnedTarget(
  options: { manifestPath: string; keyFile: string; tempRoot: string; expected: Record<string, string | null> },
  adapters: {
    guardCurrentRun(metadata: BackupMetadata): Promise<void>;
    createNewOwnedTarget(): Promise<unknown>;
    restoreArchive(input: { target: any; archive: string; exitOnError: true; singleTransaction: true; clean: false }): Promise<void>;
    verifyActualRestore(input: { target: any; metadata: BackupMetadata }): Promise<{ schemaVerified: boolean; bindingVerified: boolean; dataVerified: boolean } & Record<string, unknown>>;
    markOwnedTargetFailed(target: any): Promise<void>;
  },
): Promise<{ state: 'RESTORED_UNSELECTED'; target: any; verification: { schemaVerified: boolean; bindingVerified: boolean; dataVerified: boolean } & Record<string, unknown> }>;

export function switchTenantRegistry(request: any, adapters: any): Promise<{ version: number }>;
export function reconcileMasterReferences(restored: any, current: any): {
  state: 'REPAIR_REQUIRED' | 'REVIEW_REQUIRED';
  issues: Array<Record<string, unknown>>;
  proposals: Array<Record<string, unknown>>;
  automaticActivationAllowed: false;
};
