class ApiResponse {
  static success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
  }

  static error(res, message, statusCode = 500) {
    return res.status(statusCode).json({ success: false, error: message });
  }

  static paginated(res, data, pagination) {
    return res.json({ success: true, data, pagination });
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiResponse, asyncHandler };
