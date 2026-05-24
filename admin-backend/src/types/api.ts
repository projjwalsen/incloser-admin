export type ApiResponse<T> = {
  ok: true;
  message: string;
  data: T;
};

export type ApiError = {
  ok: false;
  message: string;
};
