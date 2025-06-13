/**
 * Example illustrating card order after a move.
 */

interface Card { id: string; pos: number; lane: string }

const laneA: Card[] = [
  { id: '1', pos: 0, lane: 'A' },
  { id: '2', pos: 1, lane: 'A' },
  { id: '3', pos: 2, lane: 'A' },
];
const laneB: Card[] = [{ id: '4', pos: 0, lane: 'B' }];

// Move card 2 from laneA to laneB at position 1
laneA.splice(1, 1); // remove card 2
laneA.forEach((c, i) => (c.pos = i));

laneB.splice(1, 0, { id: '2', pos: 0, lane: 'B' });
laneB.forEach((c, i) => (c.pos = i));

console.log('laneA', laneA);
console.log('laneB', laneB);
// Output:
// laneA [ { id: '1', pos: 0, lane: 'A' }, { id: '3', pos: 1, lane: 'A' } ]
// laneB [ { id: '4', pos: 0, lane: 'B' }, { id: '2', pos: 1, lane: 'B' } ]
