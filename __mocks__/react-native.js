module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios !== undefined ? obj.ios : obj.default,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
  },
  useColorScheme: () => 'light',
};
