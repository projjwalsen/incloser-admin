export class AuthLoginError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthLoginError";
  }
}
