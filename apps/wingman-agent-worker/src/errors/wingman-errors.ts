export class InvalidWingmanPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWingmanPromptError';
  }
}

export class WingmanTurnExecutionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WingmanTurnExecutionError';
  }
}
