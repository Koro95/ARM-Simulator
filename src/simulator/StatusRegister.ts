export { StatusRegister };

class StatusRegister {
    flags: number[];

    constructor() {
        this.flags = [0, 0, 0, 0]
    }

    // Rules for updating the flags:
    // ARM Reference Manual (Issue I - 2005), Section A2.5.2 The condition code flags
    updateFlags(y: number, a: number, b: number, isSubtraction: boolean, isArithmetic: boolean) {
        this.setN(((y & 0x80000000) === 0) ? 0 : 1);
        this.setZ(((y & 0xffffffff) === 0) ? 1 : 0);

        // C and V update for arithmetic operations that are not a multiplication
        if (isArithmetic) {
            if (isSubtraction) {
                this.setC((b < a) ? 1 : 0);
            }
            else {
                this.setC((y > 0xffffffff) ? 1 : 0);
            }

            let signBeforeA = a & 0x80000000;
            let signBeforeB = b & 0x80000000;
            let zero = 0xefffffff
            if (signBeforeA === signBeforeB && (a & zero) !== 0 && (b & zero) !== 0) {
                let signAfter = y & 0x80000000;
                this.setV((signBeforeA === signAfter) ? 0 : 1);
            }
        }
    }

    getFlags() {
        return this.flags;
    }

    setN(x: number) {
        this.flags[0] = x;
    }
    getN(): number {
        return this.flags[0];
    }

    setZ(x: number) {
        this.flags[1] = x;
    }
    getZ(): number {
        return this.flags[1];
    }

    setC(x: number) {
        this.flags[2] = x;
    }
    getC(): number {
        return this.flags[2];
    }

    setV(x: number) {
        this.flags[3] = x;
    }
    getV(): number {
        return this.flags[3];
    }
}