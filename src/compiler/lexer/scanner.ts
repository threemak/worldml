class ScannerError extends Error {
    constructor(message: string, errorType?: string) {
        super(message);
        this.name = errorType!;
    }
    static invalidSource(): ScannerError {
        return new ScannerError(
            "Source cannot be null or undefined",
            "Invalid_Source",
        );
    }
    static EOF(): ScannerError {
        return new ScannerError(
            "Attempted to read past end of file",
            "EndOfFileError",
        );
    }
}

// Scanner class for character level operation
export class Scanner {
    private cursor: number = 0;
    private readonly source: string;
    constructor(source: string) {
        if (source === null || source === undefined) {
            throw ScannerError.invalidSource();
        }
        this.source = source;
    }
    /**
     * Check if there are more char to be read
     */
    hasNext(): boolean {
        return this.cursor < this.source.length;
    }
    /**
     * Return the next character
     */
    next(): string {
        if (!this.hasNext()) {
            throw ScannerError.EOF();
        }
        return this.source[this.cursor++];
    }
    /**
     * Get current character without advancing the cursor
     */
    peek(): string {
        if (!this.hasNext()) {
            throw ScannerError.EOF();
        }
        return this.source[this.cursor];
    }
    /*
     *  Get the next character without advancing the cursor
     */
    peekNext(): string {
        if (!this.hasNext()) {
            throw ScannerError.EOF();
        }
        if (this.cursor + 1 < this.source.length) {
            return this.source[this.cursor + 1];
        } else {
            throw ScannerError.EOF();
        }
    }
    /**
     * Rewind the cursor back to the specfic number of position
     */
    rewind(n: number = 1) {
        if (n < 0) {
            throw new ScannerError("Rewind amount must be positive");
        }

        const newPosition = this.cursor - n;
        if (newPosition < 0) {
            throw new ScannerError("Cannot rewind past the start of file");
        }

        this.cursor = newPosition;
    }
}
