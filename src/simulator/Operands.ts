export {
    Operand, RegisterOperand, ImmediateOperand, ShifterOperand, BranchOperand, LoadStoreOperand, LoadImmediateOperand, LoadStoreMultipleOperand
}

class Operand { }

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
    toEncoding() { return this.rotateImmed.toString(2).padStart(4, "0") + this.immed8.toString(2).padStart(8, "0") }
}

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
    toString() { return this.operandToShift.toString() + ", " + this.shiftType + " " + this.shiftAmountOperand.toString(); }
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

class BranchOperand extends Operand {
    private label: string;

    constructor(label: string) {
        super();
        this.label = label;
    }

    getLabel() { return this.label };
    toString() { return this.label };
}

class LoadStoreOperand extends Operand {
    private register: RegisterOperand;
    private offset: RegisterOperand | ImmediateOperand | ShifterOperand | undefined;
    private negativeRegOffset: boolean;
    private increment: boolean;
    private preIndexed: boolean;

    constructor(register: RegisterOperand, offset: RegisterOperand | ImmediateOperand | ShifterOperand | undefined, negativeRegOffset: boolean, increment: boolean, preIndexed: boolean) {
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

const ShiftTypeEncoding = new Map([
    ["lsl", "00"],
    ["asl", "00"],
    ["lsr", "01"],
    ["asr", "10"],
    ["ror", "11"]
]);