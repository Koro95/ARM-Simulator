export { StatusRegister };

class StatusRegister {
    flags: number[];

    constructor() {
        this.flags = [0, 0, 0, 0]
    }

    // Rules for updating the flags:
    // ARM Reference Manual (Issue I - 2005), Section A2.5.2 The condition code flags
    updateFlags(isArithmetic: boolean, y: number, a: number, b: number) {
        this.setN(((y & 0x80000000) === 0) ? 0 : 1);
        this.setZ(((y & 0xffffffff) === 0) ? 1 : 0);

        // C and V update for arithmetic operations that are not a multiplication
        if (isArithmetic) {
            this.setC((y > 0xffffffff) ? 1 : 0);

            let signBeforeA = a & 0x80000000;
            let signBeforeB = b & 0x80000000;
            if (signBeforeA === signBeforeB && this.getZ() !== 1) {
                let signAfter = y & 0x80000000;
                this.setV((signBeforeA === signAfter) ? 0 : 1);
            }
        }
        // C and V updates for logical operations, V left unchanged
        else {
            // this.setC() - TODO: shift operand, no overflow change
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