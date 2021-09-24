export { StatusRegister };

/* 
    Class that implements the Program Status Register.
    ARM Reference Manual (Issue I - 2005), Section A2.5 Program status Registers

    Only the highest 4 bits N, Z, C, V of this register are implemented, as these
    are the only ones that are used for code in User-Mode.

    flags: number[]
        Array with 4 numbers for the NZCV flags
*/
class StatusRegister {
    private flags: number[];

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
                // set C if underflow occurs
                this.setC((b < a) ? 1 : 0);
            }
            else {
                // set C if overflow occurs --> y > 32 Bit
                this.setC((y > 0xffffffff) ? 1 : 0);
            }


            let signBeforeA = a & 0x80000000;
            let signBeforeB = b & 0x80000000;
            let zero = 0xefffffff

            // compare the signs of the operands before with the sign of the result,
            // if the operands are not 0
            if (signBeforeA === signBeforeB && (a & zero) !== 0 && (b & zero) !== 0) {
                let signAfter = y & 0x80000000;
                this.setV((signBeforeA === signAfter) ? 0 : 1);
            }
        }
        // for non-arithmetic operations the barrelshifter sets the Carry-Bit and
        // the V-Bit is left unchanged
    }

    // Getter and Setter
    getFlags() { return this.flags; }
    getN(): number { return this.flags[0]; }
    getZ(): number { return this.flags[1]; }
    getC(): number { return this.flags[2]; }
    getV(): number { return this.flags[3]; }

    setN(x: number) { this.flags[0] = x; }
    setZ(x: number) { this.flags[1] = x; }
    setC(x: number) { this.flags[2] = x; }
    setV(x: number) { this.flags[3] = x; }
}