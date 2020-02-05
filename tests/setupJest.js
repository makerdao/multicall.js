import fetch from 'jest-fetch-mock';

global.fetch = fetch;
jest.setMock('cross-fetch', fetch);
