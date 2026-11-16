module.exports = {
  makeRedirectUri: jest.fn(() => 'drivephotos://oauthredirect'),
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
  revokeAsync: jest.fn(),
};
