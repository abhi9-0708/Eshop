const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // SQLite constraint errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    statusCode = 400;
    message = 'A record with this value already exists';
  }

  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  if (err.message && err.message.includes('NOT NULL constraint failed')) {
    statusCode = 400;
    message = 'Required field is missing';
  }

  if (err.message && err.message.includes('CHECK constraint failed')) {
    statusCode = 400;
    message = 'Invalid value provided';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = { notFound, errorHandler };
