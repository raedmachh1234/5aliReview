import { absoluteUrl } from "@/config/site";

/** The permanent URL written onto the NFC chip. */
export function cardNfcUrl(code: string): string {
  return absoluteUrl(`/t/${code}`);
}

/** Same link for the printed QR code, tagged so scans are counted separately from taps. */
export function cardQrUrl(code: string): string {
  return absoluteUrl(`/t/${code}?s=qr`);
}
