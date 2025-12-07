export class CustomError extends Error {
    code: string;
    constructor(message: string, code: string = 'UNKNOWN_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
    }
}
