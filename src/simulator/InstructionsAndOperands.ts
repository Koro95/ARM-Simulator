export { Instruction, ArithmeticInstruction, LogicInstruction, CopyJumpInstruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand }

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

    toString() { return this.instruction + this.condition + (this.updateStatusRegister ? "S" : "") }
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
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString()};
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString()};
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString()};
        if (typeof this.op4 !== 'undefined') { string += ", " + this.op4.toString()};

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
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString()};
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString()};
        if (typeof this.op3 !== 'undefined') { string += ", " + this.op3.toString()};

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
        if (typeof this.op1 !== 'undefined') { string += " " + this.op1.toString()};
        if (typeof this.op2 !== 'undefined') { string += ", " + this.op2.toString()};

        return string;
    }
}

class Operand {}

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
}

class ImmediateOperand extends Operand {
    private value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }

    getValue() { return this.value; }
    toString() { return "#" + this.value; }
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
}