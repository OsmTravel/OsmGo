import { FilterByNamePipe } from './filter-by-name.pipe';

describe('FilterByNamePipe', () => {
  it('create an instance', () => {
    const pipe = new FilterByNamePipe();
    expect(pipe).toBeTruthy();
  });
});
