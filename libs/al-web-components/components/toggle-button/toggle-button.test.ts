import {fixture,html,waitUntil} from '@open-wc/testing-helpers';
import {describe,it,expect} from 'vitest';
import './toggle-button';
import type {ALToggleButton} from './toggle-button';

describe('toggle button keyboard contract',()=>{
 it('uses compact spacing for short content after its first layout',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button label="Add item">+</al-toggle-button>`);
  await waitUntil(()=>el.isSmall===true);
  await el.updateComplete;
  expect(el.shadowRoot!.querySelector('.al-c-toggle-button--small')).not.toBeNull();
  expect(el.shadowRoot!.querySelector('[role="button"]')!.getAttribute('aria-label')).toBe('Add item');
 });
 it('announces its role and pressed state and uses Space like a click',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button variant="background" hasToggle>Toggle</al-toggle-button>`);
  await el.updateComplete;
  const control=el.shadowRoot!.querySelector<HTMLElement>('[role="button"]')!;
  expect(control.getAttribute('aria-pressed')).toBe('false');
  const space=new KeyboardEvent('keydown',{code:'Space',bubbles:true,composed:true,cancelable:true});
  control.dispatchEvent(space);await el.updateComplete;
  expect(space.defaultPrevented).toBe(true);
  expect(control.getAttribute('aria-pressed')).toBe('true');
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true,composed:true}));
  await el.updateComplete;
  expect(control.getAttribute('aria-pressed')).toBe('false');
 });
 it('leaves a slotted input keyboard event alone',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button><input aria-label="Filter"></al-toggle-button>`);
  await el.updateComplete;
  const input=el.querySelector('input')!;
  const event=new KeyboardEvent('keydown',{code:'Space',bubbles:true,composed:true,cancelable:true});
  input.dispatchEvent(event);await el.updateComplete;
  expect(event.defaultPrevented).toBe(false);expect(Boolean(el.isSelected)).toBe(false);
 });
 it('preserves select-only activation and dismisses with Escape',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button>Choose view</al-toggle-button>`);
  await el.updateComplete;
  const control=el.shadowRoot!.querySelector<HTMLElement>('[role="button"]')!;
  control.click();await el.updateComplete;
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true,composed:true}));
  await el.updateComplete;expect(el.isSelected).toBe(true);
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true,composed:true}));
  await el.updateComplete;expect(el.isSelected).toBe(false);expect(el.shadowRoot!.activeElement).toBe(control);
 });
 it('ignores held-key repeats and dismisses an active control on an outside click',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button hasToggle>Toggle</al-toggle-button>`);
  await el.updateComplete;
  const control=el.shadowRoot!.querySelector<HTMLElement>('[role="button"]')!;
  control.click();await el.updateComplete;
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',repeat:true,bubbles:true,composed:true}));
  await el.updateComplete;expect(el.isSelected).toBe(true);
  document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,composed:true}));
  await el.updateComplete;expect(el.isSelected).toBe(false);
 });
 it('opens and dismisses its slotted popover from the keyboard',async()=>{
  const el=await fixture<ALToggleButton>(html`<al-toggle-button><al-popover><span slot="trigger">Details</span>Information</al-popover></al-toggle-button>`);
  await el.updateComplete;
  const control=el.shadowRoot!.querySelector<HTMLElement>('[role="button"]')!;
  const popover=el.querySelector('al-popover')!;
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true,composed:true}));
  await el.updateComplete;expect(popover.isActive).toBe(true);
  control.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true,composed:true}));
  await el.updateComplete;expect(popover.isActive).toBe(false);expect(el.isSelected).toBe(false);
 });
});
