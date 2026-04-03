// utils/dbError.js
export const handleDbError = (err) => {
  // Duplicate key (E11000) — unique index violation
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const value = err.keyValue?.[field];
    return {
      status: 409,
      message: `'${value}' is already taken for field: ${field}`,
    };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return {
      status: 400,
      message: messages.join(". "),
    };
  }

  // Mongoose CastError (bad ObjectId etc.)
  if (err.name === "CastError") {
    return {
      status: 400,
      message: `Invalid value for field: ${err.path}`,
    };
  }

  // Fallback
  return {
    status: 500,
    message: "Internal server error",
  };
};