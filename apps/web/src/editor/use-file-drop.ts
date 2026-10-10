import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

export function useFileDrop(disabled: boolean, onFile: (file: File) => void) {
  const [active, setActive] = useState(false);
  const dragDepth = useRef(0);

  return {
    active,
    dragHandlers: {
      onDragEnter(event: DragEvent<HTMLElement>) {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        if (disabled) return;
        dragDepth.current += 1;
        setActive(true);
      },
      onDragOver(event: DragEvent<HTMLElement>) {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave() {
        if (dragDepth.current === 0) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setActive(false);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        dragDepth.current = 0;
        setActive(false);
        if (disabled) return;
        const files = Array.from(event.dataTransfer.files);
        const file = files[0];
        if (files.length !== 1 || file === undefined) {
          toast.error('Drop one JSON file at a time.');
          return;
        }
        onFile(file);
      },
    },
  };
}
