import React from 'react';
import { render } from '@testing-library/react';
import { useMatchGame } from './matchGameService';

// Mocks for contexts
const onMock = jest.fn();
const offMock = jest.fn();
jest.mock('../context/SocketContext', () => ({
  useSocket: () => ({ socket: {}, on: onMock, off: offMock })
}));
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'u1' } })
}));

function Tester() {
  const { onStatePatch } = useMatchGame();
  React.useEffect(() => {
    const cleanup = onStatePatch(() => {});
    return () => cleanup();
  }, [onStatePatch]);
  return null;
}

describe('useMatchGame subscriptions', () => {
  beforeEach(() => { onMock.mockClear(); offMock.mockClear(); });
  it('subscribes and unsubscribes state_patch on mount/unmount', () => {
    const { unmount } = render(<Tester />);
    expect(onMock).toHaveBeenCalledWith('state_patch', expect.any(Function));
    unmount();
    expect(offMock).toHaveBeenCalledWith('state_patch', expect.any(Function));
  });
});
