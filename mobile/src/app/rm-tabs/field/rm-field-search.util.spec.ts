import { countRmFieldItems, filterRmFieldGroups, RmFieldGroup } from './rm-field-search.util';

interface Row {
  name: string;
  phone?: string;
}

describe('filterRmFieldGroups', () => {
  const groups: RmFieldGroup<Row>[] = [
    {
      commercial: 'Awa',
      quarters: [
        {
          quarter: 'Akpakpa',
          items: [
            { name: 'Éric Koffi', phone: '97 00 11 22' },
            { name: 'Mina Doe', phone: '96 11 22 33' }
          ]
        },
        {
          quarter: 'Cotonou',
          items: [{ name: 'Paul Ade', phone: '95 00 00 00' }]
        }
      ]
    },
    {
      commercial: 'Boris',
      quarters: [
        {
          quarter: 'Calavi',
          items: [{ name: 'Awa Junior', phone: '90 00 00 01' }]
        }
      ]
    }
  ];

  const text = (row: Row) => `${row.name} ${row.phone || ''}`;

  it('returns every row when the query is empty', () => {
    expect(filterRmFieldGroups(groups, '   ', text)).toBe(groups);
  });

  it('matches names without accents and drops empty groups', () => {
    const result = filterRmFieldGroups(groups, 'eric', text);
    expect(result.length).toBe(1);
    expect(result[0].commercial).toBe('Awa');
    expect(result[0].quarters.length).toBe(1);
    expect(result[0].quarters[0].quarter).toBe('Akpakpa');
    expect(result[0].quarters[0].items.map(item => item.name)).toEqual(['Éric Koffi']);
  });

  it('matches a phone number even when spaces differ', () => {
    const result = filterRmFieldGroups(groups, '970011', text);
    expect(result[0].quarters[0].items.map(item => item.name)).toEqual(['Éric Koffi']);
  });

  it('counts every listed client, including after a filter', () => {
    expect(countRmFieldItems(groups)).toBe(4);
    expect(countRmFieldItems(filterRmFieldGroups(groups, 'eric', text))).toBe(1);
  });

  it('keeps a whole commercial block when the commercial name matches', () => {
    const result = filterRmFieldGroups(groups, 'boris', text);
    expect(result.length).toBe(1);
    expect(result[0].quarters[0].items.map(item => item.name)).toEqual(['Awa Junior']);
  });
});
