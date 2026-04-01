/** Matches multer memory-storage file shape without requiring @types/multer */
export type UploadedVideoFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};
