export type FieldError = {
  field: string;
  messages: string[];
};

export type ErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
  path: string;
  timestamp: string;
};
