export { Instruction, RegisterOperand, ImmediateOperand, ShiftOperand }

class Instruction {
    private instruction: string;
    private type: string;
    private op1: RegisterOperand | undefined;
    private op2: RegisterOperand | ImmediateOperand | ShiftOperand | undefined;
    private op3: RegisterOperand | ImmediateOperand | ShiftOperand | undefined;
    private op4: RegisterOperand | ImmediateOperand | ShiftOperand | undefined;
    private updateStatusRegisters: boolean;

    constructor(instruction: string, type: string,
        op1: RegisterOperand | undefined,
        op2: RegisterOperand | ImmediateOperand | ShiftOperand | undefined,
        op3: RegisterOperand | ImmediateOperand | ShiftOperand | undefined,
        op4: RegisterOperand | ImmediateOperand | ShiftOperand | undefined,
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

class RegisterOperand {
    private index: number;

    constructor(index: number) {
        this.index = index;
    }

    getIndex() { return this.index; }
}

class ImmediateOperand {
    private value: number;

    constructor(value: number) {
        this.value = value;
    }

    getValue() { return this.value; }
}

class ShiftOperand {
    private operandToShift: RegisterOperand | ImmediateOperand;
    private shiftType: string;
    private shiftAmountOperand: RegisterOperand | ImmediateOperand;

    constructor(operandToShift: RegisterOperand | ImmediateOperand, shiftType: string, shiftAmountOperand: RegisterOperand | ImmediateOperand) {
        this.operandToShift = operandToShift;
        this.shiftType = shiftType;
        this.shiftAmountOperand = shiftAmountOperand;
    }

    getOperandToShift() { return this.operandToShift; }
    getShiftType() { return this.shiftType; }
    getShiftAmountOperand() { return this.shiftAmountOperand; }
}