module.exports = {
  cacheDirectory: 'file:///mock_cache/',
  documentDirectory: 'file:///mock_docs/',
  UploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
  FileSystemUploadType: {
    BINARY_CONTENT: 0,
    MULTIPART: 1,
  },
  getInfoAsync: jest.fn(async (uri) => ({ exists: true, size: 1024, modificationTime: Date.now() })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => {}),
  downloadAsync: jest.fn(async (url, uri) => ({ status: 200, uri })),
  uploadAsync: jest.fn(async (url, uri) => ({ status: 200, body: JSON.stringify({ id: 'uploaded_id' }) })),
};
