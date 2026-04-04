/** Only the first N seconds are sent for analysis (trimmed on the client when needed). */
export const VIDEO_ANALYSIS_MAX_SECONDS = 5 * 60;

/**
 * Client-side trim loads the entire file into memory (ffmpeg.wasm).
 * Above this size we ask for a shorter clip instead of trimming in the browser.
 */
export const VIDEO_TRIM_MAX_INPUT_BYTES = 280 * 1024 * 1024;
