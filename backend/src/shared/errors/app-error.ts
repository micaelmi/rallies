export type AppErrorDetails =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

type AppErrorInput = {
  code: string;
  messageKey: string;
  statusCode: number;
  details?: AppErrorDetails;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly messageKey: string;
  public readonly statusCode: number;
  public readonly details?: AppErrorDetails;

  public constructor(input: AppErrorInput) {
    super(input.code);
    this.name = "AppError";
    this.code = input.code;
    this.messageKey = input.messageKey;
    this.statusCode = input.statusCode;
    if (input.details !== undefined) {
      this.details = input.details;
    }
  }
}
