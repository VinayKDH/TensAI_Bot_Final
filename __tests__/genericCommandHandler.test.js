const { GenericCommandHandler } = require('../src/genericCommandHandler');
const feedbackStore = require('../src/internal/feedbackStore');

jest.mock('../src/internal/feedbackStore');

describe('GenericCommandHandler', () => {
  let handler;
  beforeEach(() => {
    handler = new GenericCommandHandler();
    jest.clearAllMocks();
  });

  test('returns menu card for hi', async () => {
    const context = { activity: { text: 'hi', value: null } };
    const res = await handler.handleCommandReceived(context, {});
    expect(res).toBeDefined();
  // Expect a single activity message with text and attachments
  expect(res).toHaveProperty('attachments');
  expect(res.text).toContain('Hi I am TensAI Chatbot. Please select the option.');
  });

  test('records feedback when submit', async () => {
    feedbackStore.recordFeedback.mockResolvedValue({ id: '12345', ts: new Date().toISOString() });
    const context = { activity: { text: '', value: { __feedback: { type: 'up', module: 'WebGPT' } }, from: { id: 'user1' } } };
    const res = await handler.handleCommandReceived(context, {});
    expect(feedbackStore.recordFeedback).toHaveBeenCalledWith({ userId: 'user1', type: 'up', context: { type: 'up', module: 'WebGPT' } });
    expect(res).toBeDefined();
    expect(res).toHaveProperty('attachments');
    expect(res.text).toContain('Thank you for the positive feedback!');
  });
});
