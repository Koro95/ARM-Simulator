export { Instruction, Operand, RegisterOperand, ImmediateOperand, ShiftOperand }

class Instruction {
    private instruction: string;
    private type: string;
    private op1: Operand | undefined;
    private op2: Operand | undefined;
    private op3: Operand | undefined;
    private op4: Operand | undefined;
    private updateStatusRegisters: boolean;

    constructor(instruction: string, type: string,
        op1: Operand | undefined,
        op2: Operand | undefined,
        op3: Operand | undefined,
        op4: Operand | undefined,
        updateStatusRegister: boolean) {
        this.instruction = instruction;
        this.type = type;
        this.op1 = op1;
        this.op2 = op2;
        this.op3 = op3;
        this.op4 = op4;
        this.updateStatusRegisters = updateStatusRegister;
    }

    getInstruction() { return this.instruction; }
    getType() { return this.type; }
    getOp1() { return this.op1; }
    getOp2() { return this.op2; }
    getOp3() { return this.op3; }
    getOp4() { return this.op4; }
    getUpdateStatusRegister() { return this.updateStatusRegisters; }
}

class Operand {

}

class RegisterOperand extends Operand {
    private index: number;

    constructor(index: number) {
        super();
        this.index = index;
    }

    getIndex() { return this.index; }
    toString() { return "r" + this.index; }
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