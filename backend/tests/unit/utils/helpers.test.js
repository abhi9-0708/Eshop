const { ApiResponse, asyncHandler } = require('../../../src/utils/helpers');

describe('Helpers', () => {
  describe('ApiResponse', () => {
    it('should create a success response', () => {
      const res = ApiResponse.success({ name: 'test' }, 'Success message');
      expect(res).toEqual({
        success: true,
        message: 'Success message',
        data: { name: 'test' }
      });
    });

    it('should create a success response with default message', () => {
      const res = ApiResponse.success({ name: 'test' });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ name: 'test' });
    });

    it('should create an error response', () => {
      const res = ApiResponse.error('Something went wrong');
      expect(res).toEqual({
        success: false,
        message: 'Something went wrong'
      });
    });

    it('should create an error response with errors array', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const res = ApiResponse.error('Validation failed', errors);
      expect(res.success).toBe(false);
      expect(res.errors).toEqual(errors);
    });
  });

  describe('asyncHandler', () => {
    it('should call the function and pass result', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const handler = asyncHandler(mockFn);
      const req = {}, res = {}, next = jest.fn();

      await handler(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const handler = asyncHandler(mockFn);
      const req = {}, res = {}, next = jest.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
