declare module "fit-file-parser" {
  interface FitParserOptions {
    force?: boolean;
    speedUnit?: string;
    lengthUnit?: string;
    temperatureUnit?: string;
    elapsedRecordField?: boolean;
    mode?: "list" | "cascade" | "both";
  }
  export default class FitParser {
    constructor(options?: FitParserOptions);
    parse(content: ArrayBuffer | Buffer, callback: (error: unknown, data: any) => void): void;
  }
}
