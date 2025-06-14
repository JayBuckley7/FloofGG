import { render, screen } from '@testing-library/react';
import { BoardMembers } from './BoardMembers';
import * as convex from 'convex/react';

jest.mock('convex/react');

const mockedUseQuery = convex.useQuery as jest.Mock;
const mockedUseMutation = convex.useMutation as jest.Mock;

function setup(owner: boolean) {
  mockedUseQuery.mockImplementation((fn: any, args?: any) => {
    if (fn === undefined) return null;
    if (fn._name === 'auth.loggedInUser') return { _id: owner ? 'owner' : 'collab' };
    if (fn._name === 'boards.listMembers') return [ { userId: 'collab', role: 'editor' } ];
    return null;
  });
  mockedUseMutation.mockReturnValue(() => Promise.resolve());
  render(<BoardMembers boardId={'b1' as any} ownerId={'owner' as any} />);
}

test('shows leave button for collaborator', () => {
  setup(false);
  expect(screen.getByText(/Leave board/)).toBeInTheDocument();
});

test('shows remove buttons for owner', () => {
  setup(true);
  expect(screen.getByText(/Remove/)).toBeInTheDocument();
});
