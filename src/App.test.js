import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

// ESM react-router-dom için manuel mock'u kullan
jest.mock('react-router-dom');

test('renders App without crashing', () => {
  const { container } = render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  expect(container).toBeTruthy();
});
