export function virtualPtEnabled() {
  return process.env.GYMOS_PT_VIRTUAL_ENABLED === '1';
}

export function ptQrEnabled() {
  return process.env.GYMOS_PT_QR_ENABLED === '1';
}
