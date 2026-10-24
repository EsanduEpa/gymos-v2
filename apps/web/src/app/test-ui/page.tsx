import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { UiTestHarness } from './ui-test-harness';

export const instant = false;

export default async function UiTestPage() {
  await connection();
  if (process.env.GYMOS_UI_TEST_HARNESS !== '1') notFound();
  return <UiTestHarness />;
}
