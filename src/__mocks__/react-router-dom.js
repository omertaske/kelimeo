const React = require('react');

module.exports = {
  createBrowserRouter: jest.fn(() => ({})),
  RouterProvider: ({ router }) => React.createElement('div', { 'data-testid': 'router-provider' }),
  Navigate: ({ to }) => React.createElement('div', { 'data-testid': 'navigate' }),
};