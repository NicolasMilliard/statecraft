import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { filterCommands, formatShortcut, runCommand, type EditorCommand, type ShortcutPlatform } from './commands';

interface CommandPaletteProps {
  readonly commands: readonly EditorCommand[];
  readonly platform: ShortcutPlatform;
  readonly onClose: () => void;
  readonly onRestoreFocus: () => void;
}

export function CommandPalette({ commands, platform, onClose, onRestoreFocus }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);
  const id = useId();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const filtered = filterCommands(commands, query);
  const active = filtered.find((command) => command.id === activeId) ?? filtered.find((command) => command.enabled) ?? filtered[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRef.current?.focus();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    const option = listRef.current?.querySelector('[aria-selected="true"]');
    option?.scrollIntoView({ block: 'nearest' });
  }, [active?.id]);

  function close() {
    dialogRef.current?.close();
    onClose();
    onRestoreFocus();
  }

  function execute(command: EditorCommand) {
    if (!command.enabled) return;
    // Close synchronously so focus and file pickers run in the original user gesture.
    close();
    runCommand(command);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      className="command-palette"
      onCancel={(event) => { event.preventDefault(); if (!composing.current) close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const activeElement = document.activeElement;
          if (event.shiftKey && activeElement === closeButtonRef.current) {
            event.preventDefault();
            inputRef.current?.focus();
          } else if (!event.shiftKey && activeElement === inputRef.current) {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        if (event.key.toLowerCase() === 'k' && (platform === 'mac' ? event.metaKey : event.ctrlKey) && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) close();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={`${id}-title`} className="text-ui font-medium">Commands</h2>
        <Button ref={closeButtonRef} variant="secondary" onClick={close} aria-label="Close commands">Esc</Button>
      </div>
      <div className="p-3">
        <TextInput
          ref={inputRef}
          role="combobox"
          aria-label="Search commands"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={active === undefined ? undefined : `${id}-${active.id}`}
          autoComplete="off"
          placeholder="Search commands…"
          value={query}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          onChange={(event) => { setQuery(event.target.value); setActiveId(null); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const current = filtered.findIndex((command) => command.id === active?.id);
              const direction = event.key === 'ArrowDown' ? 1 : -1;
              const next = filtered[(current + direction + filtered.length) % filtered.length];
              setActiveId(next?.id ?? null);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (!event.repeat && active !== undefined) execute(active);
            }
          }}
        />
      </div>
      <ul ref={listRef} id={`${id}-list`} role="listbox" tabIndex={-1} aria-label="Available commands" className="max-h-[min(22rem,45dvh)] overflow-y-auto overscroll-contain px-2 pb-2">
        {filtered.map((command) => (
          <li
            key={command.id}
            id={`${id}-${command.id}`}
            role="option"
            aria-label={command.label}
            aria-selected={command.id === active?.id}
            aria-disabled={!command.enabled}
            onPointerMove={() => setActiveId(command.id)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => execute(command)}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2 text-ui aria-selected:bg-brand-soft aria-selected:text-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          >
            <span>{command.label}<span aria-hidden="true" className="ml-2 text-xs text-muted">{command.group}</span></span>
            {command.shortcuts?.[0] !== undefined && <kbd className="shrink-0 font-mono text-xs">{formatShortcut(command.shortcuts[0], platform)}</kbd>}
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p role="status" className="px-5 py-6 text-ui text-muted">No matching commands.</p>}
      <div className="flex flex-wrap justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted">
        <span>↑ ↓ Navigate · Enter Run · Esc Close</span>
        <span>{filtered.length} commands</span>
      </div>
    </dialog>
  );
}
