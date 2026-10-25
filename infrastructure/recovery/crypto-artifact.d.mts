import type { Readable } from 'node:stream';

export type BackupMetadata = {
  scope: 'DISPOSABLE_DEVELOPMENT';
  sourceRunId: string;
  kind: 'MASTER' | 'TENANT';
  gymId: string | null;
  manifestDigest: string;
  snapshotAt: string;
  observedOperationsAt: string;
  toolVersion: string;
  format: 'postgres-custom';
  counts: Record<string, number>;
  dataDigest: string;
};

export function createEncryptedBackup(input: {
  directory: string;
  tempRoot: string;
  keyFile: string;
  metadata: BackupMetadata;
  verifySource(metadata: BackupMetadata): Promise<void>;
  producer(): Promise<{ readable: Readable; completion: Promise<void>; cancel?(): Promise<void> }>;
}): Promise<{ artifactId: string; manifestPath: string; manifest: Record<string, unknown> }>;

export function withVerifiedArchive<Result>(
  input: { manifestPath: string; keyFile: string; tempRoot: string; expected: Record<string, string | null> },
  callback: (archivePath: string, metadata: BackupMetadata, manifest: Record<string, unknown>) => Promise<Result>,
): Promise<Result>;
