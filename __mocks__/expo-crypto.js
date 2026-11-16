module.exports = {
  CryptoDigestAlgorithm: {
    MD5: 'MD5',
    SHA256: 'SHA-256',
  },
  digestStringAsync: jest.fn(async (algo, str) => 'mock_md5_hash_32chars_long_12345'),
};
