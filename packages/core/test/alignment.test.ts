import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TextColumn,
  TextEntry,
  TextInput,
  alignmentTextClass,
  resolveAlignmentClass,
} from '../src/index.js';

describe('alignment helpers', () => {
  it('maps Filament alignments to text classes', () => {
    assert.equal(alignmentTextClass('start'), 'text-left');
    assert.equal(alignmentTextClass('left'), 'text-left');
    assert.equal(alignmentTextClass('center'), 'text-center');
    assert.equal(alignmentTextClass('end'), 'text-right');
    assert.equal(alignmentTextClass('right'), 'text-right');
    assert.equal(alignmentTextClass('justify'), 'text-justify');
  });

  it('exposes align* helpers on columns, entries, and fields', () => {
    assert.equal(TextColumn.make('price').alignEnd().build().alignment, 'end');
    assert.equal(TextColumn.make('qty').alignRight().build().alignment, 'right');
    assert.equal(TextColumn.make('name').alignCenter().build().alignment, 'center');
    assert.equal(
      TextColumn.make('name').verticallyAlignStart().build().verticalAlignment,
      'start',
    );
    assert.equal(TextEntry.make('total').alignEnd().build().alignment, 'end');
    assert.equal(TextInput.make('amount').alignRight().build().alignment, 'right');
  });

  it('defaults currency columns to end alignment (not form/detail)', () => {
    assert.equal(TextColumn.make('price').currency('USD').build().alignment, 'end');
    assert.equal(TextEntry.make('price').currency('USD').build().alignment, undefined);
    assert.equal(TextInput.make('price').currency('USD').build().alignment, undefined);
  });

  it('combines horizontal and vertical classes', () => {
    assert.equal(
      resolveAlignmentClass({ alignment: 'end', verticalAlignment: 'start' }),
      'text-right align-top',
    );
  });
});
