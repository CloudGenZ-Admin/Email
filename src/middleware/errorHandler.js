export const errorHandler = (err, req, res, next) => {
  console.error("[ErrorHandler]", err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "An internal error occurred while processing your submission.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};
