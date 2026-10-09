// A copy of a picked file's bytes, taken once, right after the pick. Chrome checks a picked file's modification time
// on every later read and upload, and fails them once it has moved (net::ERR_UPLOAD_FILE_CHANGED, NotReadableError).
// On Android that happens to a video another app is still finishing, such as one Telegram has just downloaded; the
// copy can't change under the metadata check, the preview or the upload. It costs the video's size in memory while
// the video stays selected.
export const readFileSnapshot = async (file: File): Promise<File> => {
    const bytes = await file.arrayBuffer()

    return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified })
}
