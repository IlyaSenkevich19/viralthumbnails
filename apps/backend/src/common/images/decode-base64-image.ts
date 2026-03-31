import { BadRequestException } from '@nestjs/common';

/** Decodes a raw or data-URL base64 image payload from the API. */
export function decodeBase64Image(
  input: string,
  mimeHint?: string,
): { buffer: Buffer; mimeType: string } {
  let raw = input.trim();
  let mimeType = mimeHint?.trim() || 'image/png';
  const dataUrl = /^data:([^;]+);base64,(.+)$/is.exec(raw);
  if (dataUrl) {
    mimeType = dataUrl[1].trim();
    raw = dataUrl[2].replace(/\s/g, '');
  } else {
    raw = raw.replace(/\s/g, '');
  }
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) {
    throw new BadRequestException('Invalid base64 image');
  }
  return { buffer, mimeType };
}
