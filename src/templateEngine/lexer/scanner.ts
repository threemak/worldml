class ScannerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScannerError";
    }
    static invalidSource(): ScannerError {
        return new ScannerError("Source cannot be null or undefined");
    }
    static EOF(): ScannerError {
        return new ScannerError("Unexpected end of file");
    }
    static invalidRewind(position: number): ScannerError {
        return new ScannerError(`Invalid rewind position: ${position}`);
    }
}

// Scanner class for character level operation
export class Scanner {
    private cursor: number;
    private readonly source: string;

    private markers: number[] = [];
    constructor(source: string) {
        if (source === null || source === undefined) {
            throw ScannerError.invalidSource();
        }
        this.source = source;
        this.cursor = 0;
    }
    /**
     * Check if there are more char to be read
     */
    hasNext(): boolean {
        return this.cursor < this.source.length;
    }
    /**
     * Return the next character and advanced the cursor
     */
    next(): string {
        if (!this.hasNext()) {
            throw ScannerError.EOF();
        }
        const char = this.source[this.cursor++];
        return char;
    }
    /**
     * Look at the  current character without advancing the cursor
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
    peekNext(offset: number = 1): string {
        if (!this.hasNext()) {
            throw ScannerError.EOF();
        }
        const position = this.cursor + offset;
        if (position >= this.source.length) {
            throw ScannerError.EOF();
        }
        return this.source[position];
    }
    /**
     * Rewind the cursor back to the specfic number of position
     */
    rewind(n: number = 1): string {
        if (!Number.isInteger(n) || n < 0) {
            throw ScannerError.invalidRewind(n);
        }

        const newPosition = this.cursor - n;
        if (newPosition < 0) {
            throw ScannerError.invalidRewind(newPosition);
        }

        this.cursor = newPosition;
        return this.source[this.cursor];
    }
    /*
     * Get the current cursor position
     */
    getCursor() {
        return this.cursor;
    }

    /**
     * Check if the next character matches the expected character
     */
    match(expected: string): boolean {
        if (!this.hasNext()) return false;
        if (this.source[this.cursor] !== expected) return false;

        this.cursor++;
        return true;
    }

    /**
     * Get the remaining unprocessed source
     */
    getRemainingSource(): string {
        return this.source.slice(this.cursor);
    }
    getLength(): number {
        return this.source.length;
    }

    getSourceSegment(start: number, end: number): string {
        return this.source.slice(start, end);
    }

    getCurrentSource(): string {
        return this.source.slice(this.cursor);
    }
    mark(): void {
        this.markers.push(this.cursor);
    }

    reset(): void {
        const marker = this.markers.pop();
        if (marker !== undefined) {
            this.cursor = marker;
        }
    }
}
