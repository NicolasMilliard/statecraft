import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMMAND_DEFINITIONS,
  ariaShortcut,
  createCommands,
  filterCommands,
  formatShortcut,
  getShortcutPlatform,
  runCommand,
  type CommandId,
} from '../src/editor/commands.ts';
import { handleCommandShortcut } from '../src/editor/command-shortcuts.ts';

type KeyEvent = Parameters<typeof handleCommandShortcut>[0];
type Context = Parameters<typeof handleCommandShortcut>[2];

function setup(disabled: Partial<Record<CommandId, boolean>> = {}) {
  const executed: CommandId[] = [];
  const actions = Object.fromEntries(Object.keys(COMMAND_DEFINITIONS).map((id) => [
    id, () => { executed.push(id as CommandId); },
  ])) as Record<CommandId, () => void>;
  const commands = createCommands(actions, disabled);

  function press(overrides: Partial<KeyEvent>, context: Partial<Context> = {}) {
    let prevented = false;
    let stopped = false;
    const handled = handleCommandShortcut({
      key: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      isComposing: false, keyCode: 0, repeat: false, defaultPrevented: false,
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
      ...overrides,
    }, commands, { platform: 'mac', editingText: false, canvasFocused: true, modalOpen: false, ...context });
    return { handled, prevented, stopped };
  }
  return { executed, commands, press };
}

test('uses the platform modifier and logical key for undo and redo', () => {
  const { press, executed } = setup();
  press({ key: 'z', metaKey: true });
  press({ key: 'Z', metaKey: true, shiftKey: true });
  press({ key: 'z', ctrlKey: true }, { platform: 'other' });
  press({ key: 'Z', ctrlKey: true, shiftKey: true }, { platform: 'other' });
  assert.deepEqual(executed, ['undo', 'redo', 'undo', 'redo']);
});

test('does not capture other browser and OS modifier combinations', () => {
  const { press, executed } = setup();
  for (const event of [
    { key: 'z', ctrlKey: true },
    { key: 'z', metaKey: true, altKey: true },
    { key: 's', metaKey: true, shiftKey: true },
    { key: 'k', metaKey: true, ctrlKey: true },
    { key: 'Backspace', altKey: true },
  ]) assert.equal(press(event).handled, false);
  assert.deepEqual(executed, []);
});

test('preserves native text undo, select-all and deletion', () => {
  const { press, executed } = setup();
  for (const event of [
    { key: 'z', metaKey: true },
    { key: 'Z', metaKey: true, shiftKey: true },
    { key: 'a', metaKey: true },
    { key: 'Delete' }, { key: 'Backspace' }, { key: 'Escape' },
  ]) assert.equal(press(event, { editingText: true }).prevented, false);
  assert.deepEqual(executed, []);
  press({ key: 'k', metaKey: true }, { editingText: true });
  press({ key: 's', metaKey: true }, { editingText: true });
  assert.deepEqual(executed, ['commands', 'save']);
});

test('limits selection commands to canvas focus', () => {
  const { press, executed } = setup();
  for (const event of [{ key: 'a', metaKey: true }, { key: 'Delete' }, { key: 'Backspace' }, { key: 'Escape' }]) {
    assert.equal(press(event, { canvasFocused: false }).handled, false);
    assert.equal(press(event).handled, true);
  }
  assert.deepEqual(executed, ['select-all', 'delete-selection', 'delete-selection', 'cancel']);
});

test('ignores composition, handled events and an open modal', () => {
  const { press, executed } = setup();
  for (const event of [{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
    assert.equal(press({ key: 'k', metaKey: true, ...event }).handled, false);
  }
  assert.equal(press({ key: 'z', metaKey: true }, { modalOpen: true }).handled, false);
  assert.deepEqual(executed, []);
});

test('consumes disabled or repeated shortcuts without running them', () => {
  const { press, executed, commands } = setup({ save: false, 'delete-selection': false });
  assert.deepEqual(press({ key: 's', metaKey: true }), { handled: true, prevented: true, stopped: true });
  press({ key: 'Delete' });
  press({ key: 'k', metaKey: true, repeat: true });
  assert.equal(runCommand(commands.save), false);
  assert.deepEqual(executed, []);
});

test('buttons and shortcuts execute the same action', () => {
  const { press, executed, commands } = setup();
  runCommand(commands.undo);
  press({ key: 'z', metaKey: true });
  assert.deepEqual(executed, ['undo', 'undo']);
});

test('searches command labels and groups, including disabled actions', () => {
  const { commands } = setup({ redo: false });
  const list = Object.values(commands);
  assert.deepEqual(filterCommands(list, '  NODE SERVICE ').map((item) => item.id), ['add-service']);
  assert.deepEqual(filterCommands(list, 'history').map((item) => item.id), ['undo', 'redo']);
  assert.equal(filterCommands(list, 'redo')[0]?.enabled, false);
  assert.equal(filterCommands(list, 'not-a-command').length, 0);
  assert.ok(filterCommands(list, '').every((item) => item.id !== 'commands' && item.id !== 'cancel'));
});

test('formats visible and accessible shortcuts for both platforms', () => {
  const redo = { key: 'z', mod: true, shift: true };
  assert.equal(getShortcutPlatform('MacIntel'), 'mac');
  assert.equal(getShortcutPlatform('Win32'), 'other');
  assert.equal(getShortcutPlatform('Linux x86_64'), 'other');
  assert.equal(formatShortcut(redo, 'mac'), '⌘⇧Z');
  assert.equal(formatShortcut(redo, 'other'), 'Ctrl+Shift+Z');
  assert.equal(ariaShortcut(redo, 'mac'), 'Meta+Shift+z');
  assert.equal(ariaShortcut(redo, 'other'), 'Control+Shift+z');
});
