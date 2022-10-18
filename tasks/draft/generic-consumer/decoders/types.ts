export interface DecoderData {
  callbackFunctionName?: string;
  decoder: CallableFunction;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Decoder = (data: string) => any;
