import { useCallback, useRef, useState } from 'react';

/** Voice notes, straight from the microphone. Nothing leaves the device. */
export function useRecorder() {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      started.current = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.start();
      recorder.current = rec;
      setIsRecording(true);
    } catch {
      setError('Microphone unavailable — check the browser permission.');
    }
  }, []);

  const stop = useCallback(
    () =>
      new Promise<{ url: string; duration: number } | null>((resolve) => {
        const rec = recorder.current;
        if (!rec) return resolve(null);
        rec.onstop = () => {
          const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
          rec.stream.getTracks().forEach((t) => t.stop());
          setIsRecording(false);
          const reader = new FileReader();
          // data URL, not object URL: the note must survive a reload like the text does
          reader.onload = () =>
            resolve({ url: String(reader.result), duration: Math.round((Date.now() - started.current) / 1000) });
          reader.readAsDataURL(blob);
        };
        rec.stop();
      }),
    []
  );

  return { isRecording, error, start, stop };
}
