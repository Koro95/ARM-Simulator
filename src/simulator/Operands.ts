/*
    File that defines all different operands needed for instructions.
*/

export {
    Operand, RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand,
    LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand
}

/*
    Common parent class for functions that take any
    operand as input.
*/
class Operand { }

/*
    Class for register operands r0-r15, sp, lr or pc.

    index: number
        Index of the register
*/
class RegisterOperand extends Operand {
    private index: number;

    constructor(index: number) {
        super();
        this.index = index;
    }

    getIndex() { return this.index; }

    toString() {
        if (this.index < 13) {
            return "r" + this.index;
        }
        switch (this.index) {
            case 13: return "sp";
            case 14: return "lr";
            case 15: return "pc";
        }
    }

    toEncoding() {
        return this.index.toString(2).padStart(4, "0");
    }
}

/*
    Class for immediate operands with shift.

    immed8: number
        8 bit immediate
    rotateImmed: number
        Shift by a factor of 2 from the
        barrel shifter
    base: number
        Base for the output of the number
        (Hex, Okt, Bin or Dez)
*/
class ImmediateOperand extends Operand {
    private immed8: number;
    private rotateImmed: number;
    private base: number;

    constructor(immed8: number, rotateImmed: number, base: number) {
        super();
        this.immed8 = immed8;
        this.rotateImmed = rotateImmed;
        this.base = base;
    }

    getValue() {
        return ((this.immed8 >>> this.rotateImmed * 2) | (this.immed8 << (32 - this.rotateImmed * 2)));
    }

    toString() {
        let numberString = "#"
        switch (this.base) {
            case 16: numberString += "0x"; break;
            case 8: numberString += "0o"; break;
            case 2: numberString += "0b"; break;
        }
        return numberString + this.getValue().toString(this.base);
    }

    toEncoding() {
        return this.rotateImmed.toString(2).padStart(4, "0") + this.immed8.toString(2).padStart(8, "0")
    }
}

/*
    Class for shifter operands that consist of the operand to
    shift (register or immediate), the shift type (lsl, lsr, ...)
    and the shift amount (register or immediate).

    operandToShift: Operand
        Operand that is shifter
    shiftType: string
        Type of shift the barrel shifter should perform
    shiftAmountOperand: Operand
        Operand with the amount the first operand is
        shifted
*/
class ShifterOperand extends Operand {
    private operandToShift: Operand;
    private shiftType: string;
    private shiftAmountOperand: Operand;

    constructor(operandToShift: Operand, shiftType: string, shiftAmountOperand: Operand) {
        super();
        this.operandToShift = operandToShift;
        this.shiftType = shiftType;
        this.shiftAmountOperand = shiftAmountOperand;
    }

    getOperandToShift() { return this.operandToShift; }
    getShiftType() { return this.shiftType; }
    getShiftAmountOperand() { return this.shiftAmountOperand; }

    toString() {
        return this.operandToShift.toString() + ", " + this.shiftType + " " + this.shiftAmountOperand.toString();
    }

    toEncoding() {
        let string = "";

        if (this.shiftAmountOperand instanceof ImmediateOperand) {
            string += this.shiftAmountOperand.toEncoding().substring(7)
            string += ShiftTypeEncoding.get(this.shiftType);
            string += "0";
        }
        else if (this.shiftAmountOperand instanceof RegisterOperand) {
            string += this.shiftAmountOperand.toEncoding();
            string += "0" + ShiftTypeEncoding.get(this.shiftType) + "1";
        }

        if (this.operandToShift instanceof RegisterOperand) {
            string += this.operandToShift.toEncoding();
        }

        return string;
    }
}

/*
    Class for the operands of branching operations.

    label: string
        Label of the address for the branch operation
*/
class BranchOperand extends Operand {
    private label: string;

    constructor(label: string) {
        super();
        this.label = label;
    }

    getLabel() { return this.label };

    toString() { return this.label };
}

/*
    Class for the operand of load and store operations (LDR, STR,
    LDRB, STRB, LDRH, LDRSB, LDRSH).
    
    Consist of a register and the offset. Also has further boolean
    values to determine the increment direction, if the basis register
    is auto-incremented and if the operand is pre- or postindexed.

    register: RegisterOperand
        Operand with the address for the load/store operation
    offset: RegisterOperand | ImmediateOperand | ShifterOperand | undefined;
        Possible offset of the address
    negativeRegOffset: boolean
        True, if the offset is in the negative direction.
    increment: boolean
        True, if the basis register should be incremented
        after loading/storing.
    preIndexed: boolean
        True, if the offset is preindexed. False, if the
        offset is postindexed.
*/
class LoadStoreOperand extends Operand {
    private register: RegisterOperand;
    private offset: RegisterOperand | ImmediateOperand | ShifterOperand | undefined;
    private negativeRegOffset: boolean;
    private increment: boolean;
    private preIndexed: boolean;

    constructor(register: RegisterOperand, offset: RegisterOperand | ImmediateOperand | ShifterOperand | undefined,
        negativeRegOffset: boolean, increment: boolean, preIndexed: boolean) {
        super();
        this.register = register;
        this.offset = offset;
        this.negativeRegOffset = negativeRegOffset;
        this.increment = increment;
        this.preIndexed = preIndexed;
    }

    getRegister() { return this.register };
    getOffset() { return this.offset };
    getNegativeRegOffset() { return this.negativeRegOffset };
    getIncrement() { return this.increment };
    getPreIndexed() { return this.preIndexed };

    toString() {
        let string = "[" + this.register.toString();
        if (this.preIndexed) {
            if (typeof this.offset !== 'undefined') {
                string += ", ";
                if (this.negativeRegOffset) { string += "-" };
                string += this.offset.toString()
            }
            string += "]";
            if (this.increment) { string += "!" };
        }
        else {
            string += "]";
            if (typeof this.offset !== 'undefined') {
                string += ", "
                if (this.negativeRegOffset) { string += "-" };
                string += this.offset.toString();
            }
        }
        return string;
    }
}

/*
    Class for the operand of load operations for any number and
    the address of a label.

    immediate: number | BranchOperand
        Number to be loaded with a "LDR rX, =" operation
    base: number | undefined
        Base for the output of the number
        (Hex, Okt, Bin or Dez)
*/
class LoadImmediateOperand extends Operand {
    private immediate: number | BranchOperand;
    private base: number | undefined;

    constructor(immediate: number | BranchOperand, base: number | undefined) {
        super();
        this.immediate = immediate;
        this.base = base;
    }

    getImmediate() { return this.immediate };
    getBase() { return this.base };

    toString() {
        let string = "=";
        if (this.immediate instanceof BranchOperand) {
            string += this.immediate.toString()
        }
        else {
            switch (this.base) {
                case 16: string += "0x"; break;
                case 8: string += "0o"; break;
                case 2: string += "0b"; break;
            }
            string += this.immediate.toString(this.base);
        }

        return string;
    }
}

/*
    Class for the operand of load and store  multiple operations (LDM,
    STM).
    
    Has a list of the registers to be loaded/stored. Filters the list to
    remove duplicates and sorts them by index.

    registers: RegisterOperand[]
        Array of registers to be saved. Should be filtered and in
        order for the encoding, but is filtered and ordered again
        in the construction if missed beforehand.
*/
class LoadStoreMultipleOperand extends Operand {
    private registers: RegisterOperand[];

    constructor(registers: RegisterOperand[]) {
        super();
        registers = registers.filter((value, index, array) => { return array.indexOf(value) === index })
        this.registers = registers.sort((a, b) => a.getIndex() - b.getIndex());
    }

    getRegisters() { return this.registers };

    toString(): string {
        let string = "{";
        this.registers.forEach((reg) => {
            string += reg.toString() + ", "
        })
        string = string.slice(0, -2) + "}";
        return string;
    }

    toEncoding() {
        let encoding = "";
        let indices = this.registers.map(reg => reg.getIndex());

        for (let index = 15; index >= 0; index--) {
            if (indices.includes(index)) {
                encoding += "1";
            }
            else {
                encoding += "0";
            }
        }
        return encoding;
    }
}

// Encoding for the shift type
// ARM Reference Manual (Issue I - 2005), Section A5.1 Addressing Mode 1 - Data-processing operands
const ShiftTypeEncoding = new Map([
    ["lsl", "00"],
    ["asl", "00"],
    ["lsr", "01"],
    ["asr", "10"],
    ["ror", "11"]
]);