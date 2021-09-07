export { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, LoadStoreInstruction,
    Operand, RegisterOperand, ImmediateOperand, ShiftOperand, BranchOperand, LoadStoreOperand }

class Instruction {
    private instruction: string;
    private condition: string;
    private updateStatusRegister: boolean;

    constructor(instruction: string,
        condition: string,
        updateStatusRegister: boolean) {
        this.instruction = instruction;
        this.condition = condition;
        this.updateStatusRegister = updateStatusRegister;
    }

    getInstruction() { return this.instruction; }
    getCondition() { return this.condition; }
    getUpdateStatusRegister() { return this.updateStatusRegister; }

    toString() {
        let string = this.instruction + this.condition;
        if (!["cmp", "cmn", "tst", "teq"].includes(this.instruction)) { string += this.updateStatusRegister ? "s" : ""; }
        return string;
    }
}

class ArithmeticInstruction extends Instruction {
    private op1: Operand | undefined;
    private op2: Operand | undefined;
    private op3: Operand | undefined;
    private op4: Operand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: Operand | undefined,
        op2: Operand | undefined,
        op3: Operand | undefined,
        op4: Operand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
        this.op4 = op4;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }
    getOp4() { return this.op4; }

    toString() {
        let string = super.toString();
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString() };
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString() };
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString() };
        if (typeof this.op4 !== 'undefined') { string += ", " + this.op4.toString() };

        return string;
    }
}

class LogicInstruction extends Instruction {
    private op1: Operand | undefined;
    private op2: Operand | undefined;
    private op3: Operand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: Operand | undefined,
        op2: Operand | undefined,
        op3: Operand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }

    toString() {
        let string = super.toString();
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString() };
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString() };
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString() };

        return string;
    }
}

class CopyJumpInstruction extends Instruction {
    private op1: Operand | undefined;
    private op2: Operand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: Operand | undefined,
        op2: Operand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
    }

    getOp1() { return this.op1; }
    getOp2() { return this.op2; }

    toString() {
        let string = super.toString();
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString() };
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString() };

        return string;
    }
}

class LoadStoreInstruction extends Instruction {
    private op1: Operand | undefined;
    private op2: Operand | undefined;

    constructor(instruction: string,
        condition: string,
        op1: Operand | undefined,
        op2: Operand | undefined,
        updateStatusRegister: boolean) {
        super(instruction, condition, updateStatusRegister);
        this.op1 = op1;
        this.op2 = op2;
    }
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

    getValue() { return ((this.immed8 >>> this.rotateImmed * 2) | (this.immed8 << (32 - this.rotateImmed * 2))) >>> 0 }
    toString() {
        let numberString = "#"
        switch (this.base) {
            case 16: numberString += "0x"; break;
            case 2: numberString += "0b"; break;
        }
        return numberString + this.getValue().toString(this.base);
    }
    toEncoding() { return this.rotateImmed.toString(2).padStart(4, "0") + this.immed8.toString(2).padStart(8, "0") }
}

class ShiftOperand extends Operand {
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

    toString() { return this.label };
}

class LoadStoreOperand extends Operand {
    private register: RegisterOperand;
    private offset: RegisterOperand | ImmediateOperand | ShiftOperand;
    private postIndexed: boolean;

    constructor(register: RegisterOperand, offset: RegisterOperand | ImmediateOperand | ShiftOperand, postIndexed: boolean) {
        super();
        this.register = register;
        this.offset = offset;
        this.postIndexed = postIndexed;
    }
}

const ShiftTypeEncoding = new Map([
    ["lsl", "00"],
    ["asl", "00"],
    ["lsr", "01"],
    ["asr", "10"],
    ["ror", "11"]
]);