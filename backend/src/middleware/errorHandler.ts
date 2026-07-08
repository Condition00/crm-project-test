import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = typeof (error as { statusCode?: number }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 500;
  const message = error instanceof Error ? error.message : "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};
